import { ApiError } from "../../errors/api-error.ts";
import type { BlogDraftCreatePayload, BlogDraftUpdatePatch } from "./blog-draft.types.ts";

const allowed = ["title", "slug", "excerpt", "body", "seoTitle", "metaDescription", "tags"] as const;
const limits = { title: 180, slug: 120, excerpt: 500, body: 60_000, seoTitle: 70, metaDescription: 180 } as const;
const dangerous = /<\s*script\b|javascript\s*:|on(?:error|load|click)\s*=/i;
function parseFields(value: unknown, partial: boolean): BlogDraftUpdatePatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "A structured blog draft payload is required.");
  const input = value as Record<string, unknown>; if (Object.keys(input).some((key) => !allowed.includes(key as typeof allowed[number]))) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "The blog draft payload contains unsupported fields.");
  const output: Record<string, unknown> = {};
  for (const field of allowed) if (field in input) {
    const item = input[field];
    if (field === "tags") { if (!Array.isArray(item) || item.length > 20 || item.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 40)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "Blog tags are invalid."); output.tags = [...new Set(item.map((tag) => String(tag).trim()))]; continue; }
    if (typeof item !== "string" || !item.trim() || item.length > limits[field]) throw new ApiError(400, "ACTION_VALIDATION_FAILED", `Blog draft ${field} is invalid.`);
    if ((field === "body" || field === "excerpt") && dangerous.test(item)) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "Executable HTML is not allowed in blog drafts.");
    output[field] = item.trim();
  }
  if (!partial && ["title", "slug", "excerpt", "body"].some((field) => !(field in output))) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "Title, slug, excerpt, and body are required.");
  if (partial && !Object.keys(output).length) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "At least one editable field is required.");
  if ("slug" in output && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(output.slug))) throw new ApiError(400, "ACTION_VALIDATION_FAILED", "The blog draft slug is invalid.");
  return output as BlogDraftUpdatePatch;
}
export function parseBlogDraftCreate(value: unknown) { return parseFields(value, false) as BlogDraftCreatePayload; }
export function parseBlogDraftUpdate(value: unknown) { return parseFields(value, true); }
