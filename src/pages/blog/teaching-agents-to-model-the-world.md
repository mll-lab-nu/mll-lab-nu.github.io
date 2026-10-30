---
title: "Teaching agents to model the world"
date: 2026-10-30
authors: MLL Lab
layout: ../../layouts/BlogPost.astro
keywords: ["agent world models", "world model reasoning", "VLM agents", "multi-turn reinforcement learning", "reasoning collapse", "view planning", "agentic robotics"]
description: "Why four of our recent projects, from reasoning collapse to robot exams, are parts of one question about whether agents keep track of the world they act in."
---

Several of our recent projects ask the same question from different directions: when an agent acts over many turns, does it actually keep track of the world it is acting in? Our current answer is "often not, and it is hard to tell from the outside." The reasoning an agent writes can look careful while having little to do with what the agent sees. Below we explain why we now treat the agent's model of the world as something to train and measure directly.

## The setting: acting in a world you only partly see

A multi-turn agent rarely sees the full state of its environment. A robot camera shows one view of a room. A puzzle rendered as an image hides the exact positions behind pixels. Each action changes the world, and the agent sees only part of the result. In VAGEN we made this explicit by "formulating the problem as a Partially Observable Markov Decision Process (POMDP)". Under this view, a good agent has to do two things at every turn. It has to form a belief about the current state, and it has to predict how its next action will change that state. Together, these two abilities are what we mean by a world model in this post.

Training these abilities only helps if the agent's reasoning depends on its input, so we start with how to check that.

## When reasoning stops depending on the input

[RAGEN-2](https://arxiv.org/abs/2604.06268) studies a failure we kept running into during agent RL training. After training for a while, a model can produce reasoning that looks varied and fluent, yet the same reasoning would fit almost any input. The paper describes models that "rely on fixed templates that look diverse but are input-agnostic" and calls this template collapse, a specific form of reasoning collapse.

Entropy is the usual metric for monitoring reasoning during RL training, but it does not catch this failure. The reason is that "entropy only measures diversity within the same input, and cannot tell whether reasoning actually responds to different inputs." RAGEN-2 therefore separates reasoning quality into two parts: diversity within one input, measured by entropy, and how well the reasoning distinguishes between inputs, measured by mutual information. Template collapse is the case where the first part stays high and the second part drops.

We estimate mutual information inside each training batch. The model scores every reasoning trace against every prompt in the batch. If a trace fits its own prompt much better than the other prompts, the reasoning depends on the input. This estimate reuses the training rollouts and needs "no additional model or inference pass". It also tracks task success better than entropy does. The best of these MI estimates reaches a Spearman correlation of +0.39 with task success across training runs, while the entropy metrics fall between -0.11 and -0.14. In training curves, "mutual information declines significantly before task performance degrades, while conditional entropy remains elevated throughout."

The paper also explains why collapse happens. When all sampled trajectories for a prompt receive similar rewards, the task gradient for that prompt is weak. The KL and entropy regularizers, however, push every reasoning chain in the same way regardless of its prompt. On such prompts, the regularizers dominate the update and "erase cross-input reasoning differences." The fix, SNR-Aware Filtering, follows from this. Before each update, it estimates the reward variance of each prompt and keeps only the prompts with the highest variance. With PPO on a 3B model, this raises peak success on Sokoban from 12.9 to 28.9 percent, and it improves peak success "in most settings", though not all. On Sokoban, it also reduces time per step by 26 to 41 percent, because fewer prompts enter the gradient computation. On FrozenLake, the advantage holds up to 50 percent transition noise but closes at 80 to 100 percent, where reward variance stops being an informative signal.

The main lesson we take from RAGEN-2 into the projects below is that fluent reasoning is not evidence that the agent is tracking its input.

## Asking the agent to write down its world model

If we cannot trust free-form reasoning to stay tied to the input, one option is to ask for specific content and check it. This is the idea behind [VAGEN](https://vagen-ai.github.io/). We structure the agent's reasoning into StateEstimation ("what is the current state?") and TransitionModeling ("what is next?"). The agent writes its state belief inside observation tags and its prediction inside prediction tags. Both together form what the paper calls WorldModeling. The world model here is the agent's own reasoning text. We do not train a separate dynamics network.

Structure alone helps. With the same Qwen2.5-VL-3B backbone and RL training, WorldModeling reaches an overall score of 0.76, compared with 0.67 for free-form thinking and 0.28 for no thinking. We then reward the world model reasoning itself. At each turn, an LLM judge compares what the agent wrote about the current and next state with the ground-truth states. We combine this per-turn reward with a two-level advantage estimate, one level across turns and one across tokens within a turn. With these additions, the 3B model reaches 0.82 across five tasks (Sokoban, FrozenLake, 3D navigation, object manipulation and SVG reconstruction), up from 0.21 before training. (SVG reconstruction has no state changes to judge, so it uses only the two-level advantage estimate.) On the same tasks, the paper reports GPT-5 at 0.75.

VAGEN also showed two limits. First, the best way to describe the state depends on the task. Natural language works best on the grid puzzles, and structured formats are slightly better for precise manipulation. Second, the judged reward can be gamed. In some settings, especially with the two-level advantage estimate, agents learned "generic, broadly applicable responses that satisfy the LLM-as-a-Judge's criteria" instead of reasoning about the specific state. Rewarding the content of reasoning is useful, but the reward itself needs the same scrutiny that RAGEN-2 applied to entropy.

## From grid states to camera views

VAGEN's tasks have states that a sentence can describe. In 3D scenes, much of the state is a matter of viewpoint: where the camera is and what it would see after a move. [Planning with the Views](https://viewagent.github.io/) studies this ability, which the paper defines as "using camera moves as planning primitives to find a target view in 3D." We built ViewSuite on 286 real ScanNet indoor scenes with full 6-DoF camera control. Frontier models find the task hard when they have to move the camera themselves. The best one, Gemini 3.1 Pro, reaches 21.3 percent, and most models stay below 10 percent.

Plain RL also struggles here because success is rare. Direct PPO plateaus at 3.2 percent. The key observation in this work is that a failed episode still contains correct information about the scene: "every trajectory, whether or not it reaches its goal, traces valid view transitions through the scene." We collect these transitions into a view graph, where nodes are viewpoints and edges are camera actions. The paper describes this graph as "an empirical world model of view transitions", and we train the model on paths through it. Alternating this training with self-exploration lifts Qwen2.5-VL-7B from 2.5 percent to 47.8 percent. Unlike in VAGEN, the agent does not write this model at each turn. Instead, it is built from the agent's own experience and then distilled back into the agent. The paper is also clear about what remains: the trained model "still localizes largely by approaching until the target view becomes observable", rather than reasoning about the target in advance.

## Toward robots

The projects above use puzzles, short manipulation tasks and indoor scenes. In the [Embodied First Exam](https://www.embodied-first-exam.ai), we ask the same question for agentic robotics, where an agent has to control a robot through code. The tasks still run in simulators, but the exam's standard mode gives the agent only what a real robot would provide. In this exam, a coding agent "writes code, runs it on a robot in a frozen scene from one of the suites, and sees what happens." The exam currently has over 1,000 tasks from more than 30 suites, and its headline results use a core set of 449 tasks. The best agent on the leaderboard, GPT-6 Astra, solves 143 of the 449 core tasks (31.8 percent).

The result that connects most directly to this post is the gap between modes. In privileged mode, the agent can read the simulator's internal state and reset as often as it likes. In standard mode, it sees only camera images and joint readings, usually has no resets, and the live episode is graded. Over all core tests in each mode (a core task can have both a privileged and a standard test), the same agent solves 76.3 percent of the 372 privileged tests and 32.4 percent of the 432 standard tests, and "for every agent, most tasks solved in privileged mode become failures when rerun in standard mode." The exam does not separate the effect of losing the true state from the effect of losing resets, and its report credits both.

## Open questions

These projects leave us with more questions than answers. The ones we think about most are:

- RAGEN-2 already runs on a vision-language model, but we do not yet know how to apply its mutual information estimate to the observation and prediction fields that VAGEN asks for.
- RAGEN-2 lists as open how template collapse behaves when several agents interact.
- VAGEN's judged reward helps and can also be gamed. We would like rewards for world model reasoning that check the content against the environment directly.
- Our trained view planning model still finds the target mainly by moving until the target comes into view. Finding a target view before seeing it, by reasoning about where it lies, remains open; a stronger model of view transitions may be what makes this possible.
- The Embodied First Exam suggests that much of the difficulty in robotics comes from not having the true state and not being able to undo mistakes. We do not yet know whether the methods above, which were developed on smaller tasks, help agents in that setting.

We are working on each of these, and we would be glad to hear from others who are thinking about the same problems.

## Papers

- Zihan Wang et al. [RAGEN-2: Reasoning Collapse in Agentic RL](https://arxiv.org/abs/2604.06268). ICML 2026 (Oral). Project page: [ragen-ai.github.io](https://ragen-ai.github.io/).
- Kangrui Wang, Pingyue Zhang, Zihan Wang, Yaning Gao, Linjie Li et al. [VAGEN: Reinforcing World Model Reasoning for Multi-Turn VLM Agents](https://arxiv.org/abs/2510.16907). NeurIPS 2025. Project page: [vagen-ai.github.io](https://vagen-ai.github.io/).
- Kangrui Wang et al. [Planning with the Views](https://arxiv.org/abs/2605.29563). arXiv 2605.29563, 2026. Project page: [viewagent.github.io](https://viewagent.github.io/).
- Kangrui Wang, Qineng Wang, Changhe Chen, Pingyue Zhang, Chi Gui et al. [Embodied First Exam](https://www.embodied-first-exam.ai). Public release, October 2026.
