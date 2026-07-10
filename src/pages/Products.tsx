const products = [
    {
        name: "Nexus AI",
        category: "Artificial Intelligence",
        status: "In Development",
        description:
            "A multi-model AI assistant for conversations, research, coding, image generation, and intelligent workflows.",
        technologies: ["React", "TypeScript", "Firebase", "OpenAI"],
    },
    {
        name: "Altrex Code",
        category: "AI Engineering Agent",
        status: "In Development",
        description:
            "A local AI engineering agent designed to inspect projects, edit files, execute development tasks, and support software teams.",
        technologies: ["Node.js", "Express", "AI Agents", "Git"],
    },
    {
        name: "Lumora",
        category: "E-commerce Platform",
        status: "Preparing for Launch",
        description:
            "A premium home, kitchen, organization, and outdoor-living commerce platform with supplier and order automation.",
        technologies: ["React", "Firebase", "Stripe", "CJ API"],
    },
    {
        name: "Ryan Jewelry",
        category: "Luxury Commerce",
        status: "In Development",
        description:
            "A premium jewelry storefront focused on elegant product presentation, customer experience, and modern commerce.",
        technologies: ["React", "TypeScript", "E-commerce", "Admin"],
    },
    {
        name: "Owlchix",
        category: "Future Product",
        status: "Coming Soon",
        description:
            "A future product currently being developed within the Averon Technologies ecosystem.",
        technologies: ["Product Research", "Design", "Technology"],
    },
];

export default function Products() {
    return (
        <>
            <section className="page-hero">
                <div className="container">
                    <span>Our Ecosystem</span>

                    <h1>Products built under Averon Technologies.</h1>

                    <p>
                        A growing ecosystem of artificial intelligence, software,
                        e-commerce, and digital products designed for long-term impact.
                    </p>
                </div>
            </section>

            <section className="products-page">
                <div className="container products-page-grid">
                    {products.map((product, index) => (
                        <article className="product-showcase-card" key={product.name}>
                            <div className="product-card-top">
                                <span className="product-number">
                                    {String(index + 1).padStart(2, "0")}
                                </span>

                                <span className="product-status">{product.status}</span>
                            </div>

                            <div className="product-icon">
                                {product.name.charAt(0)}
                            </div>

                            <span className="product-category">{product.category}</span>

                            <h2>{product.name}</h2>

                            <p>{product.description}</p>

                            <div className="product-technologies">
                                {product.technologies.map((technology) => (
                                    <span key={technology}>{technology}</span>
                                ))}
                            </div>

                            <button type="button" className="product-link">
                                View Product
                                <span aria-hidden="true">→</span>
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}