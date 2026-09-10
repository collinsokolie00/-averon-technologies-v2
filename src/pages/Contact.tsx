import { useState, type FormEvent } from "react";
import {
    Mail,
    MapPin,
    Phone,
} from "lucide-react";

import { submitQuote } from "../services/customerWorkflow";

export default function Contact() {
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus("");
        setError("");
        setIsSubmitting(true);

        const form = new FormData(event.currentTarget);

        try {
            await submitQuote({
                customerEmail: String(form.get("email") || ""),
                customerName: String(form.get("fullName") || ""),
                company: String(form.get("company") || ""),
                projectType: String(form.get("projectType") || "Project Consultation"),
                budget: String(form.get("budget") || "not-sure"),
                message: String(form.get("message") || ""),
            });
            event.currentTarget.reset();
            setStatus("Quote request submitted. Averon will review it in Admin.");
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to submit quote.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <section className="page-hero contact-hero">
                <div className="container">
                    <span className="contact-hero-eyebrow">Contact Averon</span>

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

                    </div>

                    <form
                        className="contact-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="contact-form-heading">
                            <span>Project Inquiry</span>
                            <h2>Tell us about your project.</h2>
                            <p>Share your project details and Averon will review your inquiry.</p>
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
                                    <option value="Website Development">Website Development</option>
                                    <option value="E-commerce Development">E-commerce Development</option>
                                    <option value="AI Solution">AI Solution</option>
                                    <option value="Business Automation">Business Automation</option>
                                    <option value="Product Engineering">Product Engineering</option>
                                    <option value="Maintenance and Support">Maintenance and Support</option>
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

                        <button
                            type="submit"
                            className="btn-primary contact-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Sending inquiry…" : "Send Project Inquiry"}
                        </button>

                        {status && <p className="form-alert success" role="status">{status}</p>}
                        {error && <p className="form-alert error" role="alert">{error}</p>}

                        <p className="contact-form-note">
                            Averon will use these details only to review and respond to your inquiry.
                        </p>
                    </form>
                </div>
            </section>
        </>
    );
}
