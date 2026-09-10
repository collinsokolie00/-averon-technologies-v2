import { Link } from "react-router";

import { openEmmyAssistant } from "../lib/emmyAssistant";
import { usePageContent } from "../content/pageContent";

const services = [
    {
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
    const { section } = usePageContent("services"); const intro = section("intro"); const ai = section("aiSolutions");
    const canonicalServices = services.map((service) => service.title === "AI Solutions" ? { ...service, title: ai.title ?? service.title, description: ai.description ?? service.description } : service);
    const topServices = canonicalServices.slice(0, 3);
    const bottomServices = canonicalServices.slice(3);

    return (
        <>
            <section className="page-hero services-page-hero">
                <div className="container">
                    <span className="services-hero-eyebrow">Our Services</span>

                    <h1>{intro.heading}</h1>

                    <p>{intro.intro}</p>

                    <div className="services-hero-actions">
                        <Link to="/contact?service=Project%20Consultation" className="btn-primary">
                            Start a project
                        </Link>
                        <a href="#service-capabilities" className="btn-secondary">
                            Explore services
                        </a>
                    </div>
                </div>
            </section>

            <section className="services-page" id="service-capabilities">
                <div className="container services-page-grid">
                    {topServices.map((service) => (
                        <article className="service-showcase-card" key={service.title}>
                            <div className="service-card-header">
                                <span className="service-kicker">Averon Service</span>
                                <Link className="service-arrow" to={`/contact?service=${encodeURIComponent(service.title)}`} aria-label={`Discuss ${service.title}`}>
                                    ↗
                                </Link>
                            </div>

                            <h2>{service.title}</h2>
                            <p>{service.description}</p>

                            <ul>
                                {service.features.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                className="service-card-link"
                                onClick={() => openEmmyAssistant({
                                    prompt: `Discuss ${service.title} for my business.`,
                                    response: `${service.title} helps customers understand what Averon can build, how the service can support their goals, and what details are needed before a project starts.`,
                                })}
                            >
                                Discuss this service
                                <span aria-hidden="true">→</span>
                            </button>
                        </article>
                    ))}

                    <article className="service-wide-banner">
                        <span>Complete Delivery Partner</span>
                        <h2>From first idea to launch, Averon connects strategy, design, engineering, automation, and long-term support.</h2>
                        <Link to="/contact?service=Project%20Consultation">Start a project conversation →</Link>
                    </article>

                    {bottomServices.map((service) => (
                        <article className="service-showcase-card" key={service.title}>
                            <div className="service-card-header">
                                <span className="service-kicker">Averon Service</span>
                                <Link className="service-arrow" to={`/contact?service=${encodeURIComponent(service.title)}`} aria-label={`Discuss ${service.title}`}>
                                    ↗
                                </Link>
                            </div>

                            <h2>{service.title}</h2>
                            <p>{service.description}</p>

                            <ul>
                                {service.features.map((feature) => (
                                    <li key={feature}>{feature}</li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                className="service-card-link"
                                onClick={() => openEmmyAssistant({
                                    prompt: `Discuss ${service.title} for my business.`,
                                    response: `${service.title} helps customers understand what Averon can build, how the service can support their goals, and what details are needed before a project starts.`,
                                })}
                            >
                                Discuss this service
                                <span aria-hidden="true">→</span>
                            </button>
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

                    <Link to="/contact?service=Project%20Consultation" className="btn-primary">
                        Contact Averon
                    </Link>
                </div>
            </section>
        </>
    );
}
