import assert from "node:assert/strict";
import test from "node:test";
import { StubVerifier, request, userToken } from "./http-harness.ts";

test("protected route rejects a missing token with typed response", async () => {
  const response = await request("/api/v1/session");
  assert.equal(response.status, 401);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.error.code, "MISSING_TOKEN");
});

test("protected route rejects a malformed token", async () => {
  const response = await request("/api/v1/session", { authorization: "Basic no" });
  assert.equal(response.status, 401);
  assert.equal(response.payload.error.code, "INVALID_TOKEN");
});

test("invalid Firebase token is mapped without leaking token details", async () => {
  const error = Object.assign(new Error("sensitive provider detail"), { code: "auth/argument-error" });
  const response = await request("/api/v1/session", { authorization: "Bearer private-token", verifier: new StubVerifier(error) });
  assert.equal(response.status, 401);
  assert.equal(response.payload.error.code, "INVALID_TOKEN");
  assert.doesNotMatch(JSON.stringify(response.payload), /private-token|sensitive provider detail/);
});

test("expired Firebase token is distinguishable", async () => {
  const error = Object.assign(new Error("expired"), { code: "auth/id-token-expired" });
  const response = await request("/api/v1/session", { authorization: "Bearer expired", verifier: new StubVerifier(error) });
  assert.equal(response.status, 401);
  assert.equal(response.payload.error.code, "TOKEN_EXPIRED");
});

test("authenticated session contains only frontend-safe identity data", async () => {
  const response = await request("/api/v1/session", { authorization: "Bearer valid" });
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload.data, {
    userId: "user-1", email: "user@example.com", displayName: "Test User", role: "user", isAdmin: false,
  });
  assert.equal(response.payload.data.firebase, undefined);
});

test("admin session denies an ordinary authenticated user", async () => {
  const response = await request("/api/v1/admin/session", { authorization: "Bearer valid" });
  assert.equal(response.status, 403);
  assert.equal(response.payload.error.code, "INSUFFICIENT_PERMISSIONS");
});

test("admin session accepts the existing owner custom claim", async () => {
  const response = await request("/api/v1/admin/session", {
    authorization: "Bearer valid", verifier: new StubVerifier({ ...userToken, role: "owner", permissions: ["admin:access"] }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.payload.data.role, "owner");
  assert.equal(response.payload.data.isAdmin, true);
  assert.deepEqual(response.payload.data.permissions, ["admin:access"]);
});

test("request ID is propagated through headers and response envelope", async () => {
  const response = await request("/api/v1/session", { authorization: "Bearer valid", requestId: "caller-request-123" });
  assert.equal(response.headers.get("x-request-id"), "caller-request-123");
  assert.equal(response.payload.requestId, "caller-request-123");
});
