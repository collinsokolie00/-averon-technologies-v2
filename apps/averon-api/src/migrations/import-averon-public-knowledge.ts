import { getFirebaseAdminServices } from "../services/firebase/admin.ts";
import { FirebaseWorkspaceRepository } from "../domains/workspaces/workspace.repository.ts";
import { WorkspaceAuthorizationService } from "../domains/workspaces/workspace.service.ts";
import { FirebaseBusinessOsRepository } from "../domains/business-os/business-os.repository.ts";
import { BusinessOsService } from "../domains/business-os/business-os.service.ts";
import type { AuthContext } from "../services/auth/authentication.ts";

const workspaceId = "averon";
const sections = [
  { id: "public-company-profile-v1", type: "profile", title: "Averon Technologies public company profile", visibility: "public", status: "active", content: { summary: "Averon Technologies develops AI platforms, business software, modern websites, commerce systems, and scalable digital products.", fields: { positioning: "A technology company building intelligent digital products and services for modern businesses.", deliveryScope: ["AI platforms", "Business software", "Modern websites", "Commerce systems", "Business automation", "Digital product engineering"], publicInquiryRoute: "/contact", customerPortalRoute: "/client-portal", sourceFiles: ["src/pages/Home.tsx", "src/pages/Services.tsx"] } } },
  { id: "public-services-catalog-v1", type: "services", title: "Averon Technologies public services", visibility: "public", status: "active", content: { summary: "The reviewed public Averon service catalog used by the current website.", fields: { services: ["Website Development", "E-commerce Development", "AI Solutions", "Business Automation", "Product Engineering", "Maintenance and Support"], deliveryProcess: ["Discovery and requirements", "Planning and architecture", "Design and development", "Testing and refinement", "Launch and support"], sourceFiles: ["src/pages/Services.tsx", "src/components/sections/ServicesSection.tsx"] } } },
  { id: "public-product-portfolio-v1", type: "marketing", title: "Averon Technologies public product portfolio", visibility: "public", status: "active", content: { summary: "Publicly described Averon products and their repository-published delivery status.", fields: { products: ["Nexus AI — active development", "Altrex — concept validation", "Lumora — launch readiness", "Ryan Jewelry — maintenance", "Kita Clean Bavaria — live client website"], sourceFiles: ["src/data/productContent.ts", "src/data/adminConfig.ts"] } } },
] as const;

const db = getFirebaseAdminServices().firestore;
const owners = await db.collection("workspaceMemberships").where("workspaceId", "==", workspaceId).where("role", "==", "owner").where("status", "==", "active").get();
if (owners.size !== 1) throw new Error(`EXPECTED_ONE_ACTIVE_AVERON_OWNER:${owners.size}`);
const actorId = String(owners.docs[0].data().userId ?? "");
if (!actorId) throw new Error("AVERON_OWNER_UID_MISSING");
const auth: AuthContext = { user: { userId: actorId, emailVerified: true, role: "owner", isAdmin: true, permissions: [] } };
const service = new BusinessOsService(new FirebaseBusinessOsRepository(db), new WorkspaceAuthorizationService(new FirebaseWorkspaceRepository(db)));
await service.initialize(auth, workspaceId);
const existing = await service.sections(auth, workspaceId, undefined, 25);
const existingIds = new Set(existing.items.map((item) => item.id));
const created: string[] = [];
for (const section of sections) { if (!existingIds.has(section.id)) { await service.createSection(auth, workspaceId, section); created.push(section.id); } }
console.log(JSON.stringify({ workspaceId, created, existing: sections.map((section) => section.id).filter((id) => !created.includes(id)) }));
