import styles from "./news.css";

const newsItems = [
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
