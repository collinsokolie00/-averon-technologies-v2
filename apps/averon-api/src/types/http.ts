import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthContext, TokenVerifier } from "../services/auth/authentication.ts";
import type { BusinessRepository } from "../domains/business/business.repository.ts";
import type { PaymentService } from "../domains/payments/payment.service.ts";
import type { PaymentProvider } from "../providers/payments/stripe/stripe.adapter.ts";
import type { EmmyService } from "../ai/emmy/emmy.service.ts";
import type { RateLimiter } from "../ai/emmy/rate-limiter.ts";
import type { CapabilityRegistry } from "../runtime/capabilities.ts";
import type { WorkspaceAuthorizationService } from "../domains/workspaces/workspace.service.ts";
import type { BusinessOsService } from "../domains/business-os/business-os.service.ts";
import type { PrivateEmmyService } from "../ai/emmy/private-emmy.ts";
import type { DiagnosticsStore } from "../ai/diagnostics/diagnostics.store.ts";
import type { ProjectService } from "../domains/projects/project.service.ts";
import type { ProjectRepository } from "../domains/projects/project.repository.ts";
import type { ConversationService } from "../domains/emmy-conversations/conversation.service.ts";
import type { BlogDraftActionService } from "../domains/blog-drafts/blog-draft.actions.ts";
import type { PageMetadataService } from "../domains/page-metadata/page-metadata.service.ts";
import type { SeoMetadataActionService } from "../domains/page-metadata/page-metadata.actions.ts";
import type { PageContentService } from "../domains/page-content/page-content.service.ts";
import type { PageContentActionService } from "../domains/page-content/page-content.actions.ts";
import type { FrontendSourceActionService } from "../domains/frontend-source/frontend-source.actions.ts";
import type { BackendSourceActionService } from "../domains/backend-source/backend-source.actions.ts";
import type { WorkspaceNotificationService } from "../domains/workspace-notifications/workspace-notification.service.ts";
import type { WorkspaceTaskService } from "../domains/workspace-tasks/workspace-task.service.ts";
import type { WorkspaceAutomationService } from "../domains/workspace-automations/workspace-automation.service.ts";
import type { WorkspaceAutomationRunner } from "../domains/workspace-automations/workspace-automation.runner.ts";
import type { GuardianService } from "../domains/guardian/guardian.service.ts";

export interface RequestContext {
  requestId: string;
  request: IncomingMessage;
  response: ServerResponse;
  auth?: AuthContext;
}

export interface AppDependencies { tokenVerifier: TokenVerifier; businessRepository: BusinessRepository; paymentService: PaymentService; paymentProvider: PaymentProvider; emmyService: EmmyService; privateEmmyService: PrivateEmmyService; conversationService: ConversationService; blogDraftActions: BlogDraftActionService; pageMetadataService: PageMetadataService; seoMetadataActions: SeoMetadataActionService; pageContentService: PageContentService; pageContentActions: PageContentActionService; frontendSourceActions: FrontendSourceActionService; backendSourceActions: BackendSourceActionService; aiDiagnostics: DiagnosticsStore; emmyRateLimiter: RateLimiter; privateEmmyRateLimiter: RateLimiter; checkoutRateLimiter: RateLimiter; projectAccessRateLimiter: RateLimiter; projectService: ProjectService; projectRepository: ProjectRepository; capabilities: CapabilityRegistry; workspaceService: WorkspaceAuthorizationService; businessOsService: BusinessOsService }
export interface AppDependencies { workspaceNotificationService?: WorkspaceNotificationService }
export interface AppDependencies { workspaceTaskService?: WorkspaceTaskService }
export interface AppDependencies { workspaceAutomationService?: WorkspaceAutomationService }
export interface AppDependencies { workspaceAutomationRunner?: WorkspaceAutomationRunner }
export interface AppDependencies { guardianService?: GuardianService }
