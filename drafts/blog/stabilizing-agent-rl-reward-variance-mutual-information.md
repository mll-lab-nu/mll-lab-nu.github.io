---
title: "Stabilizing agent RL: filter prompts by reward variance, and watch mutual information instead of entropy"
date: 2026-10-30
authors: MLL Lab
draft: true
description: "Two practical checks from RAGEN-2 for multi-turn agent RL: drop prompts whose rollouts all get similar rewards, and track whether the agent's reasoning still depends on its input."
---

If you train multi-turn LLM agents with RL, you probably watch two curves: reward, and the entropy of the model's outputs. Reward tells you whether the agent is succeeding. Entropy is supposed to tell you whether its reasoning is still healthy. In [RAGEN-2](https://arxiv.org/abs/2604.06268) we found a failure that neither curve shows. The agent keeps writing varied, fluent reasoning, but the reasoning no longer depends on what the agent sees. This post explains how to detect that failure and the one-line training change that reduces it. Both come from the paper, and both are in the [RAGEN code](https://github.com/mll-lab-nu/RAGEN).

## The failure: reasoning that would fit any input

Imagine a Sokoban agent that, after some training, writes something like "I need to push the box toward the goal while avoiding walls, so I will move carefully" before every action. Each sentence varies a little from sample to sample, so the output entropy stays high. But the same paragraph would fit any board. The agent has stopped reasoning about the board in front of it.

We call this **template collapse**. The reason entropy misses it is that entropy measures only one thing. Total reasoning entropy splits into two parts:

- **H(Z | X)**, the conditional entropy: how much the reasoning Z varies for the same input X. This is what entropy monitoring measures.
- **I(X; Z)**, the mutual information: how much the reasoning tells you about which input produced it. This is what you actually want to stay high.

Template collapse is the case where the first part stays high and the second part drops toward zero. In our training runs, mutual information started falling well before task success did, while conditional entropy stayed high the whole time. So a stable entropy curve is not good news by itself.

## Check 1: measure whether reasoning still depends on the input

Mutual information has no closed form for token sequences, so we estimate it inside each training batch. The idea is a simple retrieval test.

Take the P prompts and G reasoning traces per prompt that you already sampled for the RL update. Score every reasoning trace under every prompt in the batch, using the policy itself: compute log p(Z_i,k | X_j) with teacher forcing. Then ask, for each trace, whether its own prompt gives it the highest score.

- If the reasoning depends on the input, a trace fits its own prompt much better than the others, and retrieval accuracy is high.
- If the reasoning is a template, every prompt explains it about equally well, and retrieval accuracy falls to chance, which is 1/P.

The paper also defines a continuous version: the average gap between a trace's log-likelihood under its own prompt and under the uniform mixture of all prompts in the batch, normalized by a z-score and smoothed with an exponential moving average. This estimate needs no extra model and no new rollouts. It does need the extra scoring pass, so RAGEN runs it every few steps rather than every step.

Does it work better than entropy? We ran many training runs that varied entropy regularization strength, KL strength, and filter strength, and computed the Spearman correlation between each diagnostic and task success. The best mutual information metric reached **+0.39**. The entropy metrics came out between **-0.11 and -0.14**, which means that higher entropy was, if anything, slightly associated with worse runs.

Two other cheap signals are worth knowing about, because they do not catch the problem:

- **Format validity.** Runs can keep near-perfect output format while their mutual information is low. Following the format and reading the input are separate things.
- **Reasoning length.** Across the eight environments we looked at, reasoning got shorter over training. That is consistent with template collapse, but a shorter answer can also be a sharper one, so length alone cannot tell you which happened.

## Why it happens: low reward variance leaves only the regularizer

Consider one prompt with G sampled trajectories. With group-based advantages, the task gradient for that prompt is built from how much each trajectory's reward differs from the group mean. If all G trajectories get about the same reward, because the prompt is too easy, too hard, or the rewards are noisy, the advantages are near zero and the task gradient is weak. The paper shows that the size of this task gradient is bounded by the square root of the prompt's reward variance.

The KL penalty and the entropy bonus do not behave this way. They push on every reasoning chain with roughly the same force, no matter which prompt it came from or what reward it got. We measured this directly. We sorted prompts into six buckets by reward variance and found that the task gradient norm rises steadily with reward variance, while the regularizer gradient norm stays flat across all six buckets.

So on low-variance prompts, the update is mostly the regularizer. The regularizer keeps the reasoning fluent and varied, but it does not push the reasoning to depend on the input. Repeat that over many steps and you get template collapse.

## Check 2: filter prompts by reward variance before each update

The fix follows directly. Before each update, compute the reward variance of each prompt's group and drop the prompts with the least of it. We call this **SNR-Aware Filtering**, since reward variance serves as a cheap stand-in for the signal-to-noise ratio of that prompt's gradient.

The rule we use is like top-p sampling, but over prompts. Sort prompts by reward variance, then keep the smallest set of top prompts whose variances add up to a fraction ρ of the batch total:

```python
import numpy as np

def snr_aware_filter(rewards, rho=0.9):
    """rewards: array of shape [P, G], episode returns for G rollouts of each of P prompts.
    Returns the indices of the prompts to keep for this update."""
    rv = rewards.var(axis=1, ddof=1)            # within-prompt reward variance
    order = np.argsort(-rv)                     # highest variance first
    target = rho * rv.sum()
    k = int(np.searchsorted(np.cumsum(rv[order]), target)) + 1
    return order[:k]
```

Because the rule works on variance mass instead of a fixed count, it adapts by itself. Late in training, more prompts end up with near-identical rewards, and the filter keeps fewer of them.

In RAGEN this is a config change under `actor_rollout_ref.rollout`:

```yaml
rollout_filter_strategy: top_p
rollout_filter_value: 0.9            # keep rate rho
rollout_filter_top_p_prob_mode: linear
rollout_filter_include_zero: False
rollout_filter_metric: reward_variance
```

The mutual information metrics are logged under `collapse/` (for example `collapse/retrieval_accuracy` and `collapse/mi_zscore_ema`), configured in the `collapse_detection` block. The [filtering guide](https://github.com/mll-lab-nu/RAGEN/blob/main/docs/guide_rollout_filtering.md) and the [mutual information reference](https://github.com/mll-lab-nu/RAGEN/blob/main/docs/reference_mutual_information_metrics.md) cover the other options.

## What it buys you

The main results use Qwen2.5-3B with P = 8 prompts and G = 16 rollouts per prompt, up to 400 training iterations.

- **Success rate.** With PPO, peak Sokoban success goes from 12.9% to 28.9%, and FrozenLake from 67.0% to 77.9%. Across PPO, DAPO, GRPO, and Dr. GRPO, model sizes from 0.5B to 7B, Llama3.2-3B, and text or image input with Qwen2.5-VL-3B, the average over tasks improves in every setting. Individual cells do sometimes drop slightly, for example GRPO on FrozenLake (-3.0 points).
- **Compute.** Computing reward variance takes under 0.1% of iteration time. Since fewer prompts enter the gradient step, filtering with ρ = 0.9 cut time per step by 26% to 41% on Sokoban, with the rollout budget held fixed.
- **Input dependence.** On Sokoban, filtering raised both success and the mutual information proxy. Tuning the KL or entropy coefficients mostly moved conditional entropy and rarely moved mutual information.

Two ablations show that it is the reward variance, not just filtering, that matters:

- **Training on one quartile at a time.** We split prompts into four groups by reward variance and trained on only one group per run. Success fell from 21.1% (highest variance) to 11.0% (lowest), and mutual information fell from 0.95 to 0.73. Entropy did not follow this order: it was 2.02 for the highest-variance group and 1.87 for the lowest.
- **Filtering by something else.** Filtering by entropy, entropy variance, or reasoning length did not prevent collapse on Sokoban. Filtering by reward variance did.

Filtering whole prompts also beat filtering individual trajectories. Keeping every prompt but only its top-8 and bottom-8 trajectories by reward reached 16.8% success on Sokoban. Prompt-level filtering reached 23.6%, against 12.9% with no filter. Forcing variance into a prompt that naturally has little of it mostly amplifies noise.

## When it will not help

A few practical limits:

- **You need at least two rollouts per prompt** to compute variance. With a fixed rollout budget, this means fewer distinct prompts per batch. In our sweep, group sizes of 4 or more with filtering matched or beat the setting with one rollout for each of 128 prompts.
- **Check the spread of reward variance first.** Filtering helps when some prompts have much more reward variance than others. A useful quick test is the standard deviation of per-prompt reward variance divided by its mean, which you can compute from one rollout batch before training. On Sokoban this ratio was 1.16 to 1.29 and filtering helped (+3.2% and +4.6%). On FrozenLake with GRPO it was 0.33 and filtering hurt (-5.0%), because when all prompts look alike, filtering just throws data away at random.
- **Very noisy environments.** On FrozenLake, the advantage of filtering held up to 50% transition noise but disappeared at 80% to 100%. At that point reward variance mostly reflects luck, not how informative the prompt is.
- **The keep rate needs some tuning per task**, and aggressive filtering can narrow exploration. A strong model could in principle also learn to inflate its reward variance, which is worth watching in long runs.

## Summary

- Entropy staying high does not mean the agent is still reasoning about its input. Track the mutual information between input and reasoning; in-batch retrieval accuracy is an easy way to start.
- Prompts whose rollouts all get similar rewards contribute mostly regularizer pressure to the update. Drop them before the update by ranking prompts on reward variance.
- Check the spread of reward variance across prompts before you rely on the filter.

The paper is [RAGEN-2: Reasoning Collapse in Agentic RL](https://arxiv.org/abs/2604.06268) (ICML 2026 Oral). Code, configs, and the full experiment matrix are at [github.com/mll-lab-nu/RAGEN](https://github.com/mll-lab-nu/RAGEN), and the project page is [ragen-ai.github.io](https://ragen-ai.github.io/).

```bibtex
@article{wang2026ragen2,
  title   = {RAGEN-2: Reasoning Collapse in Agentic RL},
  author  = {Wang, Zihan and Gui, Chi and Jin, Xing and Wang, Qineng and Liu, Licheng and Wang, Kangrui and Chen, Shiqi and Li, Linjie and Yang, Zhengyuan and Zhang, Pingyue and Lu, Yiping and Wu, Jiajun and Fei-Fei, Li and Wang, Lijuan and Choi, Yejin and Li, Manling},
  journal = {arXiv preprint arXiv:2604.06268},
  year    = {2026}
}
```
