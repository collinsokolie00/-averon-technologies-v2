import type { WorkspaceNotificationCategory, WorkspaceNotificationDestination, WorkspaceNotificationSeverity } from "@averon/shared-types";

/** Authoritative extension point for booking, order, quote, request and customer systems. Producers must emit only after their durable domain event commits. */
export interface AuthoritativeWorkspaceEvent {
  eventId: string;
  workspaceId: string;
  businessId?: string;
  eventType: "booking.received" | "order.received" | "quote.received" | "service_request.received" | "customer.message" | "integration.failed";
  category: Extract<WorkspaceNotificationCategory, "BOOKING" | "ORDER" | "CUSTOMER_ACTIVITY" | "BUSINESS_EVENT" | "SYSTEM_HEALTH">;
  severity: WorkspaceNotificationSeverity;
  title: string;
  conciseMessage: string;
  relatedEntityId?: string;
  destination?: WorkspaceNotificationDestination;
  occurredAt: string;
}
