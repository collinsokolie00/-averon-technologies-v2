const services = [
    {
        number: "01",
        title: "Website Development",
        description:
            "Premium, responsive websites designed around your brand, business goals, and customer experience.",
        features: [
            "Business websites",
            "Corporate platforms",
            "Landing pages",
            "Website redesign",
        ],
    },
    {
        number: "02",
        title: "E-commerce Development",
        description:
            "Custom online stores built for reliable product management, secure checkout, and long-term growth.",
        features: [
            "Custom storefronts",
            "Shopify and WooCommerce",
            "Payment integration",
            "Store optimization",
        ],
    },
    {
        number: "03",
        title: "AI Solutions",
        description:
            "AI assistants, intelligent tools, and workflow integrations designed to improve business operations.",
        features: [
            "AI assistants",
            "Chatbot development",
            "Model integration",
            "AI-powered workflows",
        ],
    },
    {
        number: "04",
        title: "Business Automation",
        description:
            "Connected systems that reduce repetitive work and make everyday business processes more efficient.",
        features: [
            "Workflow automation",
            "Email automation",
            "System integrations",
            "Operational dashboards",
        ],
    },
    {
        number: "05",
        title: "Product Engineering",
        description:
            "From the first concept to a working product, Averon helps turn ideas into scalable digital platforms.",
        features: [
            "MVP development",
            "Software architecture",
            "Frontend and backend",
            "Product improvement",
        ],
    },
    {
        number: "06",
        title: "Maintenance and Support",
        description:
            "Ongoing technical support, security improvements, updates, and performance optimization.",
        features: [
            "Bug fixing",
            "Security updates",
            "Performance improvements",
            "Long-term maintenance",
        ],
    },
];

const processSteps = [
    "Discovery and requirements",
    "Planning and architecture",
    "Design and development",
    "Testing and refinement",
    "Launch and support",
];

export default function Services() {
    return (
        <>
            <section className="page-hero services-page-hero">
                <div className="container">
                    <span>Our Services</span>

                    <h1>Technology solutions built around real business needs.</h1>

                    <p>
                        Averon Technologies designs and develops websites, software,
                        artificial-intelligence systems, commerce platforms, and business
                        automation with quality and long-term growth in mind.
                    </p>
                </div>
            </section>

            <section className="services-page">
                <div className="container services-page-grid">
                    {services.map((service) => (
                        <article className="service-showcase-card" key={service.title}>
                            <div className="service-card-header">
                                <span className="service-number">{service.number}</span>
                                <span className="service-arrow" aria-hidden="true">
                                    ↗
                                </span>
                            </div>

                            <h2>{service.title}</h2>
                            <p>{service.description}</p>

                            <ul>
                                {service.features.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>

                            <a href="/contact" className="service-card-link">
                                Discuss this service
                                <span aria-hidden="true">→</span>
                            </a>
                        </article>
                    ))}
                </div>
            </section>

            <section className="services-process">
                <div className="container services-process-grid">
                    <div className="services-process-copy">
                        <span>How We Work</span>
                        <h2>A clear process from idea to delivery.</h2>
                        <p>
                            Every project follows a structured process so decisions remain
                            clear, quality stays high, and the final system works properly.
                        </p>
                    </div>

                    <div className="process-list">
                        {processSteps.map((step, index) => (
                            <div className="process-row" key={step}>
                                <span>{String(index + 1).padStart(2, "0")}</span>
                                <h3>{step}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="services-cta">
                <div className="container services-cta-box">
                    <div>
                        <span>Start a Project</span>
                        <h2>Need a reliable technology partner for your next project?</h2>
                        <p>
                            Tell us what you want to build, improve, automate, or launch.
                        </p>
                    </div>

                    <a href="/contact" className="btn-primary">
                        Contact Averon
                    </a>
                </div>
            </section>
        </>
    );
}