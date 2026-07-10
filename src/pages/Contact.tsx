import {
    Globe,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    Phone,
} from "lucide-react";

export default function Contact() {
    return (
        <>
            <section className="page-hero contact-hero">
                <div className="container">
                    <span>Contact Averon</span>

                    <h1>Let&apos;s build something exceptional together.</h1>

                    <p>
                        Whether you&apos;re planning a website, AI solution, e-commerce
                        platform, automation system, or custom software, we&apos;d love to
                        hear about your project.
                    </p>
                </div>
            </section>

            <section className="contact-section">
                <div className="container contact-grid">
                    <div className="contact-info">
                        <span className="contact-eyebrow">Start a Conversation</span>

                        <h2>Get in touch with Averon Technologies.</h2>

                        <p>
                            Tell us what you want to build, improve, automate, or launch. We
                            will review your request and respond with the most suitable next
                            step.
                        </p>

                        <div className="contact-details">
                            <a
                                className="info-item"
                                href="mailto:hello@averontechnologies.com"
                            >
                                <span className="info-icon">
                                    <Mail size={21} />
                                </span>

                                <span>
                                    <strong>Email</strong>
                                    <small>hello@averontechnologies.com</small>
                                </span>
                            </a>

                            <div className="info-item">
                                <span className="info-icon">
                                    <Phone size={21} />
                                </span>

                                <span>
                                    <strong>Phone</strong>
                                    <small>Coming soon</small>
                                </span>
                            </div>

                            <div className="info-item">
                                <span className="info-icon">
                                    <MapPin size={21} />
                                </span>

                                <span>
                                    <strong>Location</strong>
                                    <small>Italy · Serving clients internationally</small>
                                </span>
                            </div>
                        </div>

                        <div className="social-area">
                            <span>Connect with Averon</span>

                            <div className="social-row">
                                <a
                                    href="#"
                                    aria-label="Averon Technologies on LinkedIn"
                                    title="LinkedIn"
                                >
                                    <Linkedin size={20} />
                                </a>

                                <a
                                    href="#"
                                    aria-label="Averon Technologies on Instagram"
                                    title="Instagram"
                                >
                                    <Instagram size={20} />
                                </a>

                                <a
                                    href="#"
                                    aria-label="Averon Technologies website"
                                    title="Website"
                                >
                                    <Globe size={20} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <form
                        className="contact-form"
                        onSubmit={(event) => event.preventDefault()}
                    >
                        <div className="contact-form-heading">
                            <span>Project Inquiry</span>
                            <h2>Tell us about your project.</h2>
                            <p>
                                Complete the form below and we will contact you to discuss the
                                requirements.
                            </p>
                        </div>

                        <div className="contact-form-row">
                            <div className="input-group">
                                <label htmlFor="fullName">Full name</label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    placeholder="Your full name"
                                    autoComplete="name"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="company">Company</label>
                                <input
                                    id="company"
                                    name="company"
                                    type="text"
                                    placeholder="Company name"
                                    autoComplete="organization"
                                />
                            </div>
                        </div>

                        <div className="contact-form-row">
                            <div className="input-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="projectType">Project type</label>
                                <select
                                    id="projectType"
                                    name="projectType"
                                    defaultValue=""
                                    required
                                >
                                    <option value="" disabled>
                                        Select a service
                                    </option>
                                    <option value="website">Website Development</option>
                                    <option value="ecommerce">E-commerce Development</option>
                                    <option value="ai">AI Solution</option>
                                    <option value="automation">Business Automation</option>
                                    <option value="software">Custom Software</option>
                                    <option value="maintenance">Maintenance and Support</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="budget">Estimated budget</label>
                            <select id="budget" name="budget" defaultValue="">
                                <option value="" disabled>
                                    Select a budget range
                                </option>
                                <option value="under-1500">Under €1,500</option>
                                <option value="1500-3000">€1,500 – €3,000</option>
                                <option value="3000-6000">€3,000 – €6,000</option>
                                <option value="6000-10000">€6,000 – €10,000</option>
                                <option value="10000-plus">€10,000+</option>
                                <option value="not-sure">Not sure yet</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label htmlFor="message">Project details</label>
                            <textarea
                                id="message"
                                name="message"
                                rows={7}
                                placeholder="Tell us what you want to build, your goals, preferred timeline, and any important requirements."
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary contact-submit">
                            Send Inquiry
                        </button>

                        <p className="contact-form-note">
                            This form will be connected to Firebase during the backend phase.
                        </p>
                    </form>
                </div>
            </section>
        </>
    );
}