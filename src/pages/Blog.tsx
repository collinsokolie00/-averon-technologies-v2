const articles = [
    {
        category: "AI",
        title: "How AI is changing modern businesses",
        excerpt:
            "Artificial intelligence is becoming part of everyday business operations, from customer support to automation.",
    },
    {
        category: "Development",
        title: "Building products with quality before speed",
        excerpt:
            "Why taking time to engineer software correctly creates better long-term products.",
    },
    {
        category: "Technology",
        title: "Choosing the right technology stack",
        excerpt:
            "Modern web applications require balanced decisions between performance, scalability and maintenance.",
    },
    {
        category: "Business",
        title: "Creating software that grows with your company",
        excerpt:
            "A scalable architecture reduces future development costs and improves reliability.",
    },
];

export default function Blog() {
    return (
        <>
            <section className="page-hero blog-hero">
                <div className="container">
                    <span>Insights</span>

                    <h1>Engineering ideas, AI and product development.</h1>

                    <p>
                        Discover articles, engineering notes and product updates from
                        Averon Technologies.
                    </p>
                </div>
            </section>

            <section className="journal">
                <div className="container">

                    <div className="journal-grid">

                        {articles.map((article) => (

                            <article
                                className="journal-card"
                                key={article.title}
                            >

                                <span>{article.category}</span>

                                <h2>{article.title}</h2>

                                <p>{article.excerpt}</p>

                                <button className="project-btn">
                                    Read Article →
                                </button>

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

                    <button className="btn-primary">

                        Subscribe

                    </button>

                </div>

            </section>
        </>
    );
}