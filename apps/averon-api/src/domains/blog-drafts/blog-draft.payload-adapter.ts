import type { BlogDraft } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { BlogDraftCreatePayload, BlogDraftUpdatePatch } from "./blog-draft.types.ts";

export const BLOG_UPDATE_ADAPTER_FINGERPRINT = "blog-update-allowlisted-intent-patch-v1";

function text(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, "ACTION_VALIDATION_FAILED", `Validated specialist output did not supply ${field}.`);
  const normalized = value.trim();
  if (normalized.length <= maximum) return normalized;
  const bounded = normalized.slice(0, maximum + 1); const boundary = bounded.lastIndexOf(" ");
  return bounded.slice(0, boundary >= Math.floor(maximum * 0.7) ? boundary : maximum).trim();
}
function firstString(value: unknown, field: string, maximum: number) { return text(Array.isArray(value) ? value[0] : undefined, field, maximum); }
function explicitQuotedTitle(value: string) {
  return value.match(/\b(?:change|update|set|revise|rewrite)\s+the\s+(?:title|headline)\s+to\s+[“"]([^”"]+)[”"]/i)?.[1];
}

export function buildBlogDraftCreatePayload(blog: Record<string, unknown>, seo?: Record<string, unknown>): BlogDraftCreatePayload {
  return {
    title: text(blog.title, "title", 180), slug: text(blog.suggestedSlug, "slug", 120), excerpt: text(blog.summary, "excerpt", 500), body: text(blog.body, "body", 60_000),
    ...(seo && Array.isArray(seo.titleSuggestions) && seo.titleSuggestions.length ? { seoTitle: firstString(seo.titleSuggestions, "SEO title", 70) } : {}),
    ...(seo && Array.isArray(seo.metaDescriptionSuggestions) && seo.metaDescriptionSuggestions.length ? { metaDescription: firstString(seo.metaDescriptionSuggestions, "meta description", 180) } : {}),
  };
}

export function buildBlogDraftUpdatePatch(userRequest: string, current: BlogDraft, blog: Record<string, unknown>, seo?: Record<string, unknown>): BlogDraftUpdatePatch {
  const patch: BlogDraftUpdatePatch = {};
  const changesTitle = /\b(?:change|update|improve|revise|rewrite|strengthen|optimi[sz]e)\b.{0,50}\b(?:title|headline)\b|\b(?:title|headline)\b.{0,50}\b(?:change|update|improve|revise|rewrite|strengthen|optimi[sz]e)\b/i.test(userRequest);
  const changesMeta = /\bmeta\s+description\b/i.test(userRequest);
  const changesSeoTitle = /\bseo\s+title\b/i.test(userRequest);
  const changesSlug = /\bslug\b/i.test(userRequest);
  const changesExcerpt = /\bexcerpt\b/i.test(userRequest);
  const changesBody = /\b(?:body|content|copy|call\s+to\s+action|cta)\b/i.test(userRequest);
  if (changesTitle) patch.title = text(explicitQuotedTitle(userRequest) ?? blog.title, "title", 180);
  if (changesMeta) {
    if (!seo) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "SEO output is required for a requested meta-description update.");
    patch.metaDescription = firstString(seo.metaDescriptionSuggestions, "meta description", 180);
  }
  if (changesSeoTitle) {
    if (!seo) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "SEO output is required for a requested SEO-title update.");
    patch.seoTitle = firstString(seo.titleSuggestions, "SEO title", 70);
  }
  if (changesSlug) patch.slug = text(blog.suggestedSlug, "slug", 120);
  if (changesExcerpt) patch.excerpt = text(blog.summary, "excerpt", 500);
  if (changesBody) {
    const generatedBody = text(blog.body, "body", 60_000); const callToAction = typeof blog.callToAction === "string" ? blog.callToAction.trim() : "";
    patch.body = callToAction && !generatedBody.includes(callToAction) ? text(`${generatedBody}\n\n${callToAction}`, "body", 60_000) : generatedBody;
  }
  if (!Object.keys(patch).length) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "The update request did not identify an editable blog-draft field.");
  void current;
  return patch;
}
