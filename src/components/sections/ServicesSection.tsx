const services = [
    "Website Development",
    "AI Integration",
    "E-commerce Systems",
    "Business Automation",
    "Product MVP Development",
    "Cloud & Deployment",
];

export default function ServicesSection() {
    return (
        <section className="services">
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
                    {services.map((service) => (
                        <div className="service-card" key={service}>
                            <h3>{service}</h3>
                            <p>
                                Premium digital solutions designed to be fast, reliable,
                                scalable, and easy to maintain.
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}