import test from "node:test";
import assert from "node:assert/strict";
import { workspaceLogo, workspaceLogoBySlug } from "../src/workspace-identity-config.ts";

test("one canonical workspace identity mapping connects the supplied logos", () => { assert.equal(workspaceLogo({ slug: "averon", logoUrl: undefined }), "/workspaces/averon-technologies.png"); assert.equal(workspaceLogo({ slug: "lumora", logoUrl: undefined }), "/workspaces/lumora.png"); assert.equal(workspaceLogo({ slug: "movento", logoUrl: undefined }), "/workspaces/movento.png"); assert.equal(workspaceLogo({ slug: "future", logoUrl: undefined }), undefined); assert.equal(workspaceLogo({ slug: "future", logoUrl: "/workspaces/future.png" }), "/workspaces/future.png"); assert.equal(Object.isFrozen(workspaceLogoBySlug), true); });
