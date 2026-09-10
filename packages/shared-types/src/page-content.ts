import type { StaticPageId } from "./page-metadata.ts";

export type PageContentField = "heading" | "subheading" | "label" | "supportingCopy" | "title" | "description" | "intro";
export interface PageContentSection { sectionId: string; fields: Partial<Record<PageContentField, string>> }
export interface PageContent { workspaceId: string; pageId: StaticPageId; route: string; version: number; sections: PageContentSection[]; updatedAt?: unknown }
export interface PageContentPatch { pageId: StaticPageId; sectionId: string; patch: Partial<Record<PageContentField, string>> }
export interface PageContentActionMetadata { actionId: string; actionType: "page.content.read" | "page.content.update"; status: "completed" | "failed"; verificationStatus: "pending" | "passed" | "failed"; pageId?: StaticPageId; sectionId?: string; changedFields: PageContentField[]; specialists: Array<{ id: string; status: string }>; warnings: string[] }

export const AVERON_PUBLIC_PAGE_CONTENT: Readonly<Record<"home" | "services", PageContent>> = {
  home: { workspaceId: "averon", pageId: "home", route: "/", version: 1, sections: [
    { sectionId: "hero", fields: { heading: "Building intelligent digital products for tomorrow.", subheading: "Averon Technologies develops AI platforms, business software, modern websites and scalable digital products for companies around the world." } },
    { sectionId: "primaryCta", fields: { label: "Explore Products", supportingCopy: "Technology services and digital products built for modern businesses." } },
  ] },
  services: { workspaceId: "averon", pageId: "services", route: "/services", version: 1, sections: [
    { sectionId: "intro", fields: { heading: "Technology solutions built around real business needs.", intro: "Averon Technologies designs and develops websites, software, artificial-intelligence systems, commerce platforms, and business automation with quality and long-term growth in mind." } },
    { sectionId: "aiSolutions", fields: { title: "AI Solutions", description: "AI assistants, intelligent tools, and workflow integrations designed to improve business operations." } },
  ] },
};

export function pageContentSection(content: PageContent, sectionId: string) { return content.sections.find((section) => section.sectionId === sectionId); }
