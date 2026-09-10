import { describe, expect, it, vi } from "vitest";
vi.mock("../src/firebase", () => ({ firebaseAuth: { currentUser: null }, googleAuthProvider: {} }));
import type { AiDiagnostic } from "@averon/shared-types";
import { diagnosticStatus } from "../src/diagnostics-presentation";
const item = { finalStatus: "completed", operationStatus: "awaiting_approval" } as AiDiagnostic;
describe("diagnostics operation lifecycle", () => { it("renders authoritative pending operation instead of completed orchestration", () => { expect(diagnosticStatus(item)).toBe("awaiting approval"); expect(diagnosticStatus({ ...item, operationStatus: "applying" })).toBe("applying"); expect(diagnosticStatus({ ...item, operationStatus: "verifying" })).toBe("verifying"); expect(diagnosticStatus({ ...item, operationStatus: "rolled_back" })).toBe("rolled back"); expect(diagnosticStatus({ ...item, operationStatus: "no_change_required" })).toBe("no change required"); }); });
