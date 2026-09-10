import assert from "node:assert/strict";
import test from "node:test";
import { guardianRepairCommand } from "../src/ai/emmy/private-emmy.ts";

test("Guardian rollback requires an exact current-turn repair-plan ID", () => { const id = "guardian-repair-1234567890abcdef12345678"; assert.deepEqual(guardianRepairCommand(`Rollback Guardian repair plan ${id}.`), { action: "rollback", repairPlanId: id }); assert.equal(guardianRepairCommand("rollback it"), null); assert.equal(guardianRepairCommand("yes, rollback"), null); assert.deepEqual(guardianRepairCommand(`Rollback Guardian repair plan guardian-repair-aaaaaaaaaaaaaaaaaaaaaaaa.`), { action: "rollback", repairPlanId: "guardian-repair-aaaaaaaaaaaaaaaaaaaaaaaa" }); });
