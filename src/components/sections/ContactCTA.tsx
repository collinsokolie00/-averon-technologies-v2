import { Link } from "react-router";

export default function ContactCTA() {
    return (
        <section className="contact-cta">
            <div className="container contact-box">
                <div>
                    <span>Work With Averon</span>
                    <h2>Have a project, product idea, or business system to build?</h2>
                    <p>
                        Let’s discuss your website, e-commerce platform, AI integration,
                        automation workflow, or custom software project.
                    </p>
                </div>

                <Link className="btn-primary" to="/contact?service=Project%20Consultation">Start a Project</Link>
            </div>
        </section>
    );
}
