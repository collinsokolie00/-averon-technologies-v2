import type { PageContent, PageContentField, StaticPageId } from "@averon/shared-types";
export interface PageContentRepository {
  get(workspaceId: string, pageId: StaticPageId): Promise<PageContent | null>;
  seed(records: readonly PageContent[]): Promise<number>;
  update(actionId: string, workspaceId: string, pageId: StaticPageId, sectionId: string, patch: Partial<Record<PageContentField, string>>, actorId: string): Promise<{ content: PageContent; duplicate: boolean }>;
}
