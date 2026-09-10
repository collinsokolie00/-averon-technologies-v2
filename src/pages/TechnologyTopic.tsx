import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { getTechnologyTopic } from "../data/technologyTopics";
import { openEmmyAssistant } from "../lib/emmyAssistant";
import NotFound from "./NotFound";

export default function TechnologyTopic() {
  const { topicSlug } = useParams();
  const topic = getTechnologyTopic(topicSlug);

  if (!topic) {
    return <NotFound />;
  }

  return (
    <>
      <section className="technology-topic">
        <div className="container technology-topic-grid">
          <article className="technology-topic-main">
            <Link to="/technology" className="technology-back-link">
              <ArrowLeft size={16} />
              Back to technology
            </Link>

            <span className="technology-topic-eyebrow">{topic.eyebrow}</span>
            <h1>{topic.title}</h1>
            <p className="technology-topic-summary">{topic.summary}</p>

            <h2>How Averon uses this layer</h2>
            <p>{topic.intro}</p>

            <div className="technology-topic-points">
              {topic.points.map((point) => (
                <div className="technology-topic-point" key={point}>
                  <CheckCircle2 size={18} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="technology-topic-card">
            <span>Expected Outcome</span>
            <p>{topic.outcome}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openEmmyAssistant({
                prompt: `Discuss the ${topic.title} layer and how Averon uses it.`,
                response: `${topic.title} is one of the coordinated layers Averon uses to turn a business idea into a usable digital product. I can explain the layer, what it controls, and how it connects to the full project workflow.`,
              })}
            >
              Discuss This Layer
            </button>
          </aside>
        </div>
      </section>
    </>
  );
}
