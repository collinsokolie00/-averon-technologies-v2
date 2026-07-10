import ProductEcosystem from "../components/sections/ProductEcosystem";
import ServicesSection from "../components/sections/ServicesSection";
import TechnologySection from "../components/sections/TechnologySection";
import ProjectsSection from "../components/sections/ProjectsSection";
import BlogPreview from "../components/sections/BlogPreview";
import ContactCTA from "../components/sections/ContactCTA";

export default function Home() {
    return (
        <>
            <section id="home" className="hero">
                <div className="container hero-grid">
                    <div className="hero-content">
                        <span className="hero-badge">Future Technology Company</span>

                        <h1>Building intelligent digital products for tomorrow.</h1>

                        <p>
                            Averon Technologies develops AI platforms, business software,
                            modern websites and scalable digital products for companies
                            around the world.
                        </p>

                        <div className="hero-actions">
                            <a href="#products" className="btn-primary">
                                Explore Products
                            </a>

                            <a href="#services" className="btn-secondary">
                                Our Services
                            </a>
                        </div>
                    </div>

                    <div className="hero-preview">
                        <div className="preview-card">
                            <h3>Technology Ecosystem</h3>

                            <ul>
                                <li>Nexus AI</li>
                                <li>Altrex</li>
                                <li>Lumora</li>
                                <li>Ryan Jewelry</li>
                                <li>Owlchix</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <ProductEcosystem />
            <ServicesSection />
            <TechnologySection />
            <ProjectsSection />
            <BlogPreview />
            <ContactCTA />
        </>
    );
}