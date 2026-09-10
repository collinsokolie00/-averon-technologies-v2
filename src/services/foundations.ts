import type { AiProvider, EmailTemplateDraft, FirebaseCollectionMap, PortalAccessState, StripeCheckoutDraft } from "../types/integrations";

export const firebaseCollections: FirebaseCollectionMap = {
  customers: "customers",
  quotes: "quotes",
  projects: "projects",
  contracts: "contracts",
  invoices: "invoices",
  payments: "payments",
  messages: "messages",
  notifications: "notifications",
  auditLogs: "auditLogs",
};

export const storagePaths = {
  contracts: "contracts/{customerId}/{projectReference}",
  invoices: "invoices/{customerId}/{invoiceId}",
  media: "media/site",
  avatars: "customers/{customerId}/avatar",
};

export const securityRules = {
  customerOwnsRecord: "request.auth.uid == resource.data.customerId",
  adminOnly: "request.auth.token.role in ['owner', 'admin']",
  signedContractUnlock: "contractSigned == true && depositPaid == true",
};

export const aiProviders: AiProvider[] = ["openai", "deepseek", "anthropic", "nexus-ai"];

export const emailTemplates: EmailTemplateDraft[] = [
  { key: "welcome", subject: "Welcome to Averon Technologies", audience: "customer" },
  { key: "verifyEmail", subject: "Verify your Averon account", audience: "customer" },
  { key: "quoteSubmitted", subject: "Your quote request was received", audience: "customer" },
  { key: "quoteApproved", subject: "Your Averon quote is approved", audience: "customer" },
  { key: "contractReady", subject: "Your contract is ready", audience: "customer" },
  { key: "depositReceived", subject: "Deposit received", audience: "customer" },
  { key: "projectStarted", subject: "Your project has started", audience: "customer" },
  { key: "invoice", subject: "Averon invoice", audience: "customer" },
  { key: "projectCompleted", subject: "Project completed", audience: "customer" },
  { key: "passwordReset", subject: "Reset your Averon password", audience: "customer" },
  { key: "workspaceInvitation", subject: "Your private project access is ready", audience: "customer" },
];

export function createCheckoutDraft(customerId: string): StripeCheckoutDraft {
  return {
    invoiceId: "INV-2026-018",
    customerId,
    amountCents: 250000,
    currency: "eur",
    purpose: "deposit",
  };
}

export function resolvePortalAccess(state: PortalAccessState) {
  return {
    ...state,
    workspaceUnlocked: state.contractSigned && state.depositPaid,
  };
}
