const products = [
    "Nexus AI",
    "Altrex",
    "Lumora",
    "Ryan Jewelry",
    "Owlchix",
];

export default function ProductEcosystem() {
    return (
        <section className="ecosystem">
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
                    {products.map((product) => (
                        <div className="ecosystem-card" key={product}>
                            <div className="ecosystem-dot" />
                            <h3>{product}</h3>
                            <p>Part of the Averon technology ecosystem.</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}