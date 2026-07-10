import { useState } from "react";
import { NavLink } from "react-router";

const links = [
    { label: "Home", to: "/" },
    { label: "Products", to: "/products" },
    { label: "Services", to: "/services" },
    { label: "Technology", to: "/technology" },
    { label: "Projects", to: "/projects" },
    { label: "Blog", to: "/blog" },
    { label: "Contact", to: "/contact" },
];

export default function Header() {
    const [open, setOpen] = useState(false);

    return (
        <header className="header">
            <div className="container header-inner">
                <NavLink className="logo" to="/" onClick={() => setOpen(false)}>
                    Averon Technologies
                </NavLink>

                <nav className={open ? "nav open" : "nav"}>
                    {links.map((link) => (
                        <NavLink
                            key={link.label}
                            to={link.to}
                            end={link.to === "/"}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) => (isActive ? "active" : undefined)}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <button
                    type="button"
                    className="menu-btn"
                    aria-label={open ? "Close navigation" : "Open navigation"}
                    aria-expanded={open}
                    onClick={() => setOpen((current) => !current)}
                >
                    {open ? "×" : "☰"}
                </button>
            </div>
        </header>
    );
}