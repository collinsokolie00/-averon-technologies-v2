import assert from "node:assert/strict";
import test from "node:test";
import { AVERON_PUBLIC_METADATA } from "@averon/shared-types";
import { PageMetadataService } from "../src/domains/page-metadata/page-metadata.service.ts";
import { MemoryPageMetadataRepository, request } from "./http-harness.ts";

test("canonical metadata repository reads by workspace page and route without cross-workspace leakage", async () => {
  const repository = new MemoryPageMetadataRepository(Object.values(AVERON_PUBLIC_METADATA));
  const service = new PageMetadataService(repository);
  assert.deepEqual(await service.read("averon", "home"), AVERON_PUBLIC_METADATA.home);
  assert.deepEqual(await service.readByRoute("averon", "/services"), AVERON_PUBLIC_METADATA.services);
  assert.equal(await service.read("movento", "home"), null);
  assert.equal(await service.readByRoute("movento", "/services"), null);
});

test("public metadata reader returns the same canonical repository record", async () => {
  const repository = new MemoryPageMetadataRepository(Object.values(AVERON_PUBLIC_METADATA));
  const result = await request("/api/v1/public/workspaces/averon/page-metadata/services", { pageMetadataRepository: repository });
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload.data, AVERON_PUBLIC_METADATA.services);
  const other = await request("/api/v1/public/workspaces/movento/page-metadata/services", { pageMetadataRepository: repository });
  assert.equal(other.status, 404);
});

test("seed is idempotent and preserves existing canonical records", async () => {
  const repository = new MemoryPageMetadataRepository([AVERON_PUBLIC_METADATA.home]);
  assert.equal(await repository.seed(Object.values(AVERON_PUBLIC_METADATA)), 4);
  assert.equal(await repository.seed(Object.values(AVERON_PUBLIC_METADATA)), 0);
  assert.equal((await repository.get("averon", "home"))?.title, AVERON_PUBLIC_METADATA.home.title);
});
