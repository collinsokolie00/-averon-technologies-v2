export interface ProductDetailSection {
  title: string;
  text: string;
  image: string;
}

export interface ProductDetail {
  slug: string;
  title: string;
  eyebrow: string;
  status: string;
  summary: string;
  heroImage: string;
  websiteUrl?: string;
  downloadUrl?: string;
  sections: ProductDetailSection[];
  capabilities: string[];
}

export const productDetails: ProductDetail[] = [
  {
    slug: "nexus-ai",
    title: "Nexus AI",
    eyebrow: "Artificial intelligence product",
    status: "Active development",
    summary: "A premium AI workspace for assistants, image tools, research, coding support, and intelligent business workflows.",
    heroImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1800&q=80",
    sections: [
      {
        title: "A focused AI workspace",
        text: "Nexus AI is shaped as a clean workspace where customers can ask questions, generate ideas, work with files, and move between AI tools without feeling lost.",
        image: "https://images.unsplash.com/photo-1674027444485-cec3da58eef4?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Assistant-led workflows",
        text: "The product is built around practical assistants for everyday work: writing, research, planning, coding support, media generation, and support guidance.",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Ready for business systems",
        text: "The foundation is prepared for subscriptions, project spaces, admin controls, customer settings, and integrations that can grow into a serious AI platform.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    capabilities: ["AI chat", "Image tools", "Project workspace", "Customer settings", "Admin controls", "Subscription readiness"],
  },
  {
    slug: "altrex",
    title: "Altrex",
    eyebrow: "Business operations product",
    status: "Concept validation",
    summary: "A future operations platform for CRM, contracts, invoices, projects, payments, and service delivery.",
    heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80",
    sections: [
      {
        title: "CRM and customer management",
        text: "Altrex is planned as the operating backbone for tracking leads, customers, proposals, contracts, project references, and delivery status.",
        image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Contracts and deposits",
        text: "The product direction includes quote approval, contract creation, mandatory deposit tracking, invoice history, and workspace activation logic.",
        image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "One place for delivery",
        text: "Altrex will help service businesses keep customer work organized from first inquiry through delivery, support, and long-term maintenance.",
        image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    capabilities: ["CRM pipeline", "Proposal builder", "Contract workflow", "Invoice tracking", "Payment readiness", "Project references"],
  },
  {
    slug: "lumora",
    title: "Lumora",
    eyebrow: "Premium commerce product",
    status: "Launch readiness",
    summary: "A luxury storefront and commerce foundation for polished catalog browsing, editorial pages, and future admin-managed operations.",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80",
    sections: [
      {
        title: "Editorial storefront experience",
        text: "Lumora is designed to make catalog browsing feel premium, calm, and intentional, with category pages and product presentation that support trust.",
        image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Structured product content",
        text: "The storefront foundation supports product groups, category storytelling, search behavior, and admin-managed content without making the customer experience heavy.",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Commerce-ready architecture",
        text: "Lumora is prepared for future checkout, supplier logic, order handling, and content operations while keeping the public storefront beautiful.",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    capabilities: ["Premium catalog", "Category pages", "Search readiness", "Admin content", "Checkout foundation", "Launch-focused UX"],
  },
  {
    slug: "ryan-jewelry",
    title: "Ryan Jewelry",
    eyebrow: "Luxury storefront product",
    status: "Maintenance",
    summary: "A polished jewelry and beauty storefront focused on presentation, trust, product discovery, and future payment flows.",
    heroImage: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1800&q=80",
    sections: [
      {
        title: "Luxury product presentation",
        text: "Ryan Jewelry focuses on strong first impressions, elegant product discovery, and layouts that make jewelry feel premium on every screen.",
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Trust-first shopping flow",
        text: "The storefront is prepared around clarity, customer confidence, product detail, and clean navigation before payment integration is finalized.",
        image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Ready for growth",
        text: "The architecture can grow into inventory, checkout, admin content, customer messages, and campaign pages without losing the luxury feel.",
        image: "https://images.unsplash.com/photo-1584302179602-e4c3d3fd629d?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    capabilities: ["Product gallery", "Luxury UI", "Customer trust", "Checkout readiness", "Responsive design", "Brand storytelling"],
  },
  {
    slug: "kita-clean-bavaria",
    title: "Kita Clean Bavaria",
    eyebrow: "Completed client project",
    status: "Live client website",
    summary: "A professional cleaning company website built for trust, service clarity, and customer inquiry flow.",
    heroImage: "/brand/kita-clean-bavaria-logo.jpeg",
    websiteUrl: "https://kitacleanbavaria.com",
    sections: [
      {
        title: "Professional service presentation",
        text: "Kita Clean Bavaria was structured to present cleaning services clearly, with a trustworthy first impression and a layout that helps customers understand the company quickly.",
        image: "/brand/kita-clean-bavaria-logo.jpeg",
      },
      {
        title: "Built for customer inquiries",
        text: "The website supports service discovery and customer contact, helping visitors move from interest to inquiry without confusion.",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "A completed client delivery",
        text: "This project represents Averon's client-facing website work: clean presentation, practical content structure, and a professional digital foundation for a local business.",
        image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    capabilities: ["Client website", "Service presentation", "Contact flow", "Responsive design", "Brand clarity", "Live website"],
  },
];

export function getProductDetail(slug: string) {
  return productDetails.find((product) => product.slug === slug);
}
