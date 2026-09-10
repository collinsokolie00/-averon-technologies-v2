import { Link, Navigate, useParams } from "react-router";
import { ArrowDownToLine, ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";

import { getProductDetail } from "../data/productContent";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const product = getProductDetail(slug);

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  return (
    <>
      <section className="product-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 21, 39, .92), rgba(7, 21, 39, .48)), url(${product.heroImage})` }}>
        <div className="container product-detail-hero-inner">
          <Link className="back-link" to="/products">
            <ArrowLeft size={17} />
            Products
          </Link>
          <span>{product.eyebrow}</span>
          <h1>{product.title}</h1>
          <p>{product.summary}</p>
          <strong>{product.status}</strong>
          {(product.websiteUrl || product.downloadUrl) && (
            <div className="product-detail-actions">
              {product.websiteUrl && (
                <a className="btn-primary" href={product.websiteUrl} target="_blank" rel="noreferrer">
                  Visit Website
                  <ExternalLink size={16} />
                </a>
              )}
              {product.downloadUrl && (
                <a className="btn-secondary" href={product.downloadUrl} target="_blank" rel="noreferrer">
                  Download
                  <ArrowDownToLine size={16} />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="product-story">
        <div className="container product-story-stack">
          {product.sections.map((section, index) => (
            <article className={index % 2 === 1 ? "product-story-row reverse" : "product-story-row"} key={section.title}>
              <img src={section.image} alt="" />
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="product-capabilities">
        <div className="container product-capabilities-inner">
          <div>
            <span>Capabilities</span>
            <h2>What {product.title} is prepared to do.</h2>
          </div>
          <div className="capability-grid">
            {product.capabilities.map((capability) => (
              <div key={capability}>
                <CheckCircle2 size={18} />
                {capability}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
