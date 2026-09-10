export const adminCollections = ["users", "quotes", "contracts", "invoices", "payments", "messages", "notifications", "auditLogs"] as const;
export type AdminCollection = typeof adminCollections[number];

export interface BusinessRecord { id: string; [key: string]: unknown }

export interface QuoteSubmission {
  customerEmail: string; customerName: string; company: string; projectType: string; budget: string; message: string;
}

export interface QuoteReply { status: "approved" | "replied" | "cancelled"; adminReply: string }

export interface CustomerProfileInput { name?: string; company?: string; phone?: string; notificationPreference?: "important" | "all" | "weekly"; communicationPreference?: "email" | "portal"; authProvider?: "password" | "google" }

export interface ContractAssignment {
  customerId: string; customerEmail: string; customerName: string; title: string; scope: string;
  depositAmountCents: number; currency: "eur" | "usd"; workspaceAccess: boolean;
}
