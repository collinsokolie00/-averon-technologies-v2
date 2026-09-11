import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, ShieldAlert } from "lucide-react";

import type { AdminRow, AdminSection, AdminTone } from "../../data/adminConfig";
import {
  assignContract,
  listFirebaseCustomers,
  markMessageRead,
  updateQuoteReply,
  type AuditLogRecord,
  type ContractRecord,
  type InvoiceRecord,
  type MessageRecord,
  type NotificationRecord,
  type PaymentRecord,
  type QuoteRecord,
  type UserProfileRecord,
  type WorkflowStatus,
} from "../../services/customerWorkflow";
import { averonApi } from "../../lib/averonApi";

type LiveRecord =
  | QuoteRecord
  | UserProfileRecord
  | ContractRecord
  | InvoiceRecord
  | PaymentRecord
  | MessageRecord
  | NotificationRecord
  | AuditLogRecord;

function fieldValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function toRows(section: AdminSection, records: LiveRecord[]): AdminRow[] {
  return records.map((record) => {
    const data = record as unknown as Record<string, unknown>;
    const id = fieldValue(data, "id") || fieldValue(data, "uid");
    const status = fieldValue(data, "status") || fieldValue(data, "role") || "active";
    const tone: AdminTone = status === "paid" || status === "signed" || status === "read" ? "good" : status === "pending" || status === "unread" ? "warn" : "neutral";

    if (section.key === "quotes") {
      return {
        id,
        title: fieldValue(data, "projectType") || "Quote request",
        subtitle: `${fieldValue(data, "customerName") || "Customer"} · ${fieldValue(data, "company") || "No company"} · ${fieldValue(data, "budget") || "No budget"}`,
        status,
        meta: fieldValue(data, "customerEmail"),
        tone,
      };
    }

    if (section.key === "customers") {
      return {
        id,
        title: fieldValue(data, "name") || fieldValue(data, "email") || "Customer",
        subtitle: fieldValue(data, "company") || "No company recorded",
        status,
        meta: fieldValue(data, "email"),
        tone,
      };
    }

    if (section.key === "contracts") {
      return {
        id,
        title: fieldValue(data, "title") || "Contract",
        subtitle: `${fieldValue(data, "customerName") || "Customer"} · ${fieldValue(data, "projectReference") || "No reference"}`,
        status,
        meta: fieldValue(data, "workspaceAccess") === "true" ? "Workspace active" : "Workspace inactive",
        tone,
      };
    }

    if (section.key === "invoices" || section.key === "payments") {
      const amount = Number(data.amountCents ?? 0) / 100;
      return {
        id,
        title: fieldValue(data, "title") || fieldValue(data, "projectReference") || section.title,
        subtitle: fieldValue(data, "projectReference") || fieldValue(data, "invoiceId") || "No reference",
        status,
        meta: `${fieldValue(data, "currency").toUpperCase() || "EUR"} ${amount.toLocaleString()}`,
        tone,
      };
    }

    if (section.key === "messages") {
      return {
        id,
        title: fieldValue(data, "subject") || "Customer message",
        subtitle: fieldValue(data, "body") || "No message body",
        status,
        meta: fieldValue(data, "senderRole"),
        tone,
      };
    }

    if (section.key === "security") {
      return {
        id,
        title: fieldValue(data, "action") || "Admin activity",
        subtitle: fieldValue(data, "detail") || fieldValue(data, "targetCollection") || "Audit event",
        status: fieldValue(data, "actorEmail") || "system",
        meta: fieldValue(data, "targetId"),
        tone: "neutral",
      };
    }

    return {
      id,
      title: fieldValue(data, "title") || section.title,
      subtitle: fieldValue(data, "body") || "Firestore record",
      status,
      meta: id,
      tone,
    };
  });
}

export default function ManagerPage({ section }: { section: AdminSection }) {
  const [records, setRecords] = useState<LiveRecord[]>([]);
  const [customers, setCustomers] = useState<UserProfileRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(section.collection));
  const [error, setError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [contractTitle, setContractTitle] = useState("Digital Platform Agreement");
  const [contractScope, setContractScope] = useState("");
  const [depositAmount, setDepositAmount] = useState("25000");
  const [workspaceAccess, setWorkspaceAccess] = useState(false);

  useEffect(() => {
    if (!section.collection) {
      return;
    }

    let active = true;
    averonApi.business.list(section.collection).then((response) => {
      if (active) setRecords(response.data.items as unknown as LiveRecord[]);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Unable to load records.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section.collection, refreshKey]);

  useEffect(() => {
    if (section.key !== "contracts") return;

    void listFirebaseCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, [section.key, refreshKey]);

  const rows = useMemo(() => toRows(section, records), [records, section]);

  async function handleQuoteReply(quoteId: string, status: WorkflowStatus) {
    const reply = window.prompt("Reply to customer", "Thank you. Averon has reviewed your quote request.");
    if (reply === null) return;
    await updateQuoteReply(quoteId, status, reply);
    setAdminMessage("Quote updated in Firestore.");
    setRefreshKey(key => key + 1);
  }

  async function handleIssueQuote(id: string) {
    const adminReply = window.prompt("Commercial offer: scope, delivery terms, and conditions");
    if (!adminReply) return;
    const amount = window.prompt("Total quote amount in EUR");
    if (amount === null) return;
    try { await averonApi.business.issueQuote(id, {adminReply,amountCents:Math.round(Number(amount)*100),currency:"eur"}); setAdminMessage("Commercial quote issued."); setRefreshKey(key=>key+1); }
    catch (caught) { setAdminMessage(caught instanceof Error ? caught.message : "Quote could not be issued."); }
  }

  async function handleMessageReply(id: string) {
    const body = window.prompt("Reply to customer"); if (!body) return;
    try { await averonApi.business.replyToMessage(id,body); setAdminMessage("Reply sent."); setRefreshKey(key=>key+1); }
    catch (caught) { setAdminMessage(caught instanceof Error ? caught.message : "Reply failed."); }
  }

  async function handleAssignContract() {
    const customer = customers.find((item) => item.uid === selectedCustomerId);
    if (!customer) {
      setAdminMessage("Select a Firebase customer first.");
      return;
    }

    await assignContract({
      customerId: customer.uid,
      customerEmail: customer.email,
      customerName: customer.name,
      title: contractTitle,
      scope: contractScope,
      depositAmountCents: Math.round(Number(depositAmount || "0") * 100),
      currency: "eur",
      workspaceAccess,
    });
    setAdminMessage("Contract and deposit invoice assigned in Firestore.");
  }

  async function handleMarkRead(messageId: string) {
    await markMessageRead(messageId);
    setAdminMessage("Message marked read.");
  }

  function handleRetry() {
    setRecords([]);
    setError("");
    setAdminMessage("");
    setLoading(Boolean(section.collection));
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-page-header">
        <div>
          <p className="admin-eyebrow">{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        {section.collection && (
          <button className="admin-secondary-button" type="button" onClick={handleRetry}>
            <RefreshCw size={17} />
            Retry
          </button>
        )}
      </section>

      {adminMessage && <p className="form-alert success">{adminMessage}</p>}
      {loading && <p className="admin-state-panel">Loading {section.label.toLowerCase()}...</p>}
      {error && <p className="admin-form-error">Firestore rejected this request: {error}</p>}

      {!section.collection && (
        <section className="admin-panel muted">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Blocked by missing backend</p>
              <h3>{section.label} is not launch-connected yet</h3>
            </div>
            <ShieldAlert size={22} />
          </div>
          <p>{section.emptyState} This page no longer shows fabricated records or inactive action buttons.</p>
        </section>
      )}

      {section.key === "contracts" && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Firestore assignment</p>
              <h3>Assign customer contract</h3>
            </div>
            <Save size={20} />
          </div>
          <div className="admin-form-grid">
            <label>
              Firebase customer
              <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option value={customer.uid} key={customer.uid}>{customer.name} · {customer.email}</option>
                ))}
              </select>
            </label>
            <label>
              Contract title
              <input value={contractTitle} onChange={(event) => setContractTitle(event.target.value)} />
            </label>
            <label>
              Deposit amount EUR
              <input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} inputMode="decimal" />
            </label>
            <label>Contract scope and terms<textarea value={contractScope} onChange={event=>setContractScope(event.target.value)} maxLength={10000} required /></label>
            <label className="admin-checkbox-row">
              <input type="checkbox" checked={workspaceAccess} onChange={(event) => setWorkspaceAccess(event.target.checked)} />
              Workspace access active
            </label>
          </div>
          <button className="admin-primary-button" type="button" onClick={handleAssignContract}>
            <Plus size={17} />
            Assign contract and invoice
          </button>
        </section>
      )}

      {section.collection && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Live records</p>
              <h3>{section.title}</h3>
            </div>
            <section.icon size={22} />
          </div>
          {rows.length > 0 ? (
            <div className="admin-list">
              {rows.map((row) => (
                <div className="admin-list-row" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <div className="admin-row-end">
                    <small className={`admin-status ${row.tone}`}>{row.status}</small>
                    {row.meta && <b>{row.meta}</b>}
                    {section.key === "quotes" && (
                      <button className="admin-secondary-button" type="button" onClick={() => void handleQuoteReply(row.id, "replied")}>
                        Reply
                      </button>
                    )}
                    {section.key === "quotes" && !["accepted","rejected","cancelled"].includes(row.status) && <button className="admin-secondary-button" type="button" onClick={()=>void handleIssueQuote(row.id)}>Issue commercial quote</button>}
                    {section.key === "messages" && row.meta === "customer" && <button className="admin-secondary-button" type="button" onClick={()=>void handleMessageReply(row.id)}>Reply</button>}
                    {section.key === "messages" && row.status !== "read" && (
                      <button className="admin-secondary-button" type="button" onClick={() => void handleMarkRead(row.id)}>
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && <p className="admin-empty-state">{section.emptyState}</p>
          )}
        </section>
      )}

      <section className="admin-panel muted">
        <h3>Launch status: {section.launchStatus}</h3>
        <p>Admin write access depends on Firebase custom claims matching the deployed Firestore rules.</p>
      </section>
    </div>
  );
}
