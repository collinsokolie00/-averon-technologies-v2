import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryRateLimitStore, RateLimiter } from "../src/ai/emmy/rate-limiter.ts";
import { loadServerEnvironment } from "../src/config/environment.ts";
import { ApiError } from "../src/errors/api-error.ts";
import { formatLogEntry } from "../src/logger.ts";
import { buildCapabilityRegistry } from "../src/runtime/capabilities.ts";
import { request, readyCapabilities } from "./http-harness.ts";
import { ACTION_RUNTIME_FINGERPRINT } from "../src/app.ts";
import { ACTION_DEPENDENCY_FINGERPRINT } from "../src/ai/actions/action-capabilities.ts";
import { BLOG_UPDATE_ADAPTER_FINGERPRINT } from "../src/domains/blog-drafts/blog-draft.payload-adapter.ts";

test("health, readiness, and safe version metadata are distinct", async () => {
  const health = await request("/health");
  const ready = await request("/ready");
  const version = await request("/api/v1/version");
  assert.equal(health.payload.data.status, "ok");
  assert.equal(ready.payload.data.status, "ready");
  assert.deepEqual(ready.payload.data.capabilities, readyCapabilities);
  assert.equal(version.payload.data.service, "averon-api"); assert.equal(version.payload.data.version, "test"); assert.equal(version.payload.data.environment, "test"); assert.equal(version.payload.data.build, "test-build"); assert.equal(typeof version.payload.data.runtimeStartedAt, "string"); assert.equal(version.payload.data.actionRuntimeFingerprint, ACTION_RUNTIME_FINGERPRINT); assert.equal(version.payload.data.actionDependencyFingerprint, ACTION_DEPENDENCY_FINGERPRINT); assert.equal(version.payload.data.blogUpdateAdapterFingerprint, BLOG_UPDATE_ADAPTER_FINGERPRINT);
});

test("missing core configuration is not ready while optional capabilities are disabled safely", async () => {
  const capabilities = buildCapabilityRegistry({});
  const result = await request("/ready", { capabilities });
  assert.equal(result.status, 503);
  assert.equal(result.payload.data.status, "not_ready");
  assert.equal((result.payload.data.capabilities as Record<string, { state: string }>).emmy.state, "disabled");
  assert.equal(JSON.stringify(result.payload).includes("secret-value"), false);
});

test("optional capability gaps produce degraded readiness without secret values", async () => {
  const capabilities = buildCapabilityRegistry({ FIREBASE_PROJECT_ID: "project", DEEPSEEK_API_KEY: "secret-value" });
  const result = await request("/ready", { capabilities });
  assert.equal(result.status, 200);
  assert.equal(result.payload.data.status, "degraded");
  assert.equal(JSON.stringify(result.payload).includes("secret-value"), false);
});

test("environment validation rejects unsafe origins, invalid JSON credentials, and timeouts", () => {
  assert.throws(() => loadServerEnvironment({ CORS_ALLOWED_ORIGINS: "https://example.com/path" }), /Invalid CORS origin/);
  assert.throws(() => loadServerEnvironment({ FIREBASE_SERVICE_ACCOUNT_JSON: "not-json" }), /valid JSON/);
  assert.throws(() => loadServerEnvironment({ STRIPE_TIMEOUT_MS: "0" }), /STRIPE_TIMEOUT_MS/);
});

test("rate-limit store supports thresholds, independent keys, and deterministic reset", async () => {
  let now = 1_000;
  const store = new InMemoryRateLimitStore(() => now);
  const limiter = new RateLimiter(store, 2, 100, "TEST_LIMITED", "limited");
  await limiter.check("a"); await limiter.check("a"); await limiter.check("b");
  await assert.rejects(() => limiter.check("a"), (error: ApiError) => error.code === "TEST_LIMITED");
  now = 1_100;
  assert.equal((await limiter.check("a")).count, 1);
});

test("CORS permits configured apps, denies unknown browsers, and permits server-to-server requests", async () => {
  for (const origin of ["https://averon.example", "https://emmy.example"]) {
    const result = await request("/health", { headers: { origin }, allowedOrigins: ["https://averon.example", "https://emmy.example"] });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("access-control-allow-origin"), origin);
  }
  const preflight = await request("/api/v1/emmy/conversations/owned", { method: "OPTIONS", headers: { origin: "https://emmy.example" }, allowedOrigins: ["https://emmy.example"] });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /(?:^|,\s*)DELETE(?:,|$)/);
  const denied = await request("/health", { headers: { origin: "https://unknown.example" }, allowedOrigins: ["https://averon.example"] });
  assert.equal(denied.status, 403);
  assert.equal(denied.payload.error.code, "CORS_ORIGIN_DENIED");
  assert.equal((await request("/health", { allowedOrigins: ["https://averon.example"] })).status, 200);
});

test("body limits accept normal JSON, reject oversized Emmy JSON, and preserve webhook raw parsing", async () => {
  assert.equal((await request("/api/v1/emmy/messages", { method: "POST", body: { message: "hello" } })).status, 200);
  const oversized = await request("/api/v1/emmy/messages", { method: "POST", rawBody: JSON.stringify({ message: "x".repeat(40_000) }) });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.payload.error.code, "REQUEST_TOO_LARGE");
  const webhook = await request("/api/v1/webhooks/stripe", { method: "POST", rawBody: Buffer.alloc(256_000, 1), headers: { "stripe-signature": "test" } });
  assert.equal(webhook.status, 200);
});

test("structured logging redacts credentials and does not require request bodies", () => {
  const entry = formatLogEntry("info", "request_completed", { requestId: "one", authorization: "Bearer secret", apiKey: "secret", method: "POST", route: "/api/v1/emmy/messages" });
  assert.equal(entry.includes("Bearer secret"), false);
  assert.equal(entry.includes('"apiKey":"secret"'), false);
  assert.equal(entry.includes("customer prompt"), false);
  assert.match(entry, /averon-api/);
});
