import { ApiError } from "../../errors/api-error.ts";
import { requireAdmin } from "../../services/auth/authorization.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { BusinessRepository } from "./business.repository.ts";
import { parseCollection, parseContractAssignment, parseCustomerProfileInput, parseId, parseQuoteReply, parseQuoteSubmission } from "./business.schemas.ts";

export async function handleBusinessRoute(input: {
  method: string; path: string; body: unknown; auth: AuthContext; repository: BusinessRepository;
}): Promise<{ status: number; data: unknown } | null> {
  const segments = input.path.split("/").filter(Boolean).slice(2);
  if (!segments.length) return null;
  const [domain, id, action] = segments;
  if (input.method === "POST" && domain === "customer" && id === "profile") {
    return { status: 200, data: await input.repository.upsertCustomerProfile(input.auth.user, parseCustomerProfileInput(input.body)) };
  }
  if (input.method === "PATCH" && domain === "customer" && id === "profile") {
    return { status: 200, data: await input.repository.upsertCustomerProfile(input.auth.user, parseCustomerProfileInput(input.body)) };
  }
  if (input.method === "GET" && domain === "customer" && id === "portal") {
    return { status: 200, data: await input.repository.customerPortal(input.auth.user.userId) };
  }
  if (input.method === "POST" && domain === "customer" && id === "messages") {
    const body = input.body as Record<string, unknown>; const subject = typeof body?.subject === "string" ? body.subject.trim() : ""; const message = typeof body?.body === "string" ? body.body.trim() : "";
    if (Object.keys(body ?? {}).some((key) => !["subject", "body"].includes(key)) || subject.length < 1 || subject.length > 160 || message.length < 1 || message.length > 4000) throw new ApiError(400, "VALIDATION_ERROR", "A valid subject and message are required.");
    return { status: 201, data: { messageId: await input.repository.createCustomerMessage(input.auth.user.userId, { subject, body: message }) } };
  }
  if (input.method === "PATCH" && domain === "customer" && id === "messages" && action) {
    if (!await input.repository.markCustomerMessageRead(parseId(action), input.auth.user.userId)) throw new ApiError(404, "NOT_FOUND", "Message was not found.");
    return { status: 200, data: { messageId: action, status: "read" } };
  }
  if (input.method === "POST" && domain === "quotes" && !id) {
    const quoteId = await input.repository.createQuote(input.auth.user.userId, parseQuoteSubmission(input.body));
    return { status: 201, data: { quoteId } };
  }
  if (input.method === "GET" && domain === "notifications" && !id) {
    return { status: 200, data: { items: await input.repository.listNotifications(input.auth.user.userId) } };
  }
  if (input.method === "PATCH" && domain === "notifications" && id && action === "read") {
    if (!await input.repository.markNotificationRead(parseId(id), input.auth.user.userId)) throw new ApiError(404, "NOT_FOUND", "Notification was not found.");
    return { status: 200, data: { notificationId: id, status: "read" } };
  }
  if (input.method === "PATCH" && domain === "contracts" && id && action === "sign") {
    const body = input.body as Record<string, unknown>; const signature = typeof body?.typedSignature === "string" ? body.typedSignature.trim() : "";
    if (Object.keys(body ?? {}).some((key) => key !== "typedSignature") || signature.length < 2 || signature.length > 160) throw new ApiError(400, "VALIDATION_ERROR", "A valid typedSignature is required.");
    if (!await input.repository.signContract(parseId(id), input.auth.user.userId, input.auth.user.email, signature)) throw new ApiError(404, "NOT_FOUND", "Contract was not found.");
    return { status: 200, data: { contractId: id, status: "signed" } };
  }
  requireAdmin(input.auth);
  if (input.method === "GET" && domain === "admin" && id === "dashboard") {
    const names = ["users", "quotes", "contracts", "invoices", "payments", "messages", "notifications"] as const;
    const records = await Promise.all(names.map((name) => input.repository.list(name)));
    return { status: 200, data: Object.fromEntries(names.map((name, index) => [name, records[index].length])) };
  }
  if (input.method === "GET" && domain === "business" && id) {
    const collection = parseCollection(id); return { status: 200, data: { items: await input.repository.list(collection) } };
  }
  if (input.method === "PATCH" && domain === "quotes" && id) {
    await input.repository.replyToQuote(parseId(id), parseQuoteReply(input.body), input.auth.user.userId, input.auth.user.email); return { status: 200, data: { quoteId: id } };
  }
  if (input.method === "POST" && domain === "contracts" && !id) {
    return { status: 201, data: await input.repository.assignContract(parseContractAssignment(input.body), input.auth.user.userId, input.auth.user.email) };
  }
  if (input.method === "PATCH" && domain === "messages" && id && action === "read") {
    await input.repository.markMessageRead(parseId(id), input.auth.user.userId, input.auth.user.email); return { status: 200, data: { messageId: id, status: "read" } };
  }
  return null;
}
