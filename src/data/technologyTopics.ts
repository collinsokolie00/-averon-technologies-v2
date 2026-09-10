export const technologyTopics = [
  {
    slug: "user-experience",
    title: "User Experience",
    eyebrow: "Interface Layer",
    summary:
      "This layer shapes how customers, teams, and administrators move through a digital product with confidence.",
    intro:
      "A strong user experience makes the product feel clear from the first screen. Averon plans navigation, page structure, forms, dashboards, and responsive layouts so users can find what they need without confusion.",
    points: [
      "Clear page journeys for visitors, customers, and internal teams.",
      "Responsive interfaces that work across desktop, tablet, and mobile.",
      "Premium visual structure with readable content, visible actions, and polished spacing.",
    ],
    outcome:
      "The result is a product that feels professional, usable, and ready for real customers.",
  },
  {
    slug: "application-logic",
    title: "Application Logic",
    eyebrow: "Product Rules",
    summary:
      "This layer controls features, permissions, customer actions, and the business rules behind each workflow.",
    intro:
      "Application logic is where the product becomes more than a set of pages. It decides what a user can do, when a customer sees a contract, how a service request moves forward, and how admin actions affect the customer experience.",
    points: [
      "Feature rules for accounts, quotes, contracts, deposits, and project access.",
      "Firebase-ready workflows for authenticated customer and admin experiences.",
      "Business rules that keep the product consistent as it grows.",
    ],
    outcome:
      "The result is software that behaves predictably and supports the real operating process of the business.",
  },
  {
    slug: "data-integrations",
    title: "Data and Integrations",
    eyebrow: "Connected Services",
    summary:
      "This layer connects the product to Firestore, APIs, AI systems, payments, messages, and external business tools.",
    intro:
      "Modern products need clean data flow. Averon structures the information behind customers, projects, invoices, messages, notifications, and product content so the website and portal can stay connected.",
    points: [
      "Firestore-ready customer, contract, payment, and message data structures.",
      "API connection points for Stripe, AI assistants, forms, and external services.",
      "Integration planning that avoids duplicated data and disconnected pages.",
    ],
    outcome:
      "The result is a coordinated product where important customer and business information can move safely between systems.",
  },
  {
    slug: "infrastructure",
    title: "Infrastructure",
    eyebrow: "Secure Foundation",
    summary:
      "This layer supports hosting, protected routes, secrets, deployments, monitoring, and long-term reliability.",
    intro:
      "Infrastructure is the foundation that keeps a product stable after launch. Averon separates frontend code from private backend secrets, protects customer routes, prepares production endpoints, and keeps deployment needs visible.",
    points: [
      "Protected route planning for private customer and admin areas.",
      "Backend-only handling for sensitive keys, payment webhooks, and secure actions.",
      "Deployment structure for testing, monitoring, and future scaling.",
    ],
    outcome:
      "The result is a product foundation that can move from preview to production without exposing private systems.",
  },
];

export function getTechnologyTopic(slug?: string) {
  return technologyTopics.find((topic) => topic.slug === slug);
}
