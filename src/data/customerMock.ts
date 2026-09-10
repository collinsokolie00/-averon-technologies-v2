import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  Inbox,
  LockKeyhole,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface AccountSection {
  path: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const accountSections: AccountSection[] = [
  { path: "", label: "Dashboard", icon: BriefcaseBusiness, title: "Client Dashboard", description: "Overview of your quote, contract, invoices, and workspace readiness." },
  { path: "profile", label: "Profile", icon: UserRound, title: "Profile", description: "Manage your contact details and company information." },
  { path: "quotes", label: "Quotes", icon: FileText, title: "Quotes", description: "Track quote requests and approved proposals." },
  { path: "contracts", label: "Contracts", icon: FileCheck2, title: "Contracts", description: "Review scope, terms, deposit, and signature steps." },
  { path: "invoices", label: "Invoices", icon: ReceiptText, title: "Invoices", description: "Prepared invoice history for future Stripe billing." },
  { path: "payments", label: "Payments", icon: CreditCard, title: "Payments", description: "Deposit and payment history." },
  { path: "notifications", label: "Notifications", icon: Bell, title: "Notifications", description: "Project and contract updates from Averon." },
  { path: "messages", label: "Messages", icon: Inbox, title: "Messages", description: "Shared conversation foundation for support and delivery." },
  { path: "security", label: "Security", icon: ShieldCheck, title: "Security", description: "Password, sessions, and verification controls." },
  { path: "settings", label: "Settings", icon: Settings, title: "Settings", description: "Notification preferences and account defaults." },
];

export const accountStats = [
  { label: "Quote Status", value: "Approved", detail: "Project reference AVR-2026-0001" },
  { label: "Contract", value: "Ready", detail: "5-step signing workflow prepared" },
  { label: "Deposit", value: "Pending", detail: "Stripe test integration connected" },
  { label: "Workspace", value: "Locked", detail: "Unlocks after signature and deposit" },
];

export const contractSteps = [
  { title: "Terms & Conditions", detail: "Review service terms, support boundaries, privacy, and cancellation policy.", complete: true },
  { title: "Project Scope", detail: "Confirm deliverables, acceptance criteria, and communication cadence.", complete: true },
  { title: "Project Timeline & Work Plan", detail: "Review milestones, dependencies, review windows, and launch plan.", complete: true },
  { title: "Mandatory Deposit Payment", detail: "Deposit checkout opens Stripe from the assigned Firestore contract.", complete: false },
  { title: "Electronic Signature", detail: "Typed signature is stored on the Firestore contract with audit metadata.", complete: false },
];

export const clientRows = {
  quotes: [
    ["AVR-Q-1042", "Premium website and automation discovery", "Approved"],
    ["AVR-Q-1037", "AI support assistant foundation", "In review"],
  ],
  invoices: [
    ["INV-2026-018", "Mandatory project deposit", "Draft"],
    ["INV-2026-019", "Milestone payment", "Scheduled"],
  ],
  messages: [
    ["Averon Operations", "Your contract workflow is ready for review.", "Unread"],
    ["Emmy", "I can help you understand the quote steps.", "Open"],
  ],
};

export const securityOptions = [
  { label: "Email verification", value: "Verified", icon: CheckCircle2 },
  { label: "Password policy", value: "Minimum 8 characters", icon: LockKeyhole },
  { label: "Session protection", value: "Firebase persistent session", icon: ShieldCheck },
];
