import "./news.css";

const newsItems = [
  {
    date: "July 2026",
    event: "We organized the <a href='https://fagen-workshop.github.io/'>FAGEN: Failure Modes in Agentic AI</a> Workshop at ICML 2026, co-organized by Manling Li and Zihan Wang."
  },
  {
    date: "July 2026",
    event: "We co-organized the <a href='https://knowledgeable-lm.github.io/'>KnowFM: Towards Knowledgeable Foundation Models</a> Workshop at ACL 2026."
  },
  {
    date: "June 2026",
    event: "Our <a href='https://ragen-ai.github.io/v2/'>RAGEN-2</a> received the Best Paper Award (Top 1%) at the CVPR 2026 MMRAgI Workshop!"
  },
  {
    date: "June 2026",
    event: "We organized the 2nd <a href='https://foundation-models-meet-embodied-agents.github.io/cvpr2026/'>Foundation Models Meet Embodied Agents (FMEA)</a> Workshop at CVPR 2026."
  },
  {
    date: "May 2026",
    event: "Our <a href='https://ragen-ai.github.io/v2/'>RAGEN-2: Reasoning Collapse in Agentic RL</a> is accepted to ICML 2026 as an Oral Presentation (Top 0.7%)."
  },
  {
    date: "April 2026",
    event: "Our <a href='https://enact-embodied-cognition.github.io/'>ENACT</a> received two Outstanding Paper Awards at the ICLR 2026 World Models and Lifelong Agents Workshops."
  },
  {
    date: "February 2026",
    event: "Our <a href='https://fed-agent.github.io/'>FedAgent</a> received the Best Paper Award (TrustAgent @ AAAI 2026) and an Outstanding Paper Award (PerFM @ AAAI 2026)!"
  },
  {
    date: "January 2026",
    event: "Multiple papers are accepted to ICLR 2026, including <a href='https://enact-embodied-cognition.github.io/'>ENACT</a>, <a href='https://mind-cube.github.io/'>MindCube</a>, <a href='https://theory-of-space.github.io/'>Theory of Space</a> and <a href='https://odesteer.github.io/'>ODE-Steer</a>!"
  },
  {
    date: "December 2025",
    event: "We co-organized the <a href='https://responsible-fm.github.io/'>ResponsibleFM: Socially Responsible and Trustworthy Foundation Models</a> Workshop at NeurIPS 2025."
  },
  {
    date: "October 2025",
    event: "Our <a href='https://github.com/RAGEN-AI/VAGEN'>VAGEN</a> is accepted to NeurIPS 2025, and featured by MIT Tech Review and Stanford HAI."
  },
  {
    date: "2025",
    event: "Prof. Manling Li is named to <a href='https://www.technologyreview.com/innovators-under-35/2025/'>MIT Technology Review's Innovators Under 35</a> (Global List, 2025)!"
  },
  {
    date: "August 2025",
    event: "Our <a href='https://mind-cube.github.io/'>MindCube</a> received the Best Paper Award at the ICCV 2025 SP4V Workshop, and was selected as The Best of ICCV by Voxel51."
  },
  {
    date: "May 2025",
    event: "Our <a href='https://embodiedbench.github.io/'>EmbodiedBench</a> is accepted to ICML 2025 as an Oral Presentation (Top 1%)."
  },
  {
    date: "March 2025",
    event: "Will organize the <a href='https://foundation-models-meet-embodied-agents.github.io/cvpr2025/'>CVPR 2025 Workshop on Foundation Models for Embodied Agents</a>, with Ruohan Zhang, Yunzhu Li, Jiayuan Mao and Wenlong Huang, Qineng Wang, Yonatan Bisk, Shenlong Wang, Fei-Fei Li and Jiajun Wu. Calling for papers!"
  },
  {
    date: "December 2024",
    event: "Will organize the tutorial on <a href='https://foundation-models-meet-embodied-agents.github.io/aaai2025/'>Foundation Models for Embodied Agents</a> at AAAI 2025 and NAACL 2025, with Yunzhu Li, Jiayuan Mao and Wenlong Huang."
  },
  {
    date: "December 2024",
    event: "Prof. Manling Li is selected as AAAI 2025 New Faculty Highlights."
  },
  {
    date: "November 2024",
    event: "Our Embodied Agent Interface has been selected as Best Paper Award (top 0.4%) at <a href='https://socalnlp.github.io/symp24/index.html'>SoCal NLP 2024</a>!"
  },
  {
    date: "October 2024",
    event: "Our Embodied Agent Interface has been selected as Oral Presentation (top 0.6% over D&B track, top 0.4% over all tracks) at NeurIPS 2024!"
  },
];

export default function News() {
  return (
    <div className="news-container">
      <div className="news-scroll-area">
        <ul>
          {newsItems.map((item, index) => (
            <li key={index}>
              <p className="py-2 text-lg">
                <span className="opacity-50">{item.date} —</span>{" "}
                <span
                  className="news-link"
                  dangerouslySetInnerHTML={{ __html: item.event }}
                ></span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
