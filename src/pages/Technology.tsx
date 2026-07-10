import { Link } from "react-router";

const technologyGroups = [
    {
        number: "01",
        category: "Frontend Engineering",
        description:
            "Modern interfaces built for speed, accessibility, responsiveness, and long-term maintainability.",
        technologies: [
            "React",
            "TypeScript",
            "Vite",
            "Tailwind CSS",
            "HTML",
            "CSS",
        ],
    },
    {
        number: "02",
        category: "Backend and Infrastructure",
        description:
            "Reliable application foundations for business logic, data management, integrations, and secure operations.",
        technologies: [
            "Node.js",
            "Express",
            "Firebase",
            "Firestore",
            "Supabase",
            "REST APIs",
        ],
    },
    {
        number: "03",
        category: "Artificial Intelligence",
        description:
            "Multi-model AI systems, intelligent assistants, agent workflows, image generation, and automation.",
        technologies: [
            "OpenAI",
            "Anthropic",
            "DeepSeek",
            "AI Agents",
            "Vision Models",
            "Image Generation",
        ],
    },
    {
        number: "04",
        category: "Commerce and Payments",
        description:
            "Secure payment flows, product systems, supplier integrations, and scalable e-commerce experiences.",
        technologies: [
            "Stripe",
            "Shopify",
            "WooCommerce",
            "CJ Dropshipping API",
            "Checkout Systems",
            "Webhooks",
        ],
    },
    {
        number: "05",
        category: "Deployment and Operations",
        description:
            "Tools for version control, deployment, performance, monitoring, and dependable product delivery.",
        technologies: [
            "GitHub",
            "Cloud Hosting",
            "Firebase Hosting",
            "Vercel",
            "Analytics",
            "CI/CD",
        ],
    },
];

const principles = [
    {
        title: "Purpose before complexity",
        text: "We choose technology according to the product problem, not because a tool is popular.",
    },
    {
        title: "Built for maintenance",
        text: "Clear structure and reusable systems make products easier to improve over time.",
    },
    {
        title: "Security from the beginning",
        text: "Permissions, credentials, validation, and protected operations are considered early.",
    },
    {
        title: "Performance that users feel",
        text: "Fast loading, responsive interfaces, and efficient data access remain part of development.",
    },
];

export default function Technology() {
    return (
        <>
            <section className="page-hero technology-page-hero">
                <div className="container">
                    <span>Our Technology</span>

                    <h1>The systems behind everything we build.</h1>

                    <p>
                        Averon Technologies combines modern frontend engineering, reliable
                        backend systems, artificial intelligence, commerce infrastructure,
                        and cloud tools to create dependable digital products.
                    </p>
                </div>
            </section>

            <section className="technology-directory">
                <div className="container">
                    <div className="technology-intro">
                        <span>Technology Directory</span>

                        <h2>
                            A connected stack from interface to infrastructure.
                        </h2>

                        <p>
                            Every layer has a clear responsibility. Together, these
                            technologies support the products, websites, platforms, and
                            business systems developed by Averon.
                        </p>
                    </div>

                    <div className="technology-groups">
                        {technologyGroups.map((group) => (
                            <article className="technology-group" key={group.category}>
                                <div className="technology-group-number">
                                    {group.number}
                                </div>

                                <div className="technology-group-copy">
                                    <h3>{group.category}</h3>
                                    <p>{group.description}</p>
                                </div>

                                <div className="technology-list">
                                    {group.technologies.map((technology) => (
                                        <span key={technology}>{technology}</span>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="technology-system">
                <div className="container technology-system-grid">
                    <div className="technology-system-copy">
                        <span>Connected Engineering</span>

                        <h2>One product, multiple coordinated layers.</h2>

                        <p>
                            A polished interface is only one part of a complete system.
                            Averon connects user experience, application logic, data,
                            external services, security, and deployment into one reliable
                            product.
                        </p>

                        <Link to="/projects" className="technology-text-link">
                            Explore what we are building
                            <span aria-hidden="true">→</span>
                        </Link>
                    </div>

                    <div className="system-map" aria-label="Technology system layers">
                        <div className="system-layer system-layer-primary">
                            <span>01</span>
                            <strong>User Experience</strong>
                            <small>Interfaces and interactions</small>
                        </div>

                        <div className="system-connector" />

                        <div className="system-layer">
                            <span>02</span>
                            <strong>Application Logic</strong>
                            <small>Features and business rules</small>
                        </div>

                        <div className="system-connector" />

                        <div className="system-layer">
                            <span>03</span>
                            <strong>Data and Integrations</strong>
                            <small>Storage, APIs, AI, and payments</small>
                        </div>

                        <div className="system-connector" />

                        <div className="system-layer">
                            <span>04</span>
                            <strong>Infrastructure</strong>
                            <small>Security, hosting, and monitoring</small>
                        </div>
                    </div>
                </div>
            </section>

            <section className="technology-principles">
                <div className="container">
                    <div className="technology-principles-heading">
                        <span>Engineering Principles</span>
                        <h2>How Averon makes technology decisions.</h2>
                    </div>

                    <div className="principles-grid">
                        {principles.map((principle, index) => (
                            <article className="principle-item" key={principle.title}>
                                <span>{String(index + 1).padStart(2, "0")}</span>

                                <div>
                                    <h3>{principle.title}</h3>
                                    <p>{principle.text}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="technology-cta">
                <div className="container technology-cta-inner">
                    <div>
                        <span>Build With Averon</span>
                        <h2>Need the right technology foundation for your idea?</h2>
                    </div>

                    <Link to="/contact" className="btn-primary">
                        Discuss Your Project
                    </Link>
                </div>
            </section>
        </>
    );
}