import { Link } from "react-router";

import { products } from "../data/adminConfig";

export default function Products() {
    const featuredProducts = products.slice(0, 3);
    const remainingProducts = products.slice(3);

    return (
        <>
            <section className="page-hero products-hero">
                <div className="container">
                    <span className="products-hero-eyebrow">Our Ecosystem</span>

                    <h1>Products built under Averon Technologies.</h1>

                    <p>
                        A growing ecosystem of artificial intelligence, software,
                        e-commerce, and digital products designed for long-term impact.
                    </p>

                    <div className="products-hero-actions">
                        <a href="#product-portfolio" className="btn-primary">
                            Explore products
                        </a>
                        <Link to="/contact?service=Product%20Consultation" className="btn-secondary">
                            Discuss a product
                        </Link>
                    </div>
                </div>
            </section>

            <section className="products-page" id="product-portfolio">
                <div className="container products-page-grid">
                    {featuredProducts.map((product, index) => (
                        <article
                            className={`product-showcase-card${index === 0 ? " product-showcase-card--featured" : ""}`}
                            key={product.slug}
                        >
                            <div className="product-card-top">
                                <span className="product-status">{product.status}</span>
                            </div>

                            {product.logoUrl ? (
                                <img className="product-logo" src={product.logoUrl} alt={`${product.title} logo`} />
                            ) : (
                                <div className="product-icon">
                                    {product.logoPlaceholder}
                                </div>
                            )}

                            <span className="product-category">{product.developmentStatus}</span>

                            <h2>{product.title}</h2>

                            <p>{product.longDescription}</p>

                            <div className="product-technologies">
                                {product.technologyStack.map((technology) => (
                                    <span key={technology}>{technology}</span>
                                ))}
                            </div>

                            <Link to={`/products/${product.slug}`} className="product-link">
                                View Product
                                <span aria-hidden="true">→</span>
                            </Link>
                        </article>
                    ))}

                    <article className="product-wide-banner">
                        <span>Product Ecosystem</span>
                        <h2>AI, commerce, operations, and client platforms connected under one technology company.</h2>
                        <Link to="/contact?service=Product%20Consultation">Plan a product with Averon →</Link>
                    </article>

                    {remainingProducts.map((product) => (
                        <article className="product-showcase-card" key={product.slug}>
                            <div className="product-card-top">
                                <span className="product-status">{product.status}</span>
                            </div>

                            {product.logoUrl ? (
                                <img className="product-logo" src={product.logoUrl} alt={`${product.title} logo`} />
                            ) : (
                                <div className="product-icon">
                                    {product.logoPlaceholder}
                                </div>
                            )}

                            <span className="product-category">{product.developmentStatus}</span>

                            <h2>{product.title}</h2>

                            <p>{product.longDescription}</p>

                            <div className="product-technologies">
                                {product.technologyStack.map((technology) => (
                                    <span key={technology}>{technology}</span>
                                ))}
                            </div>

                            <Link to={`/products/${product.slug}`} className="product-link">
                                View Product
                                <span aria-hidden="true">→</span>
                            </Link>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}
