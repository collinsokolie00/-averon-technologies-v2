import type { PageMetadata, PageMetadataId, SeoMetadataPatch } from "@averon/shared-types";

export interface PageMetadataRepository {
  get(workspaceId: string, pageId: PageMetadataId): Promise<PageMetadata | null>;
  getByRoute(workspaceId: string, route: string): Promise<PageMetadata | null>;
  seed(records: readonly PageMetadata[]): Promise<number>;
  update(actionId: string, workspaceId: string, pageId: PageMetadataId, patch: SeoMetadataPatch, actorId: string): Promise<{ metadata: PageMetadata; duplicate: boolean }>;
}
