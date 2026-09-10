export const STATIC_PAGE_IDS = ["home", "services", "products", "technology", "blog"] as const;
export type StaticPageId = typeof STATIC_PAGE_IDS[number];
export type PageMetadataId = StaticPageId | `blog:${string}`;

export interface PageMetadata {
  pageId: PageMetadataId;
  workspaceId: string;
  route: string;
  title: string;
  metaDescription: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
  robots: "index,follow";
  version: number;
  updatedAt?: unknown;
}
export type SeoMetadataPatch = Partial<Pick<PageMetadata, "title" | "metaDescription" | "ogTitle" | "ogDescription">>;
export interface SeoMetadataActionMetadata { actionId: string; actionType: "seo.metadata.read" | "seo.metadata.update"; status: "completed" | "failed"; verificationStatus: "pending" | "passed" | "failed"; pageId?: PageMetadataId; route?: string; changedFields: Array<keyof SeoMetadataPatch>; specialists: Array<{ id: string; status: string }>; warnings: string[] }

export const AVERON_PUBLIC_METADATA: Readonly<Record<StaticPageId, PageMetadata>> = {
  home: { pageId: "home", workspaceId: "averon", route: "/", title: "Averon Technologies | Software and AI Solutions", metaDescription: "Averon Technologies builds practical software, AI automation, websites, and connected business systems.", canonicalPath: "/", ogTitle: "Averon Technologies", ogDescription: "Practical software, AI automation, and connected business systems.", robots: "index,follow", version: 1 },
  services: { pageId: "services", workspaceId: "averon", route: "/services", title: "Services | Averon Technologies", metaDescription: "Explore Averon Technologies services for software development, AI automation, websites, and business workflows.", canonicalPath: "/services", ogTitle: "Averon Technologies Services", ogDescription: "Software development, AI automation, websites, and business workflow services.", robots: "index,follow", version: 1 },
  products: { pageId: "products", workspaceId: "averon", route: "/products", title: "Products | Averon Technologies", metaDescription: "Explore software products and digital systems developed by Averon Technologies.", canonicalPath: "/products", ogTitle: "Averon Technologies Products", ogDescription: "Software products and digital systems developed by Averon Technologies.", robots: "index,follow", version: 1 },
  technology: { pageId: "technology", workspaceId: "averon", route: "/technology", title: "Technology | Averon Technologies", metaDescription: "See how Averon Technologies chooses practical, secure, and maintainable technology for modern digital products.", canonicalPath: "/technology", ogTitle: "Technology at Averon", ogDescription: "Practical, secure, and maintainable technology for modern digital products.", robots: "index,follow", version: 1 },
  blog: { pageId: "blog", workspaceId: "averon", route: "/blog", title: "Blog | Averon Technologies", metaDescription: "Read Averon Technologies articles about AI, software development, technology, and business systems.", canonicalPath: "/blog", ogTitle: "Averon Technologies Blog", ogDescription: "Articles about AI, software development, technology, and business systems.", robots: "index,follow", version: 1 },
};

export function staticPageIdForPath(pathname: string): StaticPageId | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (Object.values(AVERON_PUBLIC_METADATA).find((item) => item.route === normalized)?.pageId as StaticPageId | undefined) ?? null;
}
