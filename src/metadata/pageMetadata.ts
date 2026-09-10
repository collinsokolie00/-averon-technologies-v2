import { AVERON_PUBLIC_METADATA, staticPageIdForPath, type PageMetadata } from "@averon/shared-types";
import { getBlogArticle } from "../data/blogArticles";

export const AVERON_WORKSPACE_ID = "averon";
export const SAFE_METADATA_FALLBACK = AVERON_PUBLIC_METADATA.home;

export function fallbackMetadataForPath(pathname: string): PageMetadata {
  const staticId = staticPageIdForPath(pathname);
  if (staticId) return AVERON_PUBLIC_METADATA[staticId];
  const blogMatch = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  const article = blogMatch ? getBlogArticle(blogMatch[1]) : undefined;
  if (article) return { pageId: `blog:${article.slug}`, workspaceId: AVERON_WORKSPACE_ID, route: `/blog/${article.slug}`, title: `${article.title} | Averon Technologies`, metaDescription: article.excerpt, canonicalPath: `/blog/${article.slug}`, ogTitle: article.title, ogDescription: article.excerpt, robots: "index,follow", version: 1 };
  return SAFE_METADATA_FALLBACK;
}

function singleton(selector: string, create: () => HTMLElement) {
  const matches = [...document.head.querySelectorAll<HTMLElement>(selector)];
  const element = matches[0] ?? create();
  for (const duplicate of matches.slice(1)) duplicate.remove();
  if (!element.parentNode) document.head.append(element);
  return element;
}

export function applyPageMetadata(metadata: PageMetadata, origin = window.location.origin) {
  document.title = metadata.title;
  const description = singleton('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" })) as HTMLMetaElement;
  description.content = metadata.metaDescription;
  const robots = singleton('meta[name="robots"]', () => Object.assign(document.createElement("meta"), { name: "robots" })) as HTMLMetaElement;
  robots.content = metadata.robots;
  const canonical = singleton('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" })) as HTMLLinkElement;
  canonical.href = new URL(metadata.canonicalPath, origin).toString();
  const ogTitle = singleton('meta[property="og:title"]', () => { const item = document.createElement("meta"); item.setAttribute("property", "og:title"); return item; }) as HTMLMetaElement;
  ogTitle.content = metadata.ogTitle;
  const ogDescription = singleton('meta[property="og:description"]', () => { const item = document.createElement("meta"); item.setAttribute("property", "og:description"); return item; }) as HTMLMetaElement;
  ogDescription.content = metadata.ogDescription;
}
