import {
  BarChart3,
  BookOpenText,
  Bot,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FileCheck2,
  FileText,
  FolderKanban,
  Home,
  Image,
  Inbox,
  Landmark,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageSquareQuote,
  MonitorCog,
  Navigation,
  Newspaper,
  Palette,
  ReceiptText,
  Search,
  Settings,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AdminTone = "neutral" | "good" | "warn" | "danger";

export interface AdminRow {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  tone: AdminTone;
}

export interface AdminSection {
  key: string;
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  collection?: "users" | "quotes" | "contracts" | "invoices" | "payments" | "messages" | "notifications" | "auditLogs";
  emptyState: string;
  launchStatus: "active" | "partial" | "blocked";
}

export interface AdminProduct {
  title: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  status: string;
  developmentStatus: string;
  screenshotPlaceholder: string;
  logoPlaceholder: string;
  logoUrl?: string;
  websiteUrl: string;
  downloadUrl: string;
  technologyStack: string[];
  features: string[];
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
}

export const products: AdminProduct[] = [
  {
    title: "Nexus AI",
    slug: "nexus-ai",
    shortDescription: "AI workspace for creation, automation, and intelligent product workflows.",
    longDescription: "Nexus AI combines chat, image generation, project tools, and business automation into a premium operating layer.",
    status: "Published",
    developmentStatus: "Active development",
    screenshotPlaceholder: "Nexus dashboard preview",
    logoPlaceholder: "NX",
    logoUrl: "/brand/nexus-ai-logo.png",
    websiteUrl: "",
    downloadUrl: "",
    technologyStack: ["React", "OpenAI", "Firebase", "Stripe"],
    features: ["AI assistants", "Project workspace", "Image tools", "Admin controls"],
    seoTitle: "Nexus AI by Averon Technologies",
    seoDescription: "A premium AI workspace for modern teams.",
    published: true,
    featured: true,
    sortOrder: 1,
  },
  {
    title: "Altrex",
    slug: "altrex",
    shortDescription: "Business operations platform for CRM, contracts, projects, and payments.",
    longDescription: "Altrex is Averon's planned operating backbone for professional service delivery and client management.",
    status: "Draft",
    developmentStatus: "Concept validation",
    screenshotPlaceholder: "Altrex operations map",
    logoPlaceholder: "AX",
    logoUrl: "/brand/altrex-logo.png",
    websiteUrl: "",
    downloadUrl: "",
    technologyStack: ["React", "Node", "PostgreSQL"],
    features: ["CRM pipeline", "Contract builder", "Invoice tracking"],
    seoTitle: "Altrex Operations Platform",
    seoDescription: "Averon's business operations product.",
    published: false,
    featured: false,
    sortOrder: 2,
  },
  {
    title: "Lumora",
    slug: "lumora",
    shortDescription: "Luxury commerce and brand storefront system.",
    longDescription: "Lumora supports premium retail storytelling, catalog management, and future commerce operations.",
    status: "Published",
    developmentStatus: "Launch readiness",
    screenshotPlaceholder: "Lumora editorial storefront",
    logoPlaceholder: "LU",
    logoUrl: "/brand/lumora-logo.png",
    websiteUrl: "",
    downloadUrl: "",
    technologyStack: ["Vite", "React", "Firebase"],
    features: ["Premium catalog", "Editorial pages", "Admin-managed content"],
    seoTitle: "Lumora Luxury Commerce",
    seoDescription: "Premium storefront technology by Averon.",
    published: true,
    featured: true,
    sortOrder: 3,
  },
  {
    title: "Ryan Jewelry",
    slug: "ryan-jewelry",
    shortDescription: "Jewelry storefront and payment-ready product experience.",
    longDescription: "Ryan Jewelry is a focused luxury storefront for product browsing, trust-building, and future checkout flows.",
    status: "Published",
    developmentStatus: "Maintenance",
    screenshotPlaceholder: "Jewelry product gallery",
    logoPlaceholder: "RJ",
    logoUrl: "/brand/ryan-jewelry-logo.png",
    websiteUrl: "",
    downloadUrl: "",
    technologyStack: ["React", "Stripe", "Node"],
    features: ["Product gallery", "Checkout prep", "Responsive storefront"],
    seoTitle: "Ryan Jewelry Storefront",
    seoDescription: "Luxury jewelry storefront by Averon.",
    published: true,
    featured: false,
    sortOrder: 4,
  },
  {
    title: "Kita Clean Bavaria",
    slug: "kita-clean-bavaria",
    shortDescription: "Completed client website for a professional cleaning company.",
    longDescription: "Kita Clean Bavaria presents cleaning services clearly, builds customer trust, and gives visitors a direct path to the live client website.",
    status: "Published",
    developmentStatus: "Live client website",
    screenshotPlaceholder: "Kita Clean Bavaria website preview",
    logoPlaceholder: "KC",
    logoUrl: "/brand/kita-clean-bavaria-logo.jpeg",
    websiteUrl: "https://kitacleanbavaria.com",
    downloadUrl: "",
    technologyStack: ["React", "Responsive Web", "SEO"],
    features: ["Service presentation", "Contact flow", "Client brand clarity"],
    seoTitle: "Kita Clean Bavaria Website",
    seoDescription: "Professional cleaning company website delivered by Averon Technologies.",
    published: true,
    featured: true,
    sortOrder: 5,
  },
];

export const projects = [
  { title: "Nexus AI", kind: "Internal Product", status: "Active", description: "AI workspace product with assistants, media workflows, and admin controls.", progress: 72 },
  { title: "Altrex", kind: "Internal Product", status: "Planning", description: "Business operations system for CRM and contract workflows.", progress: 24 },
  { title: "Lumora", kind: "Internal Product", status: "Launch readiness", description: "Premium commerce storefront and catalog foundation.", progress: 84 },
  { title: "Ryan Jewelry", kind: "Internal Product", status: "Maintenance", description: "Luxury jewelry storefront and payment-ready customer experience.", progress: 68 },
  { title: "Kita Clean Bavaria", kind: "Client Project", status: "Completed", description: "Completed cleaning service website, admin content, and quote workflow.", progress: 100 },
];

export const homepageBlocks = [
  "Hero",
  "Hero Buttons",
  "Hero Text",
  "Featured Products",
  "Featured Services",
  "Technology Preview",
  "Projects Preview",
  "Blog Preview",
  "CTA",
  "Homepage Banners",
  "Section Visibility",
  "Section Order",
].map((title, index) => ({
  title,
  detail: "Public homepage section currently managed in application source content.",
  status: index < 8 ? "Ready" : "Draft",
}));

export const adminSections: AdminSection[] = [
  { key: "services", path: "services", label: "Services", eyebrow: "Offerings", title: "Services", description: "Review the public service content currently managed in source files.", icon: Wrench, emptyState: "No service collection is configured yet.", launchStatus: "blocked" },
  { key: "technology", path: "technology", label: "Technology", eyebrow: "Stack", title: "Technology", description: "Review the public technology content currently managed in source files.", icon: MonitorCog, emptyState: "No technology collection is configured yet.", launchStatus: "blocked" },
  { key: "blog", path: "blog", label: "Blog", eyebrow: "Content", title: "Blog", description: "Review blog publishing readiness. Blog articles currently come from source content.", icon: Newspaper, emptyState: "No blog collection is configured yet.", launchStatus: "blocked" },
  { key: "messages", path: "messages", label: "Messages", eyebrow: "Inbox", title: "Messages", description: "Review customer and portal messages stored in Firestore.", icon: Inbox, collection: "messages", emptyState: "No customer messages yet.", launchStatus: "active" },
  { key: "quotes", path: "quotes", label: "Quote Requests", eyebrow: "Sales", title: "Quote Requests", description: "Capture and qualify incoming project requests before contract creation.", icon: FileText, collection: "quotes", emptyState: "No quote requests yet.", launchStatus: "active" },
  { key: "customers", path: "customers", label: "Customers", eyebrow: "Accounts", title: "Customers", description: "Review Firebase customer profiles and portal access metadata.", icon: UsersRound, collection: "users", emptyState: "No customers yet.", launchStatus: "active" },
  { key: "crm", path: "crm", label: "CRM Pipeline", eyebrow: "Sales", title: "CRM Pipeline", description: "CRM stages require a dedicated opportunity collection before launch.", icon: FolderKanban, emptyState: "No CRM backend is configured yet.", launchStatus: "blocked" },
  { key: "contracts", path: "contracts", label: "Contracts", eyebrow: "Legal", title: "Contracts", description: "Assign and review customer contracts stored in Firestore.", icon: FileCheck2, collection: "contracts", emptyState: "No contracts assigned yet.", launchStatus: "active" },
  { key: "proposals", path: "proposals", label: "Proposals", eyebrow: "Sales", title: "Proposals", description: "Proposal management requires a dedicated backend collection.", icon: FileText, emptyState: "No proposal backend is configured yet.", launchStatus: "blocked" },
  { key: "invoices", path: "invoices", label: "Invoices", eyebrow: "Billing", title: "Invoices", description: "Review deposit and project invoices stored in Firestore.", icon: ReceiptText, collection: "invoices", emptyState: "No invoices issued yet.", launchStatus: "active" },
  { key: "payments", path: "payments", label: "Payments", eyebrow: "Revenue", title: "Payments", description: "Review payment records created by the customer workflow.", icon: CreditCard, collection: "payments", emptyState: "No payment records yet.", launchStatus: "partial" },
  { key: "media", path: "media", label: "Media Library", eyebrow: "Assets", title: "Media Library", description: "Media management requires Firebase Storage or another asset backend.", icon: Image, emptyState: "No media backend is configured yet.", launchStatus: "blocked" },
  { key: "testimonials", path: "testimonials", label: "Testimonials", eyebrow: "Proof", title: "Testimonials", description: "Testimonials require a dedicated content collection.", icon: MessageSquareQuote, emptyState: "No testimonial backend is configured yet.", launchStatus: "blocked" },
  { key: "analytics", path: "analytics", label: "Analytics", eyebrow: "Insights", title: "Analytics", description: "Analytics require a real event source before launch.", icon: BarChart3, emptyState: "No analytics backend is configured yet.", launchStatus: "blocked" },
  { key: "knowledge-base", path: "knowledge-base", label: "Knowledge Base", eyebrow: "Emmy source", title: "Knowledge Base", description: "Knowledge base storage should be added with the future admin AI integration.", icon: BookOpenText, emptyState: "No knowledge base collection is configured yet.", launchStatus: "blocked" },
  { key: "ai-settings", path: "ai-settings", label: "Emmy AI Gateway", eyebrow: "AI settings", title: "Emmy AI Gateway", description: "Admin AI controls are intentionally deferred until the next integration phase.", icon: Bot, emptyState: "Admin AI controls are not connected yet.", launchStatus: "blocked" },
  { key: "seo", path: "seo", label: "SEO", eyebrow: "Search", title: "SEO", description: "SEO metadata is currently managed in page source content.", icon: Search, emptyState: "No SEO collection is configured yet.", launchStatus: "blocked" },
  { key: "navigation", path: "navigation", label: "Navigation", eyebrow: "Menus", title: "Navigation", description: "Navigation is currently managed in application source files.", icon: Navigation, emptyState: "No navigation collection is configured yet.", launchStatus: "blocked" },
  { key: "footer", path: "footer", label: "Footer", eyebrow: "Website chrome", title: "Footer", description: "Footer content is currently managed in application source files.", icon: Link2, emptyState: "No footer content collection is configured yet.", launchStatus: "blocked" },
  { key: "brand-settings", path: "brand-settings", label: "Brand Settings", eyebrow: "Identity", title: "Brand Settings", description: "Brand identity is currently managed in source content and static assets.", icon: Landmark, emptyState: "No brand settings collection is configured yet.", launchStatus: "blocked" },
  { key: "settings", path: "settings", label: "Settings", eyebrow: "System", title: "Settings", description: "Application settings require a secure admin-only settings collection.", icon: Settings, emptyState: "No settings collection is configured yet.", launchStatus: "blocked" },
  { key: "profile", path: "profile", label: "Profile", eyebrow: "Account", title: "Profile", description: "Admin profile uses Firebase Authentication identity.", icon: UserRound, emptyState: "Sign in with a Firebase admin account to view profile details.", launchStatus: "partial" },
  { key: "security", path: "security", label: "Security", eyebrow: "Access", title: "Security", description: "Review admin access, custom-claim requirements, and activity logs.", icon: LockKeyhole, collection: "auditLogs", emptyState: "No admin activity recorded yet.", launchStatus: "partial" },
  { key: "appearance", path: "appearance", label: "Appearance", eyebrow: "Brand UI", title: "Appearance", description: "Appearance is currently controlled by source CSS.", icon: Palette, emptyState: "No appearance settings backend is configured yet.", launchStatus: "blocked" },
];

export const adminNav = [
  { path: "", label: "Dashboard", icon: LayoutDashboard },
  { path: "homepage", label: "Homepage", icon: Home },
  { path: "products", label: "Products", icon: Building2 },
  { path: "projects", label: "Projects", icon: BriefcaseBusiness },
  ...adminSections.map((section) => ({ path: section.path, label: section.label, icon: section.icon })),
];
