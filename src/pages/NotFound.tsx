import { Link } from "react-router";

export default function NotFound() {
    return (
        <section className="page-hero">
            <div className="container">
                <span>Error 404</span>
                <h1>This page could not be found.</h1>
                <Link className="btn-primary" to="/">
                    Return Home
                </Link>
            </div>
        </section>
    );
}