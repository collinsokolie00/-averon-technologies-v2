import { Link } from "react-router";

import { blogArticles } from "../../data/blogArticles";

export default function BlogPreview() {
    return (
        <section className="blog-preview">
            <div className="container">
                <div className="section-heading">
                    <span>Insights</span>
                    <h2>Thoughts on AI, software, and digital business.</h2>
                </div>

                <div className="blog-grid">
                    {blogArticles.slice(0, 3).map((post) => (
                        <Link className="blog-card" to={`/blog/${post.slug}`} key={post.slug}>
                            <img src={post.image} alt="" />
                            <span>Averon Journal</span>
                            <h3>{post.title}</h3>
                            <p>{post.excerpt}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
