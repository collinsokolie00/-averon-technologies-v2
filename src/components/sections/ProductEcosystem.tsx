import { products } from "../../data/adminConfig";

export default function ProductEcosystem() {
    const topProducts = products.slice(0, 2);
    const bottomProducts = products.slice(2);

    return (
        <section id="products" className="ecosystem">
            <div className="container">
                <div className="section-heading">
                    <span>Product Ecosystem</span>
                    <h2>One company. Multiple digital products.</h2>
                    <p>
                        Averon Technologies is building a connected ecosystem of AI tools,
                        commerce platforms, brand experiences, and future software products.
                    </p>
                </div>

                <div className="ecosystem-grid">
                    {topProducts.map((product) => (
                        <div className="ecosystem-card" key={product.slug}>
                            {product.logoUrl ? (
                                <img className="ecosystem-logo" src={product.logoUrl} alt={`${product.title} logo`} />
                            ) : (
                                <div className="ecosystem-dot">{product.logoPlaceholder}</div>
                            )}
                            <h3>{product.title}</h3>
                            <p>{product.shortDescription}</p>
                        </div>
                    ))}

                    <div className="ecosystem-wide-banner">
                        <span>Averon Technology Layer</span>
                        <h3>Every product is built to connect brand experience, customer workflow, payment readiness, and future AI support.</h3>
                    </div>

                    {bottomProducts.map((product) => (
                        <div className="ecosystem-card" key={product.slug}>
                            {product.logoUrl ? (
                                <img className="ecosystem-logo" src={product.logoUrl} alt={`${product.title} logo`} />
                            ) : (
                                <div className="ecosystem-dot">{product.logoPlaceholder}</div>
                            )}
                            <h3>{product.title}</h3>
                            <p>{product.shortDescription}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
