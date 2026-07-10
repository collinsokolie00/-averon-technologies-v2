import { Link } from "react-router";

const featuredProducts = [
    {
        title: "Nexus AI",
        status: "In Development",
        description:
            "Multi-model AI assistant built for conversations, coding, image generation and intelligent workflows.",
    },
    {
        title: "Altrex Code",
        status: "Backend in Progress",
        description:
            "AI engineering agent designed to understand projects, edit files and automate software development.",
    },
    {
        title: "Lumora",
        status: "Preparing for Launch",
        description:
            "Premium e-commerce platform for home, kitchen, organization and outdoor living.",
    },
    {
        title: "Ryan Jewelry",
        status: "In Development",
        description:
            "Luxury jewelry commerce platform with premium shopping experience.",
    },
];

export default function Projects() {
    return (
        <>
            <section className="page-hero projects-hero">
                <div className="container">
                    <span>Projects</span>

                    <h1>
                        Building products that solve real business problems.
                    </h1>

                    <p>
                        Averon Technologies develops its own software ecosystem while
                        delivering professional digital solutions for businesses.
                    </p>
                </div>
            </section>

            <section className="featured-products">
                <div className="container">

                    <div className="section-heading">
                        <span>Featured Products</span>

                        <h2>Our technology ecosystem.</h2>
                    </div>

                    <div className="featured-grid">

                        {featuredProducts.map((project) => (

                            <article
                                className="featured-card"
                                key={project.title}
                            >

                                <span className="status">
                                    {project.status}
                                </span>

                                <h3>{project.title}</h3>

                                <p>{project.description}</p>

                                <button className="project-btn">
                                    View Product →
                                </button>

                            </article>

                        ))}

                    </div>

                </div>
            </section>

            <section className="client-project">

                <div className="container">

                    <div className="client-card">

                        <div>

                            <span>Completed Client Project</span>

                            <h2>Kita Clean Bavaria</h2>

                            <p>

                                Professional commercial cleaning company website
                                designed and developed by Averon Technologies.

                            </p>

                        </div>

                        <button className="btn-primary">

                            Visit Website

                        </button>

                    </div>

                </div>

            </section>

            <section className="roadmap">

                <div className="container">

                    <div className="section-heading">

                        <span>Roadmap</span>

                        <h2>What we're building next.</h2>

                    </div>

                    <div className="roadmap-grid">

                        <div>✔ Nexus AI</div>

                        <div>✔ Altrex Code</div>

                        <div>✔ Lumora</div>

                        <div>✔ Ryan Jewelry</div>

                        <div>⏳ Client Portal</div>

                        <div>⏳ Future Products</div>

                    </div>

                </div>

            </section>

            <section className="projects-bottom-cta">

                <div className="container projects-cta">

                    <div>

                        <span>Let's Build Together</span>

                        <h2>

                            Looking for a technology partner?

                        </h2>

                    </div>

                    <Link
                        to="/contact"
                        className="btn-primary"
                    >
                        Contact Averon
                    </Link>

                </div>

            </section>
        </>
    );
}