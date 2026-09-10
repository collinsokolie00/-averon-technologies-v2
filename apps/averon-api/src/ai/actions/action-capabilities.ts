export type SupportedActionType = "blog.draft.create" | "blog.draft.update" | "seo.metadata.update" | "page.content.update" | "frontend.source.propose" | "backend.source.propose";
export const ACTION_DEPENDENCY_FINGERPRINT = "blog.draft.create=content.blog_drafting;blog.draft.update=content.blog_drafting;seo.metadata.update=seo.metadata;page.content.update=marketing.strategy;frontend.source.propose=development.frontend_analysis;backend.source.propose=development.backend_analysis";

export type ActionCapabilityDeclaration = {
  actionType: SupportedActionType;
  requiredSkills: readonly string[];
};

const declarations: Record<SupportedActionType, ActionCapabilityDeclaration> = {
  "blog.draft.create": { actionType: "blog.draft.create", requiredSkills: ["content.blog_drafting"] },
  "blog.draft.update": { actionType: "blog.draft.update", requiredSkills: ["content.blog_drafting"] },
  "seo.metadata.update": { actionType: "seo.metadata.update", requiredSkills: ["seo.metadata"] },
  "page.content.update": { actionType: "page.content.update", requiredSkills: ["marketing.strategy"] },
  "frontend.source.propose": { actionType: "frontend.source.propose", requiredSkills: ["development.frontend_analysis"] },
  "backend.source.propose": { actionType: "backend.source.propose", requiredSkills: ["development.backend_analysis"] },
};

export function actionCapabilityDeclaration(actionType: SupportedActionType | undefined) {
  return actionType ? declarations[actionType] : undefined;
}

export type RegisteredActionPolicy = { actionType: string; label: string; requiredPermission: "content:read" | "content:manage" | "source:read" | "source:propose" | "source:manage"; approvalRequired: boolean; requiredSkill?: string };
export const registeredActionPolicies: readonly RegisteredActionPolicy[] = [
  { actionType: "blog.draft.read", label: "Blog draft read", requiredPermission: "content:read", approvalRequired: false },
  { actionType: "blog.draft.create", label: "Blog draft create", requiredPermission: "content:manage", approvalRequired: false, requiredSkill: declarations["blog.draft.create"].requiredSkills[0] },
  { actionType: "blog.draft.update", label: "Blog draft update", requiredPermission: "content:manage", approvalRequired: false, requiredSkill: declarations["blog.draft.update"].requiredSkills[0] },
  { actionType: "seo.metadata.read", label: "SEO metadata read", requiredPermission: "content:read", approvalRequired: false },
  { actionType: "seo.metadata.update", label: "SEO metadata update", requiredPermission: "content:manage", approvalRequired: false, requiredSkill: declarations["seo.metadata.update"].requiredSkills[0] },
  { actionType: "page.content.read", label: "Page content read", requiredPermission: "content:read", approvalRequired: false },
  { actionType: "page.content.update", label: "Page content update", requiredPermission: "content:manage", approvalRequired: false, requiredSkill: declarations["page.content.update"].requiredSkills[0] },
  { actionType: "frontend.source.read", label: "Frontend source read", requiredPermission: "source:read", approvalRequired: false },
  { actionType: "frontend.source.propose", label: "Frontend source proposal", requiredPermission: "source:propose", approvalRequired: false, requiredSkill: declarations["frontend.source.propose"].requiredSkills[0] },
  { actionType: "frontend.source.apply", label: "Frontend source apply", requiredPermission: "source:manage", approvalRequired: true, requiredSkill: declarations["frontend.source.propose"].requiredSkills[0] },
  { actionType: "backend.source.read", label: "Backend source read", requiredPermission: "source:read", approvalRequired: false },
  { actionType: "backend.source.propose", label: "Backend source proposal", requiredPermission: "source:propose", approvalRequired: false, requiredSkill: declarations["backend.source.propose"].requiredSkills[0] },
  { actionType: "backend.source.apply", label: "Backend source apply", requiredPermission: "source:manage", approvalRequired: true, requiredSkill: declarations["backend.source.propose"].requiredSkills[0] },
];
