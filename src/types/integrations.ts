export type AiProvider = "openai" | "deepseek" | "anthropic" | "nexus-ai";

export interface SharedConversation {
  id: string;
  scope: "website" | "workspace" | "admin";
  customerId?: string;
  subject: string;
  status: "open" | "waiting" | "resolved";
}

export interface PortalAccessState {
  customerId: string;
  projectReference: string;
  contractSigned: boolean;
  depositPaid: boolean;
  workspaceUnlocked: boolean;
}

export interface FirebaseCollectionMap {
  customers: "customers";
  quotes: "quotes";
  projects: "projects";
  contracts: "contracts";
  invoices: "invoices";
  payments: "payments";
  messages: "messages";
  notifications: "notifications";
  auditLogs: "auditLogs";
}

export interface StripeCheckoutDraft {
  invoiceId: string;
  customerId: string;
  amountCents: number;
  currency: "eur" | "usd";
  purpose: "deposit" | "milestone" | "final" | "maintenance";
}

export interface EmailTemplateDraft {
  key:
    | "welcome"
    | "verifyEmail"
    | "quoteSubmitted"
    | "quoteApproved"
    | "contractReady"
    | "depositReceived"
    | "projectStarted"
    | "invoice"
    | "projectCompleted"
    | "passwordReset"
    | "workspaceInvitation";
  subject: string;
  audience: "customer" | "admin";
}
