import { Link } from "react-router";

const projects = [
    { title: "Nexus AI", slug: "nexus-ai", logoUrl: "/brand/nexus-ai-logo.png" },
    { title: "Altrex", slug: "altrex", logoUrl: "/brand/altrex-logo.png" },
    { title: "Lumora", slug: "lumora", logoUrl: "/brand/lumora-logo.png" },
    { title: "Ryan Jewelry", slug: "ryan-jewelry", logoUrl: "/brand/ryan-jewelry-logo.png" },
    { title: "Kita Clean Bavaria", slug: "kita-clean-bavaria", logoUrl: "/brand/kita-clean-bavaria-logo.jpeg" },
];

export default function ProjectsSection() {
    return (
        <section className="projects">
            <div className="container">
                <div className="section-heading">
                    <span>Selected Projects</span>
                    <h2>Real products, platforms, and business systems.</h2>
                    <p>
                        Averon Technologies is built around real software products and
                        client-facing digital solutions.
                    </p>
                </div>

                <div className="projects-grid">
                    {projects.map((project) => (
                        <article className="project-card" key={project.title}>
                            <img className="project-card-logo" src={project.logoUrl} alt={`${project.title} logo`} />
                            <span>Product / Project</span>
                            <h3>{project.title}</h3>
                            <p>
                                Built as part of the Averon ecosystem with long-term quality,
                                scalability and professional execution in mind.
                            </p>
                            <Link className="project-btn" to={`/products/${project.slug}`}>View Product →</Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
