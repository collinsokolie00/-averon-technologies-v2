import { GripVertical } from "lucide-react";

import { homepageBlocks } from "../../data/adminConfig";

export default function AdminHomepage() {
  return (
    <div className="admin-page-stack">
      <section className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Homepage manager</p>
          <h2>Review the public homepage content model.</h2>
          <p>Homepage content is currently managed in source files. Admin editing should wait for a dedicated content collection.</p>
        </div>
      </section>

      <section className="admin-editor-grid">
        <div className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Hero</p>
              <h3>Primary messaging source</h3>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>
              Hero text
              <input value="Technology products and premium digital systems for ambitious teams." readOnly />
            </label>
            <label>
              Supporting copy
              <textarea value="Averon builds AI products, storefronts, portals, and business automation with launch-ready engineering." readOnly />
            </label>
            <label>
              Primary button
              <input value="Start a project" readOnly />
            </label>
            <label>
              Secondary button
              <input value="Explore products" readOnly />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Publishing</p>
              <h3>Visibility status</h3>
            </div>
          </div>
          <div className="admin-toggle-list">
            {["Featured Products", "Featured Services", "Technology Preview", "Projects Preview", "Blog Preview", "CTA", "Homepage Banners"].map((item) => (
              <label className="admin-toggle" key={item}>
                <input type="checkbox" defaultChecked disabled />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Section order</p>
            <h3>Homepage blocks</h3>
          </div>
          <GripVertical size={20} />
        </div>
        <div className="admin-list">
          {homepageBlocks.map((block) => (
            <div className="admin-list-row" key={block.title}>
              <div>
                <strong>{block.title}</strong>
                <span>{block.detail}</span>
              </div>
              <small className="admin-status neutral">{block.status}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
