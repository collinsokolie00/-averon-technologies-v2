export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-grid">
                <div>
                    <h3>Averon Technologies</h3>
                    <p>Building AI products, digital platforms, and business technology systems.</p>
                </div>

                <div>
                    <h4>Company</h4>
                    <a href="#">Products</a>
                    <a href="#">Services</a>
                    <a href="#">Technology</a>
                    <a href="#">Projects</a>
                </div>

                <div>
                    <h4>Contact</h4>
                    <a href="mailto:hello@averontechnologies.com">hello@averontechnologies.com</a>
                    <a href="#">Start a Project</a>
                </div>
            </div>

            <div className="footer-bottom">
                © 2026 Averon Technologies. All rights reserved.
            </div>
        </footer>
    );
}