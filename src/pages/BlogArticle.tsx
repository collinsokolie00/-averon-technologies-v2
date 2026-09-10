import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import { getBlogArticle } from "../data/blogArticles";
import NotFound from "./NotFound";

export default function BlogArticle() {
  const { slug } = useParams();
  const article = getBlogArticle(slug);

  if (!article) {
    return <NotFound />;
  }

  return (
    <>
      <section className="blog-article-page">
        <div className="container blog-article-shell">
          <Link className="blog-back-link" to="/blog">
            <ArrowLeft size={16} />
            Back to blog
          </Link>

          <div className="blog-article-heading">
            <span>{article.category}</span>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
          </div>

          <div className="blog-article-grid">
            <article className="blog-article-copy">
              <img src={article.image} alt="" />
              {article.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>

            <aside className="blog-article-cta">
              <span>Interested?</span>
              <h2>Talk to Averon about this topic.</h2>
              <p>Share your project idea, business challenge, or workflow question and Averon will review the best next step.</p>
              <Link className="btn-primary" to={`/contact?service=${encodeURIComponent(`Question about ${article.title}`)}`}>
                Contact Averon
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
