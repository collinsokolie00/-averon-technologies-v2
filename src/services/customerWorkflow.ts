import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { firebaseAuth, firestore } from "../lib/firebase";
import { averonApi } from "../lib/averonApi";

export type WorkflowStatus = "draft" | "pending" | "assigned" | "approved" | "replied" | "signed" | "paid" | "active" | "cancelled";

export interface QuoteRecord {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  company: string;
  projectType: string;
  budget: string;
  message: string;
  status: WorkflowStatus;
  adminReply?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContractRecord {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  title: string;
  scope: string;
  status: WorkflowStatus;
  projectReference: string;
  depositAmountCents: number;
  currency: "eur" | "usd";
  workspaceAccess: boolean;
  contractVersion: string;
  signedBy?: string;
  typedSignature?: string;
  signedAt?: unknown;
  audit?: Record<string, unknown>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InvoiceRecord {
  id: string;
  customerId: string;
  contractId: string;
  projectReference: string;
  title: string;
  amountCents: number;
  currency: "eur" | "usd";
  status: "issued" | "paid" | "cancelled";
  isDeposit: boolean;
  stripeSessionId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  contractId: string;
  invoiceId: string;
  projectReference: string;
  amountCents: number;
  currency: "eur" | "usd";
  status: "pending" | "paid" | "failed";
  stripeSessionId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MessageRecord {
  id: string;
  customerId: string;
  subject: string;
  body: string;
  senderRole: "admin" | "customer";
  status: "open" | "read" | "closed";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationRecord {
  id: string;
  customerId: string;
  title: string;
  body: string;
  status: "unread" | "read";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLogRecord {
  id: string;
  actorId?: string;
  actorEmail?: string | null;
  action: string;
  targetCollection?: string;
  targetId?: string;
  detail?: string;
  createdAt?: unknown;
}

export interface UserProfileRecord {
  uid: string;
  name: string;
  email: string;
  company?: string;
  role?: "customer" | "admin" | "owner";
}

function withId<T>(snapshot: QueryDocumentSnapshot<DocumentData>) {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export function subscribeCustomerQuotes(customerId: string, onNext: (quotes: QuoteRecord[]) => void) {
  return onSnapshot(
    query(collection(firestore, "quotes"), where("customerId", "==", customerId), orderBy("createdAt", "desc")),
    (snapshot) => onNext(snapshot.docs.map((item) => withId<QuoteRecord>(item))),
  );
}

export function subscribeCustomerContracts(customerId: string, onNext: (contracts: ContractRecord[]) => void) {
  return onSnapshot(
    query(collection(firestore, "contracts"), where("customerId", "==", customerId), orderBy("createdAt", "desc")),
    (snapshot) => onNext(snapshot.docs.map((item) => withId<ContractRecord>(item))),
  );
}

export function subscribeCustomerInvoices(customerId: string, onNext: (invoices: InvoiceRecord[]) => void) {
  return onSnapshot(
    query(collection(firestore, "invoices"), where("customerId", "==", customerId), orderBy("createdAt", "desc")),
    (snapshot) => onNext(snapshot.docs.map((item) => withId<InvoiceRecord>(item))),
  );
}

export function subscribeCustomerPayments(customerId: string, onNext: (payments: PaymentRecord[]) => void) {
  return onSnapshot(
    query(collection(firestore, "payments"), where("customerId", "==", customerId), orderBy("createdAt", "desc")),
    (snapshot) => onNext(snapshot.docs.map((item) => withId<PaymentRecord>(item))),
  );
}

export function subscribeCustomerCollection<T>(name: string, customerId: string, onNext: (records: T[]) => void) {
  return onSnapshot(
    query(collection(firestore, name), where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => onNext(snapshot.docs.map((item) => withId<T>(item))),
  );
}

export async function submitQuote(payload: Omit<QuoteRecord, "id" | "customerId" | "status" | "createdAt" | "updatedAt">) {
  const user = firebaseAuth.currentUser;
  if (user) await averonApi.business.createQuote(payload);
  else await averonApi.submitPublicQuote(payload);
}

export async function updateQuoteReply(quoteId: string, status: WorkflowStatus, adminReply: string) {
  if (status !== "approved" && status !== "replied" && status !== "cancelled") throw new Error("Unsupported quote status.");
  await averonApi.business.replyToQuote(quoteId, { status, adminReply });
}

export async function listFirebaseCustomers() {
  const response = await averonApi.business.list("users");
  return response.data.items.map((item) => ({ ...item, uid: item.id }) as unknown as UserProfileRecord);
}

export async function assignContract(payload: {
  customerId: string;
  customerEmail: string;
  customerName: string;
  title: string;
  scope: string;
  depositAmountCents: number;
  currency: "eur" | "usd";
  workspaceAccess: boolean;
}) {
  return (await averonApi.business.assignContract(payload)).data;
}

export async function markMessageRead(messageId: string) {
  await averonApi.business.markMessageRead(messageId);
}

export async function signContract(contract: ContractRecord, typedSignature: string) {
  const user = firebaseAuth.currentUser;
  if (!user || user.uid !== contract.customerId) {
    throw new Error("Only the assigned customer can sign this contract.");
  }

  await averonApi.business.signContract(contract.id, typedSignature);
}
