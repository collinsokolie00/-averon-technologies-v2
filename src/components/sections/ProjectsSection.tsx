const projects = [
    "Nexus AI",
    "Altrex Code",
    "Lumora",
    "Ryan Jewelry",
    "Kita Clean Bavaria",
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
                        <article className="project-card" key={project}>
                            <span>Product / Project</span>
                            <h3>{project}</h3>
                            <p>
                                Built as part of the Averon ecosystem with long-term quality,
                                scalability and professional execution in mind.
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}