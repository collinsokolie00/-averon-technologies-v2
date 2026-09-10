import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CircleDollarSign, FileText, Inbox, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";

import {
  type AuditLogRecord,
  type ContractRecord,
  type InvoiceRecord,
  type MessageRecord,
  type PaymentRecord,
  type QuoteRecord,
  type UserProfileRecord,
} from "../../services/customerWorkflow";
import { averonApi } from "../../lib/averonApi";

type AdminCollections = {
  users: UserProfileRecord[];
  quotes: QuoteRecord[];
  contracts: ContractRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  messages: MessageRecord[];
  auditLogs: AuditLogRecord[];
};

const emptyCollections: AdminCollections = {
  users: [],
  quotes: [],
  contracts: [],
  invoices: [],
  payments: [],
  messages: [],
  auditLogs: [],
};

export default function AdminDashboard() {
  const [collections, setCollections] = useState<AdminCollections>(emptyCollections);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const names = Object.keys(emptyCollections) as Array<keyof AdminCollections>;
    Promise.all(names.map(async (name) => [name, (await averonApi.business.list(name)).data.items] as const))
      .then((entries) => { if (active) setCollections(Object.fromEntries(entries) as unknown as AdminCollections); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  function handleRetry() {
    setLoading(true);
    setError("");
    setRefreshKey((key) => key + 1);
  }

  const metrics = useMemo(
    () => [
      { label: "Customers", value: collections.users.length, detail: "Firebase user profiles", tone: "neutral", icon: UsersRound },
      { label: "Quote Requests", value: collections.quotes.length, detail: `${collections.quotes.filter((quote) => quote.status === "pending").length} pending`, tone: "warn", icon: FileText },
      { label: "Unread Messages", value: collections.messages.filter((message) => message.status !== "read").length, detail: "Firestore messages", tone: "warn", icon: Inbox },
      { label: "Contracts", value: collections.contracts.length, detail: `${collections.contracts.filter((contract) => contract.status === "signed").length} signed`, tone: "neutral", icon: ShieldCheck },
      { label: "Invoices", value: collections.invoices.length, detail: `${collections.invoices.filter((invoice) => invoice.status === "paid").length} paid`, tone: "neutral", icon: CircleDollarSign },
      { label: "Payments", value: collections.payments.length, detail: `${collections.payments.filter((payment) => payment.status === "paid").length} paid`, tone: "neutral", icon: CircleDollarSign },
    ],
    [collections],
  );

  const recentActivity = collections.auditLogs.slice(0, 6);

  return (
    <div className="admin-page-stack">
      <section className="admin-hero compact">
        <div>
          <p className="admin-eyebrow">Command center</p>
          <h2>Real-time Averon operations.</h2>
          <p>Dashboard counts come from Firestore collections supported by the current application: users, quotes, messages, contracts, invoices, payments, and audit logs.</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={handleRetry}>
          <RefreshCw size={18} />
          Retry
        </button>
      </section>

      {loading && <p className="admin-state-panel">Loading live admin data...</p>}
      {error && <p className="admin-form-error">Firestore rejected the admin query: {error}</p>}

      <section className="admin-metric-grid">
        {metrics.map((metric) => (
          <article className="admin-card metric" key={metric.label}>
            <metric.icon size={19} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small className={`admin-tone ${metric.tone}`}>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-two-column">
        <div className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Recent activity</p>
              <h3>Audit log</h3>
            </div>
            <ArrowUpRight size={20} />
          </div>
          {recentActivity.length > 0 ? (
            <div className="admin-list">
              {recentActivity.map((activity) => (
                <div className="admin-list-row" key={activity.id}>
                  <div>
                    <strong>{activity.action}</strong>
                    <span>{activity.detail || activity.targetCollection || "Admin event"}</span>
                  </div>
                  <small className="admin-status neutral">{activity.actorEmail || "system"}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty-state">No activity recorded yet.</p>
          )}
        </div>

        <div className="admin-panel accent">
          <CircleDollarSign size={24} />
          <h3>Payments are partially connected.</h3>
          <p>Firestore payment records are visible here. Stripe webhook reconciliation still needs a server-side endpoint before payments can be considered fully launch-ready.</p>
        </div>
      </section>
    </div>
  );
}
