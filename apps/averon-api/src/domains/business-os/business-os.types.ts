import type { BusinessDecision, BusinessOs, BusinessOsHistoryItem, BusinessOsSection, BusinessOsSectionType, BusinessOsVisibility } from "@averon/shared-types";

export interface BusinessOsRepository {
  get(workspaceId: string): Promise<BusinessOs | null>;
  initialize(workspaceId: string, businessId: string, actorId: string): Promise<{ item: BusinessOs; created: boolean }>;
  listSections(workspaceId: string, types?: BusinessOsSectionType[], limit?: number): Promise<BusinessOsSection[]>;
  getSection(workspaceId: string, sectionId: string): Promise<BusinessOsSection | null>;
  createSection(input: Omit<BusinessOsSection, "version"> & { actorId: string }): Promise<BusinessOsSection>;
  updateSection(workspaceId: string, sectionId: string, patch: Partial<Pick<BusinessOsSection, "title" | "content" | "visibility" | "status">>, actorId: string): Promise<BusinessOsSection>;
  listDecisions(workspaceId: string): Promise<BusinessDecision[]>;
  createDecision(input: Omit<BusinessDecision, "version" | "createdBy" | "updatedBy"> & { actorId: string }): Promise<BusinessDecision>;
  updateDecision(workspaceId: string, decisionId: string, patch: Partial<Pick<BusinessDecision, "title" | "summary" | "rationale" | "status" | "effectiveDate" | "supersedes" | "supersededBy">>, actorId: string): Promise<BusinessDecision>;
  listHistory?(workspaceId: string, limit?: number): Promise<BusinessOsHistoryItem[]>;
}

export interface BusinessContextRequest { workspaceId: string; requestedSections?: BusinessOsSectionType[]; maximumRecords?: number; includeRestricted?: boolean }
export interface BusinessContextResult { businessOs: BusinessOs; sections: BusinessOsSection[] }
export const sectionTypes: BusinessOsSectionType[] = ["profile", "brand", "services", "pricing", "policies", "marketing", "sales", "seo", "operations", "sop", "decisions", "roadmap", "instructions"];
export const visibilities: BusinessOsVisibility[] = ["public", "internal", "restricted"];
