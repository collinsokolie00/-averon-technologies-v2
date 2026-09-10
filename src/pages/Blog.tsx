import { Link } from "react-router";

import { blogArticles } from "../data/blogArticles";

export default function Blog() {
    return (
        <>
            <section className="page-hero blog-hero">
                <div className="container">
                    <span className="blog-hero-eyebrow">Insights</span>

                    <h1>Engineering ideas, AI and product development.</h1>

                    <p>
                        Discover articles, engineering notes and product updates from
                        Averon Technologies.
                    </p>

                    <div className="blog-hero-actions">
                        <a href="#latest-insights" className="btn-primary">
                            Browse insights
                        </a>
                        <Link to="/contact?service=Project%20Consultation" className="btn-secondary">
                            Discuss a project
                        </Link>
                    </div>
                </div>
            </section>

            <section className="journal" id="latest-insights">
                <div className="container">

                    <div className="journal-grid">

                        {blogArticles.map((article) => (

                            <article
                                className="journal-card"
                                key={article.title}
                            >
                                <img src={article.image} alt="" />

                                <span>{article.category}</span>

                                <h2>{article.title}</h2>

                                <p>{article.excerpt}</p>

                                <Link
                                    className="project-btn"
                                    to={`/blog/${article.slug}`}
                                >
                                    Read Article →
                                </Link>

                            </article>

                        ))}

                    </div>

                </div>
            </section>

            <section className="newsletter">

                <div className="container newsletter-box">

                    <div>

                        <span>Averon Journal</span>

                        <h2>

                            Stay updated with our latest articles.

                        </h2>

                    </div>

                    <Link className="btn-primary" to="/contact?service=Averon%20Journal%20Subscription">

                        Subscribe

                    </Link>

                </div>

            </section>
        </>
    );
}
