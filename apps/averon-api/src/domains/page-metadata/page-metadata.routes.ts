import type { PageMetadataId } from "@averon/shared-types";
import { ApiError } from "../../errors/api-error.ts";
import type { PageMetadataService } from "./page-metadata.service.ts";

const SAFE_ID = /^(?:home|services|products|technology|blog|blog:[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export async function handlePublicPageMetadataRoute(input: { method: string; path: string; service: PageMetadataService }) {
  const match = /^\/api\/v1\/public\/workspaces\/([^/]+)\/page-metadata\/([^/]+)$/.exec(input.path);
  if (!match || input.method !== "GET") return null;
  const workspaceId = decodeURIComponent(match[1]);
  const pageId = decodeURIComponent(match[2]);
  if (!/^[a-z0-9-]{1,64}$/.test(workspaceId) || !SAFE_ID.test(pageId)) throw new ApiError(400, "PAGE_METADATA_TARGET_INVALID", "A valid metadata target is required.");
  const item = await input.service.read(workspaceId, pageId as PageMetadataId);
  if (!item) throw new ApiError(404, "PAGE_METADATA_NOT_FOUND", "Page metadata was not found.");
  return { status: 200, data: item };
}
