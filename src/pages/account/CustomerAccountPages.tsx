import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router";
import { CheckCircle2, CreditCard, ExternalLink, LockKeyhole, LogOut, PenLine, UnlockKeyhole } from "lucide-react";

import { useCustomerAuth } from "../../contexts/useCustomerAuth";
import { accountSections, contractSteps } from "../../data/customerMock";
import { averonApi } from "../../lib/averonApi";
import type { CustomerPortalData, CustomerPortalRecord } from "@averon/api-client";
import { createDepositCheckoutSession, stripeFrontendReady } from "../../lib/stripe";
import {
  signContract,
  subscribeCustomerContracts,
  subscribeCustomerInvoices,
  subscribeCustomerPayments,
  type ContractRecord,
  type InvoiceRecord,
  type PaymentRecord,
} from "../../services/customerWorkflow";

function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useCustomerAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <section className="account-shell">
      <aside className="account-sidebar">
        <div className="account-brand">
          <span>A</span>
          <div>
            <strong>Averon Account</strong>
            <small>{user?.company}</small>
          </div>
        </div>
        <nav className="account-nav" aria-label="Customer account">
          {accountSections.map((section) => {
            const to = section.path ? `/account/${section.path}` : "/account";
            return (
              <NavLink key={section.label} to={to} end={to === "/account"}>
                <section.icon size={16} />
                {section.label}
              </NavLink>
            );
          })}
        </nav>
        <button className="account-logout" type="button" onClick={handleLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <div className="account-main">{children}</div>
    </section>
  );
}

export function AccountDashboard() {
  const { user } = useCustomerAuth();
  const { data, loading, error } = usePortalData();
  const latest = (items: CustomerPortalRecord[]) => items[0];
  const projectsReady = data?.contracts.some((item) => item.status === "signed" && item.workspaceAccess === true && data.invoices.some((invoice) => invoice.contractId === item.id && invoice.isDeposit === true && invoice.status === "paid")) ?? false;

  return (
    <AccountShell>
      <div className="account-hero">
        <p className="section-kicker">Customer dashboard</p>
        <h1>Welcome back, {user?.name}.</h1>
        <p>Your authoritative quote, contract, invoice, message, and project-readiness status in one place.</p>
        <div className="account-actions">
          <Link className="btn-primary" to="/account/contracts">Review contract</Link>
        </div>
      </div>

      {loading ? <div className="account-panel"><p>Loading your account overview...</p></div> : error ? <div className="account-panel"><p role="alert" className="form-alert error">{error}</p></div> : <div className="account-stat-grid">
        <StatusCard label="Latest quote" item={latest(data?.quotes ?? [])} empty="No quote available" />
        <StatusCard label="Contract" item={latest(data?.contracts ?? [])} empty="No contract assigned" />
        <StatusCard label="Invoice" item={latest(data?.invoices ?? [])} empty="No invoice issued" />
        <article className="account-card"><span>Workspace</span><strong>{projectsReady ? "Eligible" : "Not ready"}</strong><small>Requires the existing signed-contract, deposit, and admin-access conditions.</small></article>
      </div>}

      <div className="account-grid">
        <article className="account-panel">
          <h2>Recent account activity</h2>
          {(data?.notifications ?? []).slice(0, 4).map((item) => <div className="workflow-row" key={item.id}><CheckCircle2 size={16}/><span>{String(item.title ?? "Averon update")}</span></div>)}
          {!loading && !error && !(data?.notifications.length) && <p>No notifications yet.</p>}
        </article>
        <article className="account-panel accent">
          <h2>Project access</h2>
          <p>Private project access opens after the contract is signed and the mandatory deposit is paid.</p>
          <Link className="btn-secondary" to="/account/contracts">Check unlock status</Link>
        </article>
      </div>
    </AccountShell>
  );
}

function StatusCard({ label, item, empty }: { label: string; item?: CustomerPortalRecord; empty: string }) {
  return <article className="account-card"><span>{label}</span><strong>{item ? String(item.status ?? "Available") : empty}</strong><small>{item ? String(item.projectReference ?? item.projectType ?? item.title ?? item.id) : "Nothing requires your attention."}</small></article>;
}

function usePortalData() {
  const [data, setData] = useState<CustomerPortalData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const reload = useCallback(async () => { setLoading(true); setError(""); try { setData((await averonApi.customer.portal()).data); } catch (caught) { setError(caught instanceof Error ? caught.message : "Your account could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { void Promise.resolve().then(reload); }, [reload]); return { data, loading, error, reload };
}

export function AccountSectionPage() {
  const { section = "" } = useParams();
  const { user } = useCustomerAuth();
  const current = accountSections.find((item) => item.path === section) ?? accountSections[0];
  const { data, loading, error, reload } = usePortalData();

  if (section === "contracts") {
    return <ContractsPage />;
  }

  if (section === "payments") return <AccountShell><div className="account-page-header"><p className="section-kicker">Payments</p><h1>Payment history</h1><p>Payment and deposit handling remains unchanged.</p></div><div className="account-panel"><p>Use the existing contract workflow to view deposit status and open Stripe Checkout.</p><Link className="btn-secondary" to="/account/contracts">View contract and deposit</Link></div></AccountShell>;

  const records = section === "quotes" ? data?.quotes : section === "invoices" ? data?.invoices : section === "messages" ? data?.messages : section === "notifications" ? data?.notifications : [];
  const empty = section === "quotes" ? "No quotes are available yet." : section === "invoices" ? "No invoices have been issued yet." : section === "messages" ? "No messages yet." : "No notifications yet.";

  return (
    <AccountShell>
      <div className="account-page-header">
        <p className="section-kicker">{current.label}</p>
        <h1>{current.title}</h1>
        <p>{current.description}</p>
      </div>

      {section === "security" ? <SecurityPanel verified={Boolean(user?.emailVerified)} email={user?.email ?? ""} /> : section === "profile" ? <ProfileForm data={data} loading={loading} error={error} onSaved={reload} /> : section === "settings" ? <SettingsForm data={data} loading={loading} error={error} onSaved={reload} /> : <RecordList section={section} records={records ?? []} loading={loading} error={error} empty={empty} onRefresh={reload} />}
      {section === "messages" && <MessageForm onSent={reload} />}
    </AccountShell>
  );
}

function RecordList({ section, records, loading, error, empty, onRefresh }: { section: string; records: CustomerPortalRecord[]; loading: boolean; error: string; empty: string; onRefresh: () => Promise<void> }) {
  const [decisionError, setDecisionError] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = async (record: CustomerPortalRecord, decision: "accepted" | "rejected") => {
    setBusy(true); setDecisionError("");
    try { await averonApi.business.decideQuote(record.id,decision,Number(record.revision)); await onRefresh(); }
    catch (caught) { setDecisionError(caught instanceof Error ? caught.message : "Quote decision failed."); }
    finally { setBusy(false); }
  };
  if (section === "quotes") return <div className="account-panel">{decisionError && <p role="alert">{decisionError}</p>}{loading ? <p>Loading quotes...</p> : error ? <p role="alert">{error}</p> : records.length ? records.map(record=><article className="account-list-row" key={record.id}><div><h2>{String(record.projectType)}</h2><p>{String(record.message ?? "")}</p><p style={{whiteSpace:"pre-wrap"}}>{String(record.adminReply ?? "Awaiting Averon offer")}</p>{typeof record.amountCents === "number" && <p>{String(record.currency).toUpperCase()} {(record.amountCents/100).toFixed(2)}</p>}<p>Status: {String(record.status)} · Revision: {String(record.revision ?? "—")}</p>{record.status === "approved" && typeof record.amountCents === "number" && <><button disabled={busy} onClick={()=>void decide(record,"accepted")}>Accept quote</button><button disabled={busy} onClick={()=>void decide(record,"rejected")}>Reject quote</button></>}</div></article>) : <p>{empty}</p>}</div>;
  const markRead = async (record: CustomerPortalRecord) => { if (record.status !== "unread") return; if (section === "notifications") await averonApi.business.markNotificationRead(record.id); else if (section === "messages") await averonApi.customer.markMessageRead(record.id); await onRefresh(); };
  return <div className="account-panel">{loading ? <p>Loading {section}...</p> : error ? <p role="alert" className="form-alert error">{error}</p> : records.length ? records.map((record) => <div className="account-list-row" key={record.id}><div><strong>{String(record.title ?? record.subject ?? record.projectType ?? record.id)}</strong><span>{String(record.projectReference ?? record.id)}</span>{record.body ? <p>{String(record.body)}</p> : null}{section === "invoices" && typeof record.amountCents === "number" ? <p>{new Intl.NumberFormat(undefined, { style: "currency", currency: String(record.currency ?? "eur").toUpperCase() }).format(record.amountCents / 100)}</p> : null}</div><small>{String(record.status ?? "available")}</small>{record.status === "unread" && <button type="button" className="btn-secondary" onClick={() => void markRead(record)}>Mark read</button>}</div>) : <p>{empty}</p>}</div>;
}

function ProfileForm({ data, loading, error, onSaved }: { data: CustomerPortalData | null; loading: boolean; error: string; onSaved: () => Promise<void> }) {
  const profile = data?.profile; const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); await averonApi.customer.updateProfile({ name: String(form.get("name") ?? ""), company: String(form.get("company") ?? ""), phone: String(form.get("phone") ?? "") }); setNotice("Profile saved."); await onSaved(); };
  if (loading) return <div className="account-panel"><p>Loading profile...</p></div>; if (error) return <div className="account-panel"><p role="alert" className="form-alert error">{error}</p></div>;
  return <form className="settings-form" onSubmit={(event) => void submit(event)}><label>Display name<input name="name" defaultValue={String(profile?.name ?? "")} required /></label><label>Company<input name="company" defaultValue={String(profile?.company ?? "")} /></label><label>Email<input value={String(profile?.email ?? "")} disabled aria-describedby="email-help" /></label><small id="email-help">Email changes are managed through your authenticated Firebase account.</small><label>Phone<input name="phone" defaultValue={String(profile?.phone ?? "")} /></label><button className="btn-primary">Save profile</button>{notice && <p role="status">{notice}</p>}</form>;
}

function SettingsForm({ data, loading, error, onSaved }: { data: CustomerPortalData | null; loading: boolean; error: string; onSaved: () => Promise<void> }) {
  const profile = data?.profile; const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); await averonApi.customer.updateProfile({ notificationPreference: String(form.get("notifications")) as "important" | "all" | "weekly", communicationPreference: String(form.get("communication")) as "email" | "portal" }); setNotice("Preferences saved."); await onSaved(); };
  if (loading) return <div className="account-panel"><p>Loading preferences...</p></div>; if (error) return <div className="account-panel"><p role="alert" className="form-alert error">{error}</p></div>;
  return <form className="settings-form" onSubmit={(event) => void submit(event)}><label>Notification preference<select name="notifications" defaultValue={String(profile?.notificationPreference ?? "important")}><option value="important">Important updates only</option><option value="all">All project updates</option><option value="weekly">Weekly digest</option></select></label><label>Preferred communication<select name="communication" defaultValue={String(profile?.communicationPreference ?? "email")}><option value="email">Email</option><option value="portal">Portal</option></select></label><button className="btn-primary">Save preferences</button>{notice && <p role="status">{notice}</p>}</form>;
}

function SecurityPanel({ verified, email }: { verified: boolean; email: string }) { return <div className="account-grid three"><article className="account-card"><CheckCircle2 size={20}/><strong>Email verification</strong><small>{verified ? "Verified" : "Not verified"}</small></article><article className="account-card"><LockKeyhole size={20}/><strong>Password access</strong><small>Managed by Firebase Authentication.</small><Link to="/forgot-password">Reset password</Link></article><article className="account-card"><UnlockKeyhole size={20}/><strong>Signed-in account</strong><small>{email || "Authenticated customer"}</small></article></div>; }

function MessageForm({ onSent }: { onSent: () => Promise<void> }) { const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true); try { await averonApi.customer.sendMessage({ subject: String(values.get("subject") ?? ""), body: String(values.get("body") ?? "") }); form.reset(); setNotice("Message sent."); await onSent(); } finally { setBusy(false); } }; return <form className="settings-form" onSubmit={(event) => void submit(event)}><label>Subject<input name="subject" maxLength={160} required /></label><label>Message<textarea name="body" maxLength={4000} required /></label><button className="btn-primary" disabled={busy}>{busy ? "Sending..." : "Send message"}</button>{notice && <p role="status">{notice}</p>}</form>; }

export function ContractsPage() {
  const { user } = useCustomerAuth();
  const customerId = user?.id ?? "";
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [typedSignature, setTypedSignature] = useState(user?.name ?? "");
  const [paymentError, setPaymentError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const contract = contracts[0];
  const invoice = contract ? invoices.find((item) => item.contractId === contract.id && item.isDeposit) : undefined;
  const payment = invoice ? payments.find((item) => item.invoiceId === invoice.id && item.status === "paid") : undefined;
  const contractAssigned = Boolean(contract);
  const contractSigned = contract?.status === "signed" && Boolean(contract.signedAt);
  const depositPaid = Boolean(payment || invoice?.status === "paid");
  const workspaceUnlocked = Boolean(contractAssigned && contractSigned && depositPaid && contract?.workspaceAccess);
  const steps = contractSteps.map((step, index) => ({
    ...step,
    title: index === 4 ? "Typed-name acceptance" : step.title,
    complete: (index < 3 && contractSigned) || (index === 3 && depositPaid) || (index === 4 && contractSigned),
    locked: !contractAssigned || (index === 3 && !invoice),
  }));

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      subscribeCustomerContracts(customerId, setContracts),
      subscribeCustomerInvoices(customerId, setInvoices),
      subscribeCustomerPayments(customerId, setPayments),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [customerId, user]);

  async function handleDepositCheckout() {
    if (!user || !contract) return;
    setPaymentError("");
    setPaymentLoading(true);

    try {
      if (!invoice) throw new Error("Deposit invoice is not available.");
      const session = await createDepositCheckoutSession({ invoiceId: invoice.id });

      window.location.assign(session.url);
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : "Unable to start Stripe Checkout.");
      setPaymentLoading(false);
    }
  }

  async function handleSignature() {
    if (!contract) return;
    setSignatureError("");

    try {
      await signContract(contract, typedSignature);
    } catch (caught) {
      setSignatureError(caught instanceof Error ? caught.message : "Unable to sign contract.");
    }
  }

  return (
    <AccountShell>
      <div className="account-page-header">
        <p className="section-kicker">Contracts</p>
        <h1>{contract ? `Contract workflow for ${contract.projectReference}.` : "No contract assigned yet."}</h1>
        <p>{contract ? "Review the stored terms below. Typed-name acceptance and the required deposit may be completed in either order; both are required for project access." : "Averon Admin must assign a contract before payment, signature, or workspace access appears."}</p>
      </div>

      {contract && <section className="account-panel"><h2>{contract.title}</h2><p>Version: {contract.contractVersion} · Assigned to: {contract.customerName}</p><p style={{whiteSpace:"pre-wrap"}}>{contract.scope}</p><p>Required deposit: {contract.currency.toUpperCase()} {(contract.depositAmountCents/100).toFixed(2)}. Project access also requires Averon authorization.</p><p>Entering your name records typed-name acceptance of these terms.</p></section>}

      <div className="contract-layout">
        <div className="contract-steps">
          {steps.map((step, index) => (
            <article className={step.complete ? "contract-step complete" : step.locked ? "contract-step locked" : "contract-step"} key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.detail}</p>
              </div>
              {step.complete ? <CheckCircle2 size={20} /> : step.locked ? <LockKeyhole size={20} /> : <UnlockKeyhole size={20} />}
            </article>
          ))}
        </div>

        <aside className="workspace-card">
          {workspaceUnlocked ? <UnlockKeyhole size={26} /> : <LockKeyhole size={26} />}
          <p className="section-kicker">Project Reference</p>
          <h2>{contract?.projectReference ?? "Pending assignment"}</h2>
          <dl>
            <div>
              <dt>Contract Assigned</dt>
              <dd>{contractAssigned ? "Complete" : "Pending"}</dd>
            </div>
            <div>
              <dt>Contract Signed</dt>
              <dd>{contractSigned ? "Complete" : "Pending"}</dd>
            </div>
            <div>
              <dt>Deposit Paid</dt>
              <dd>{depositPaid ? "Complete" : "Pending"}</dd>
            </div>
            <div>
              <dt>Workspace Access</dt>
              <dd>{contract?.workspaceAccess ? "Admin active" : "Admin inactive"}</dd>
            </div>
            <div>
              <dt>Deposit Invoice</dt>
              <dd>{invoice ? `${invoice.currency.toUpperCase()} ${(invoice.amountCents / 100).toLocaleString()}` : "Not issued"}</dd>
            </div>
          </dl>
          <div className="contract-actions">
            <button className="btn-secondary" type="button" onClick={handleDepositCheckout} disabled={!contract || depositPaid || paymentLoading || !stripeFrontendReady}>
              <CreditCard size={16} />
              {depositPaid ? "Deposit Paid" : paymentLoading ? "Opening Stripe..." : "Pay Deposit with Stripe"}
            </button>
            <input
              aria-label="Typed signature"
              placeholder="Type your full legal name"
              value={typedSignature}
              onChange={(event) => setTypedSignature(event.target.value)}
              disabled={contract?.status !== "assigned" || contractSigned}
            />
            <button className="btn-secondary" type="button" onClick={handleSignature} disabled={contract?.status !== "assigned" || contractSigned || typedSignature.trim().length < 2}>
              <PenLine size={16} />
              {contractSigned ? "Signed" : "Sign Contract"}
            </button>
          </div>
          {paymentError && <p className="form-alert error">{paymentError}</p>}
          {signatureError && <p className="form-alert error">{signatureError}</p>}
          {workspaceUnlocked && (
            <Link className="btn-primary" to="/client-portal">
              Visit Averon Workspace
              <ExternalLink size={16} />
            </Link>
          )}
          <p>{workspaceUnlocked ? "Contract Assigned · Deposit Paid · Contract Signed · Workspace Active" : "Workspace appears only after assignment, paid deposit, signed contract, and admin workspace access."}</p>
        </aside>
      </div>
    </AccountShell>
  );
}
