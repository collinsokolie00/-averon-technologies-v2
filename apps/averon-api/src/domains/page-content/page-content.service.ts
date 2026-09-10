import type { StaticPageId } from "@averon/shared-types";
import type { PageContentRepository } from "./page-content.types.ts";
export class PageContentService { private readonly repository: PageContentRepository; constructor(repository: PageContentRepository) { this.repository = repository; } read(workspaceId: string, pageId: StaticPageId) { return this.repository.get(workspaceId, pageId); } }
