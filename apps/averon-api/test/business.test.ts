import assert from "node:assert/strict";
import test from "node:test";
import { FirebaseBusinessRepository, type BusinessRepository } from "../src/domains/business/business.repository.ts";
import { emptyBusinessRepository, request, StubVerifier, userToken } from "./http-harness.ts";

const admin = new StubVerifier({ ...userToken, role: "admin" });

test("business collection rejects unauthenticated access", async () => {
  const response = await request("/api/v1/business/quotes");
  assert.equal(response.status, 401);
});

test("business collection rejects non-admin users", async () => {
  const response = await request("/api/v1/business/quotes", { authorization: "Bearer valid" });
  assert.equal(response.status, 403);
  assert.equal(response.payload.error.code, "INSUFFICIENT_PERMISSIONS");
});

test("admin receives an honest empty collection", async () => {
  const response = await request("/api/v1/business/quotes", { authorization: "Bearer valid", verifier: admin });
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload.data, { items: [] });
});

test("quote submission rejects privileged field injection", async () => {
  const response = await request("/api/v1/quotes", { method: "POST", authorization: "Bearer valid", body: {
    customerEmail: "user@example.com", customerName: "User Name", company: "Averon", projectType: "Website", budget: "1000", message: "Please build the project.", status: "approved",
  } });
  assert.equal(response.status, 400);
  assert.equal(response.payload.error.code, "UNKNOWN_FIELDS");
});

test("public contact quote submission requires no authentication and has no customer identity", async () => {
  let capturedCustomerId: string | null | undefined;
  const repository: BusinessRepository = { ...emptyBusinessRepository, async createQuote(customerId) { capturedCustomerId = customerId; return "public-quote-1"; } };
  const response = await request("/api/v1/public/quotes", { method: "POST", repository, body: {
    customerEmail: "visitor@example.com", customerName: "Public Visitor", company: "Visitor Co", projectType: "Website", budget: "not-sure", message: "Please contact me about this public project inquiry.",
  } });
  assert.equal(response.status, 201);
  assert.equal(response.payload.data.quoteId, "public-quote-1");
  assert.equal(capturedCustomerId, null);
});

test("public contact quote submission uses existing strict validation", async () => {
  const response = await request("/api/v1/public/quotes", { method: "POST", body: {
    customerEmail: "not-an-email", customerName: "Public Visitor", company: "", projectType: "Website", budget: "not-sure", message: "Please contact me about this public project inquiry.",
  } });
  assert.equal(response.status, 400);
  assert.equal(response.payload.error.code, "VALIDATION_ERROR");
});

test("customer profile initialization is authenticated and server-scoped to the token user", async () => {
  let capturedUserId = "";
  const repository: BusinessRepository = { ...emptyBusinessRepository, async upsertCustomerProfile(auth, input) { capturedUserId = auth.userId; return { id: auth.userId, uid: auth.userId, email: auth.email ?? "", name: input.name ?? "Test User", company: input.company ?? "Averon Customer", emailVerified: auth.emailVerified, portalStatus: "pending" }; } };
  const response = await request("/api/v1/customer/profile", { method: "POST", authorization: "Bearer valid", repository, body: { name: "Test User", company: "Test Company", authProvider: "password" } });
  assert.equal(response.status, 200);
  assert.equal(capturedUserId, "user-1");
  assert.equal(response.payload.data.id, "user-1");
});

test("customer profile initialization rejects unauthenticated and identity-injection requests", async () => {
  const unauthenticated = await request("/api/v1/customer/profile", { method: "POST", body: {} });
  assert.equal(unauthenticated.status, 401);
  const injected = await request("/api/v1/customer/profile", { method: "POST", authorization: "Bearer valid", body: { customerId: "other-user" } });
  assert.equal(injected.status, 400);
  assert.equal(injected.payload.error.code, "UNKNOWN_FIELDS");
});

test("invalid business record ID is rejected", async () => {
  const response = await request("/api/v1/messages/bad%20id/read", { method: "PATCH", authorization: "Bearer valid", verifier: admin, body: {} });
  assert.equal(response.status, 400);
  assert.equal(response.payload.error.code, "INVALID_ID");
});

test("notification ownership is enforced by repository scope", async () => {
  const repository: BusinessRepository = { ...emptyBusinessRepository, async markNotificationRead(_id, customerId) { return customerId === "other-user"; } };
  const response = await request("/api/v1/notifications/notice-1/read", { method: "PATCH", authorization: "Bearer valid", repository, body: {} });
  assert.equal(response.status, 404);
});

test("notification listing is scoped to the authenticated token user", async () => {
  let capturedCustomerId = "";
  const repository: BusinessRepository = { ...emptyBusinessRepository, async listNotifications(customerId) { capturedCustomerId = customerId; return []; } };
  const response = await request("/api/v1/notifications", { authorization: "Bearer valid", repository });
  assert.equal(response.status, 200);
  assert.equal(capturedCustomerId, "user-1");
  assert.deepEqual(response.payload.data.items, []);
});

test("customer portal projection is server-scoped to the authenticated customer", async () => {
  let capturedCustomerId = "";
  const repository: BusinessRepository = { ...emptyBusinessRepository, async customerPortal(customerId) { capturedCustomerId = customerId; return { profile: { id: customerId, name: "Test User" }, quotes: [{ id: "quote-1", customerId }], contracts: [], invoices: [], messages: [], notifications: [] }; } };
  const response = await request("/api/v1/customer/portal", { authorization: "Bearer valid", repository });
  assert.equal(response.status, 200);
  assert.equal(capturedCustomerId, "user-1");
  assert.equal(response.payload.data.quotes[0].customerId, "user-1");
});

test("customer-scoped collection reads do not require undeployed composite indexes", async () => {
  let orderByCalled = false; let scopedCustomer = "";
  const docs = [{ id: "older", data: () => ({ customerId: "user-1", createdAt: { toMillis: () => 1 } }) }, { id: "newer", data: () => ({ customerId: "user-1", createdAt: { toMillis: () => 2 } }) }];
  const query = { where(_field: string, _operator: string, value: string) { scopedCustomer = value; return { get: async () => ({ docs }) }; }, orderBy() { orderByCalled = true; throw new Error("The query requires an index."); } };
  const repository = new FirebaseBusinessRepository({ collection: () => query } as never);
  const items = await repository.list("quotes", "user-1");
  assert.equal(scopedCustomer, "user-1"); assert.equal(orderByCalled, false); assert.deepEqual(items.map((item) => item.id), ["newer", "older"]);
});

test("customer profile preferences persist through the authenticated profile boundary", async () => {
  let captured: unknown;
  const repository: BusinessRepository = { ...emptyBusinessRepository, async upsertCustomerProfile(auth, input) { captured = { auth, input }; return { id: auth.userId, ...input }; } };
  const response = await request("/api/v1/customer/profile", { method: "PATCH", authorization: "Bearer valid", repository, body: { name: "Customer", company: "Company", phone: "+39 123", notificationPreference: "weekly", communicationPreference: "portal" } });
  assert.equal(response.status, 200);
  assert.equal((captured as { auth: { userId: string } }).auth.userId, "user-1");
  assert.equal((captured as { input: { notificationPreference: string } }).input.notificationPreference, "weekly");
});

test("customer message creation and read updates enforce token ownership", async () => {
  let createdFor = ""; let readFor = "";
  const repository: BusinessRepository = { ...emptyBusinessRepository, async createCustomerMessage(customerId) { createdFor = customerId; return "message-1"; }, async markCustomerMessageRead(_id, customerId) { readFor = customerId; return true; } };
  const created = await request("/api/v1/customer/messages", { method: "POST", authorization: "Bearer valid", repository, body: { subject: "Project question", body: "Could you share an update?" } });
  const read = await request("/api/v1/customer/messages/message-1", { method: "PATCH", authorization: "Bearer valid", repository, body: {} });
  assert.equal(created.status, 201); assert.equal(read.status, 200); assert.equal(createdFor, "user-1"); assert.equal(readFor, "user-1");
});

test("customer portal endpoints reject unauthenticated access and profile field injection", async () => {
  assert.equal((await request("/api/v1/customer/portal")).status, 401);
  const injected = await request("/api/v1/customer/profile", { method: "PATCH", authorization: "Bearer valid", body: { portalStatus: "active" } });
  assert.equal(injected.status, 400); assert.equal(injected.payload.error.code, "UNKNOWN_FIELDS");
});

test("admin dashboard returns zeroes from empty real collections", async () => {
  const response = await request("/api/v1/admin/dashboard", { authorization: "Bearer valid", verifier: admin });
  assert.equal(response.status, 200);
  assert.equal(response.payload.data.users, 0);
  assert.equal(response.payload.data.payments, 0);
});
