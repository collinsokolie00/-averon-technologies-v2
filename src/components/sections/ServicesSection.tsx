const services = [
    {
        title: "Website Development",
        text: "Premium business websites built with clear structure, strong visuals, fast loading, and reliable contact or quote workflows.",
    },
    {
        title: "AI Integration",
        text: "AI assistants, support tools, content helpers, and workflow intelligence connected carefully to real business processes.",
    },
    {
        title: "E-commerce Systems",
        text: "Storefronts, catalogs, checkout preparation, product pages, and admin foundations designed for professional online selling.",
    },
    {
        title: "Business Automation",
        text: "Automated quote handling, customer updates, notifications, dashboards, and repeatable workflows that save time.",
    },
    {
        title: "Product MVP Development",
        text: "Lean but polished first versions of software products, built with the right core features and room to grow.",
    },
    {
        title: "Cloud & Deployment",
        text: "Hosting, Firebase, secure environments, payment webhooks, and launch setup handled with long-term maintenance in mind.",
    },
];

export default function ServicesSection() {
    const topServices = services.slice(0, 3);
    const bottomServices = services.slice(3);

    return (
        <section id="services" className="services">
            <div className="container">
                <div className="section-heading">
                    <span>What We Build</span>
                    <h2>Technology services for modern businesses.</h2>
                    <p>
                        From websites to AI-powered platforms, Averon helps businesses build,
                        launch, and improve digital systems with quality and long-term growth in mind.
                    </p>
                </div>

                <div className="services-grid">
                    {topServices.map((service) => (
                        <div className="service-card" key={service.title}>
                            <h3>{service.title}</h3>
                            <p>{service.text}</p>
                        </div>
                    ))}

                    <div className="service-home-banner">
                        <span>Premium Delivery</span>
                        <h3>Clear strategy, clean execution, and systems ready for real customer workflows.</h3>
                    </div>

                    {bottomServices.map((service) => (
                        <div className="service-card" key={service.title}>
                            <h3>{service.title}</h3>
                            <p>{service.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
