const technologies = [
    "React",
    "TypeScript",
    "Vite",
    "Tailwind CSS",
    "Firebase",
    "Stripe",
    "OpenAI",
    "DeepSeek",
];

export default function TechnologySection() {
    return (
        <section className="technology">
            <div className="container">
                <div className="section-heading">
                    <span>Technology Stack</span>
                    <h2>Modern tools for scalable digital products.</h2>
                    <p>
                        Averon uses reliable frontend, backend, AI, payment and deployment
                        technologies to build fast, professional systems.
                    </p>
                </div>

                <div className="tech-grid">
                    {technologies.map((tech) => (
                        <div className="tech-pill" key={tech}>{tech}</div>
                    ))}
                </div>
            </div>
        </section>
    );
}