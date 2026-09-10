import type { PageMetadataId } from "@averon/shared-types";
import type { PageMetadataRepository } from "./page-metadata.types.ts";

export class PageMetadataService {
  private readonly repository: PageMetadataRepository;
  constructor(repository: PageMetadataRepository) { this.repository = repository; }
  read(workspaceId: string, pageId: PageMetadataId) { return this.repository.get(workspaceId, pageId); }
  readByRoute(workspaceId: string, route: string) { return this.repository.getByRoute(workspaceId, route); }
}
