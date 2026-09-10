import ProductEcosystem from "../components/sections/ProductEcosystem";
import ServicesSection from "../components/sections/ServicesSection";
import TechnologySection from "../components/sections/TechnologySection";
import ProjectsSection from "../components/sections/ProjectsSection";
import BlogPreview from "../components/sections/BlogPreview";
import ContactCTA from "../components/sections/ContactCTA";
import { usePageContent } from "../content/pageContent";

export default function Home() {
    const { section } = usePageContent("home"); const hero = section("hero"); const cta = section("primaryCta");
    return (
        <>
            <section id="home" className="hero">
                <div className="container hero-grid">
                    <div className="hero-content">
                        <span className="hero-badge">Future Technology Company</span>

                        <h1>{hero.heading}</h1>

                        <p>
                            {hero.subheading}
                        </p>

                        <div className="hero-actions">
                            <a href="#products" className="btn-primary">
                                {cta.label}
                            </a>

                            <a href="#services" className="btn-secondary">
                                Our Services
                            </a>
                        </div>

                        <div className="hero-capabilities" aria-label="Core capabilities">
                            <span>AI &amp; automation</span>
                            <span>Product engineering</span>
                            <span>Secure digital platforms</span>
                        </div>
                    </div>

                    <div className="hero-media">
                        <img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1300&q=80" alt="" />
                        <div className="hero-media-card">
                            <span>Parent Company</span>
                            <strong>Averon ecosystem</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="homepage-banners">
                <div className="container banner-grid">
                    <div className="banner-card primary">
                        <span>Technology Services</span>
                        <h2>Websites, AI, automation, commerce, and product engineering under one premium technology company.</h2>
                        <a href="#services">Explore services →</a>
                    </div>
                    <div className="banner-card">
                        <span>Customer Portal</span>
                        <h3>Customer account foundations are prepared for contracts, deposits, and project access.</h3>
                    </div>
                    <div className="banner-card sky">
                        <span>Product Ecosystem</span>
                        <h3>Nexus AI, Altrex, Lumora, and Ryan Jewelry now connect to product detail pages.</h3>
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
