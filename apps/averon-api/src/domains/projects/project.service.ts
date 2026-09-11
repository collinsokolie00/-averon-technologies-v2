import { ApiError } from "../../errors/api-error.ts";
import type { PaymentEvent } from "../payments/payment.types.ts";
import { generateProjectAccessPassword, hashProjectAccessPassword, verifyProjectAccessPassword } from "./access-password.ts";
import type { ProjectEmailSender } from "./project.email.ts";
import type { ProjectRepository } from "./project.repository.ts";
import type { ProjectFileStorage } from "./project-file.storage.ts";
import type { ProjectFileCategory, ProjectFileRecord } from "./project.types.ts";
import { createHash } from "node:crypto";

export const FREE_MAINTENANCE_SCOPE = {
  included: ["minor bug fixes", "small text/content edits", "small image replacements", "minor layout corrections", "support for delivered functionality"],
  excluded: ["new pages", "major redesign", "major new features", "new integrations", "complete scope changes"],
} as const;

export class ProjectService {
  private readonly repository: ProjectRepository; private readonly email: ProjectEmailSender; private readonly portalUrl: string; private readonly fileStorage?:ProjectFileStorage;
  constructor(repository: ProjectRepository, email: ProjectEmailSender, portalUrl: string, fileStorage?: ProjectFileStorage) { this.repository = repository; this.email = email; this.portalUrl = portalUrl; this.fileStorage=fileStorage; }

  async adminProjects() { if (!this.repository.listAll) throw new ApiError(503,"PROJECT_FILES_UNAVAILABLE","Project file administration is unavailable."); return (await this.repository.listAll()).map((item)=>{const project={...item} as Partial<typeof item>;delete project.accessPasswordHash;return project;}); }

  async uploadFile(projectId:string,actorId:string,input:Record<string,unknown>){
    if(!this.fileStorage||!this.repository.createFile)throw new ApiError(503,"PROJECT_FILES_UNAVAILABLE","Project file upload is unavailable.");
    const project=this.repository.listAll?(await this.repository.listAll()).find((item)=>item.id===projectId):undefined;if(!project)throw new ApiError(404,"PROJECT_NOT_FOUND","The project was not found.");
    const name=String(input.name??"").trim().replace(/[\\/\0\r\n]/g,"_");const description=String(input.description??"").trim();const mimeType=String(input.mimeType??"").toLowerCase();const category=String(input.category??"other") as ProjectFileCategory;const deliveryStatus=String(input.deliveryStatus??"deliverable") as "working"|"deliverable"|"final";const idempotencyKey=String(input.idempotencyKey??"").trim();
    const allowedMime=new Set(["application/pdf","image/png","image/jpeg","image/webp","text/plain","text/csv","application/zip","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
    if(!name||name.length>180||description.length>1000||!allowedMime.has(mimeType)||!["deliverable","document","design","report","other"].includes(category)||!["working","deliverable","final"].includes(deliveryStatus)||!/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey))throw new ApiError(400,"PROJECT_FILE_INVALID","Valid project file metadata is required.");
    const encoded=String(input.contentBase64??"");const bytes=Buffer.from(encoded,"base64");if(!bytes.length||bytes.length>10*1024*1024||bytes.toString("base64").replace(/=+$/,"")!==encoded.replace(/=+$/,""))throw new ApiError(400,"PROJECT_FILE_INVALID","The file must be between 1 byte and 10 MB.");
    const fileId=createHash("sha256").update(`${projectId}:${idempotencyKey}`).digest("hex").slice(0,32);const stored=await this.fileStorage.save({projectId,fileId,bytes,mimeType});const result=await this.repository.createFile({id:fileId,projectId,customerId:project.customerId,name,category,mimeType,sizeBytes:bytes.length,description:description||undefined,version:1,customerVisible:input.customerVisible!==false,deliveryStatus,storagePath:stored.storagePath,uploadedBy:actorId},idempotencyKey);return{file:this.publicFile(result.file),created:result.created};
  }

  async download(projectId:string,fileId:string,customerId:string){if(!this.fileStorage||!this.repository.getFile||!this.repository.recordDownload)throw new ApiError(503,"PROJECT_FILES_UNAVAILABLE","Project file downloads are unavailable.");const project=await this.repository.getOwned(projectId,customerId);if(!project||project.accessEnabled!==true||!project.unlockedAt)throw new ApiError(403,"PROJECT_ACCESS_REQUIRED","Unlock this project before downloading files.");const file=await this.repository.getFile(fileId);if(!file||file.projectId!==projectId||file.customerId!==customerId||!file.customerVisible)throw new ApiError(404,"PROJECT_FILE_NOT_FOUND","The project file was not found.");const access=await this.fileStorage.signedDownload(file.storagePath,file.name);await this.repository.recordDownload(file.id,customerId);return access;}
  private publicFile(file:ProjectFileRecord){const safe={...file} as Partial<ProjectFileRecord>;delete safe.storagePath;delete safe.customerId;delete safe.uploadedBy;return safe;}

  async activateFromPayment(payment: PaymentEvent) {
    if (payment.type !== "paid" || !payment.customerId || !payment.contractId || !payment.invoiceId) return "ineligible" as const;
    return this.activateContract(payment.contractId, payment.customerId, payment.invoiceId);
  }

  async activateContract(contractId: string, customerId: string, invoiceId?: string) {
    const existing = await this.repository.findByContract(contractId);
    if (existing) {
      if (existing.customerId !== customerId) throw new ApiError(403, "PROJECT_ACCESS_REQUIRED", "Contract ownership does not match.");
      return "duplicate" as const;
    }
    const password = generateProjectAccessPassword();
    const hash = await hashProjectAccessPassword(password);
    const project = await this.repository.createFromPaidContract({ eventId: "contract-eligibility", customerId, contractId, invoiceId }, hash);
    if (!project) return "ineligible" as const;
    try {
      await this.email.sendAccess({ to: project.customerEmail, projectTitle: project.title, projectReference: project.projectReference, portalUrl: this.portalUrl, accessPassword: password });
      await this.repository.markEmail(project.id, "sent");
    } catch {
      await this.repository.markEmail(project.id, "failed");
    }
    return "activated" as const;
  }

  async list(customerId: string) {
    return (await this.repository.listOwned(customerId)).map((project) => ({ id: project.id, projectReference: project.projectReference, title: project.title, summary: project.summary, status: project.status, progressPercent: project.progressPercent, accessEnabled: project.accessEnabled, unlocked: Boolean(project.unlockedAt), completedAt: project.completedAt, maintenanceStartAt: project.maintenanceStartAt, maintenanceEndAt: project.maintenanceEndAt, satisfaction: project.satisfaction }));
  }

  async verify(id: string, customerId: string, password: string) {
    const project = await this.repository.getOwned(id, customerId);
    if (!project || !project.accessEnabled) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project access is unavailable.");
    if (!project.accessPasswordHash || !await verifyProjectAccessPassword(password, project.accessPasswordHash)) throw new ApiError(403, "PROJECT_ACCESS_INVALID", "The project access password is invalid.");
    await this.repository.unlock(id, customerId);
    return { projectId: id, unlocked: true };
  }

  async workspace(id: string, customerId: string) {
    await this.requireAccess(id, customerId);
    const result = await this.repository.workspace(id, customerId);
    if (!result) throw new ApiError(403, "PROJECT_ACCESS_REQUIRED", "Unlock this project before opening its workspace.");
    return { ...result, maintenanceScope: FREE_MAINTENANCE_SCOPE };
  }

  async message(id: string, customerId: string, body: string) {
    await this.requireAccess(id, customerId);
    if (body.trim().length < 1 || body.length > 4000) throw new ApiError(400, "VALIDATION_ERROR", "A message is required.");
    return { messageId: await this.repository.addMessage(id, customerId, body.trim()) };
  }

  async change(id: string, customerId: string, input: Record<string, unknown>) {
    await this.requireAccess(id, customerId);
    const title = String(input.title ?? "").trim(); const description = String(input.description ?? "").trim(); const category = String(input.category ?? "").trim(); const priority = String(input.priority ?? "normal");
    if (!title || !description || !category || !["low", "normal", "high"].includes(priority)) throw new ApiError(400, "VALIDATION_ERROR", "Valid change-request fields are required.");
    return { changeRequestId: await this.repository.addChangeRequest(id, customerId, { title, description, category, priority: priority as "low" | "normal" | "high" }) };
  }

  async satisfaction(id: string, customerId: string, input: Record<string, unknown>) {
    await this.requireAccess(id, customerId);
    const satisfaction = String(input.satisfaction);
    if (!["satisfied", "not_satisfied"].includes(satisfaction)) throw new ApiError(400, "VALIDATION_ERROR", "A satisfaction choice is required.");
    await this.repository.submitSatisfaction(id, customerId, { satisfaction: satisfaction as "satisfied" | "not_satisfied", comment: input.comment === undefined ? undefined : String(input.comment), category: input.category === undefined ? undefined : String(input.category), severity: ["low", "normal", "high"].includes(String(input.severity)) ? input.severity as "low" | "normal" | "high" : undefined, desiredResolution: input.desiredResolution === undefined ? undefined : String(input.desiredResolution) });
    return { recorded: true };
  }

  async regenerate(id: string) {
    const password = generateProjectAccessPassword(); const hash = await hashProjectAccessPassword(password); const project = await this.repository.regenerate(id, hash);
    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project was not found.");
    let deliveryStatus: "sent" | "failed" = "sent";
    try {
      await this.email.sendAccess({ to: project.customerEmail, projectTitle: project.title, projectReference: project.projectReference, portalUrl: this.portalUrl, accessPassword: password });
      await this.repository.markEmail(id, "sent");
    } catch { deliveryStatus = "failed"; await this.repository.markEmail(id, "failed"); }
    return { projectId: id, regenerated: true, deliveryStatus };
  }

  private async requireAccess(id: string, customerId: string) {
    const project = await this.repository.getOwned(id, customerId);
    if (!project || project.accessEnabled !== true || !project.unlockedAt) throw new ApiError(403, "PROJECT_ACCESS_REQUIRED", "Project access is unavailable.");
    return project;
  }
}
