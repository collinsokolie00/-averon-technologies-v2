import { ExternalLink } from "lucide-react";

import { products } from "../../data/adminConfig";

export default function AdminProducts() {
  return (
    <div className="admin-page-stack">
      <section className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Products</p>
          <h2>Manage Averon product portfolio.</h2>
          <p>Current products are source-managed public content. A product collection is still required before admin editing can be launch-ready.</p>
        </div>
      </section>

      <section className="admin-product-grid">
        {products.map((product) => (
          <article className="admin-product-card" key={product.slug}>
            <div className="admin-product-visual">
              {product.logoUrl ? (
                <img src={product.logoUrl} alt={`${product.title} logo`} />
              ) : (
                <span>{product.logoPlaceholder}</span>
              )}
              <p>{product.screenshotPlaceholder}</p>
            </div>
            <div className="admin-product-body">
              <div className="admin-section-heading">
                <div>
                  <p className="admin-eyebrow">/{product.slug}</p>
                  <h3>{product.title}</h3>
                </div>
                <small className={`admin-status ${product.published ? "good" : "neutral"}`}>{product.status}</small>
              </div>
              <p>{product.shortDescription}</p>
              <div className="admin-chip-row">
                {product.technologyStack.map((tech) => (
                  <span key={tech}>{tech}</span>
                ))}
              </div>
              <dl className="admin-detail-grid">
                <div>
                  <dt>Development</dt>
                  <dd>{product.developmentStatus}</dd>
                </div>
                <div>
                  <dt>Featured</dt>
                  <dd>{product.featured ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Sort</dt>
                  <dd>{product.sortOrder}</dd>
                </div>
              </dl>
              <a className="admin-secondary-button" href={`/products/${product.slug}`}>
                <ExternalLink size={16} />
                View public page
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
