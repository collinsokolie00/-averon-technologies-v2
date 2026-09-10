import { useState } from "react";
import { NavLink } from "react-router";
import { UserRound } from "lucide-react";
import { averonBrandIdentity } from "../../data/brandIdentity";

const links = [
    { label: "Home", to: "/" },
    { label: "Products", to: "/products" },
    { label: "Services", to: "/services" },
    { label: "Technology", to: "/technology" },
    { label: "Blog", to: "/blog" },
    { label: "Contact", to: "/contact" },
];

export default function Header() {
    const [open, setOpen] = useState(false);

    return (
        <header className="header">
            <div className="container header-inner">
                <NavLink className="logo" to="/" onClick={() => setOpen(false)}>
                    <img src={averonBrandIdentity.logo} alt="" />
                    <span>{averonBrandIdentity.name}</span>
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

                <div className="header-actions">
                    <NavLink className="account-link" to="/client-portal" onClick={() => setOpen(false)}>
                        <UserRound size={16} />
                        Customer Portal
                    </NavLink>
                </div>

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
