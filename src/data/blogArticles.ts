export const blogArticles = [
  {
    slug: "ai-changing-modern-businesses",
    category: "AI",
    title: "How AI is changing modern businesses",
    excerpt:
      "Artificial intelligence is becoming part of everyday business operations, from customer support to automation.",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1400&q=80",
    body: [
      "AI is becoming a practical layer inside modern companies. It helps teams answer customers faster, summarize information, draft content, organize internal knowledge, and reduce repetitive work.",
      "For a business, the best AI implementation starts with a clear workflow. Averon looks at where time is being lost, where customers need faster answers, and where internal teams need better tools.",
      "The goal is not to add AI decoration. The goal is to build useful systems that improve service quality, reduce manual pressure, and support better decisions.",
    ],
  },
  {
    slug: "building-products-quality-before-speed",
    category: "Development",
    title: "Building products with quality before speed",
    excerpt:
      "Why taking time to engineer software correctly creates better long-term products.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    body: [
      "Fast delivery matters, but speed without structure creates expensive problems later. A product needs clean navigation, maintainable code, secure data handling, and clear ownership of each workflow.",
      "Averon builds with a long-term view. We plan the public site, customer account, admin controls, payment flow, and future integrations as parts of one system.",
      "That approach helps a product grow without needing to be rebuilt every time the business adds a new service, customer, or workflow.",
    ],
  },
  {
    slug: "choosing-right-technology-stack",
    category: "Technology",
    title: "Choosing the right technology stack",
    excerpt:
      "Modern web applications require balanced decisions between performance, scalability and maintenance.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    body: [
      "The right technology stack depends on the product, the team, the budget, and the level of security required. A simple website does not need the same architecture as a customer portal with contracts and payments.",
      "Averon chooses tools based on the workflow first. React, Firebase, Stripe, AI providers, and backend services are selected only when they support the real business requirement.",
      "This keeps the product practical, easier to maintain, and ready for future improvements.",
    ],
  },
  {
    slug: "software-that-grows-with-company",
    category: "Business",
    title: "Creating software that grows with your company",
    excerpt:
      "A scalable architecture reduces future development costs and improves reliability.",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
    body: [
      "Good software should support the next stage of the business, not only the current page or form. That means customer records, quotes, contracts, invoices, messages, and admin actions should be planned as connected parts.",
      "When the foundation is organized, new services and features can be added without breaking existing workflows.",
      "Averon builds systems with that growth path in mind, especially for businesses that need a professional website, customer portal, and operational backend working together.",
    ],
  },
];

export function getBlogArticle(slug?: string) {
  return blogArticles.find((article) => article.slug === slug);
}
