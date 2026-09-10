import { Link } from "react-router";
import { Instagram, Mail } from "lucide-react";
import { averonBrandIdentity } from "../../data/brandIdentity";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-grid">
                <div className="footer-brand">
                    <img src={averonBrandIdentity.logo} alt={`${averonBrandIdentity.name} logo`} />
                    <h3>{averonBrandIdentity.name}</h3>
                    <p>Building AI products, digital platforms, and business technology systems.</p>
                    <div className="footer-socials" aria-label="Averon social links">
                        <a href="mailto:hello@averontechnologies.com" aria-label="Email Averon Technologies" title="Email">
                            <Mail size={18} />
                        </a>
                        <a href="https://x.com/" aria-label="Averon Technologies on X" title="X">
                            <span className="footer-x-icon">X</span>
                        </a>
                        <a href="https://instagram.com/" aria-label="Averon Technologies on Instagram" title="Instagram">
                            <Instagram size={18} />
                        </a>
                    </div>
                </div>

                <div>
                    <h4>Company</h4>
                    <Link to="/products">Products</Link>
                    <Link to="/services">Services</Link>
                    <Link to="/technology">Technology</Link>
                </div>

                <div>
                    <h4>Contact</h4>
                    <a href="mailto:hello@averontechnologies.com">hello@averontechnologies.com</a>
                    <Link to="/contact?service=Project%20Consultation">Start a Project</Link>
                </div>
            </div>

            <div className="footer-bottom">
                © 2026 Averon Technologies. All rights reserved.
            </div>
        </footer>
    );
}
