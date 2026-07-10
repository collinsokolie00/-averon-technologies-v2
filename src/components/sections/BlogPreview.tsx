const posts = [
    "How AI is changing modern business",
    "Why every business needs a strong digital platform",
    "Building products with quality before speed",
];

export default function BlogPreview() {
    return (
        <section className="blog-preview">
            <div className="container">
                <div className="section-heading">
                    <span>Insights</span>
                    <h2>Thoughts on AI, software, and digital business.</h2>
                </div>

                <div className="blog-grid">
                    {posts.map((post) => (
                        <article className="blog-card" key={post}>
                            <span>Averon Journal</span>
                            <h3>{post}</h3>
                            <p>Short articles and lessons from building real digital products.</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}