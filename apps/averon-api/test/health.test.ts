import assert from "node:assert/strict";
import test from "node:test";
import { request } from "./http-harness.ts";

test("health endpoint returns the shared response envelope", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(response.payload.success, true);
  assert.equal(response.payload.data.service, "averon-api");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
});
