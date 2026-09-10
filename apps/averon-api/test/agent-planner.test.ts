import assert from "node:assert/strict";
import test from "node:test";
import { MAX_SPECIALIST_TASKS, TaskPlanner } from "../src/ai/agents/planner.ts";
import { actionCapabilityDeclaration } from "../src/ai/actions/action-capabilities.ts";

const planner = new TaskPlanner();
test("supported blog write actions declare Blog independently of keyword routing", () => { for (const actionType of ["blog.draft.create", "blog.draft.update"] as const) assert.deepEqual(actionCapabilityDeclaration(actionType)?.requiredSkills, ["content.blog_drafting"]); });
test("planner keeps simple Business OS questions on direct Emmy path", () => { assert.deepEqual(planner.plan("What is Movento's brand tone?"), { directAnswerPossible: true, tasks: [] }); });
for (const [label, message, agentId] of [["SEO", "Recommend SEO keywords", "seo"], ["blog", "Draft a blog article", "blog"], ["research", "Research this market", "research"], ["analytics", "Analyze performance metrics", "analytics"], ["documentation", "Create an internal SOP document", "documentation"]] as const) test(`planner routes ${label}`, () => { assert.equal(planner.plan(message).tasks[0].agentId, agentId); });
test("planner creates SEO before a dependent blog task", () => { const plan = planner.plan("Create a blog article and make it SEO friendly"); const seo = plan.tasks.find((item) => item.agentId === "seo")!; const blog = plan.tasks.find((item) => item.agentId === "blog")!; assert.deepEqual(blog.dependencies, [seo.taskId]); });
for (const [message, expectedSkills] of [
  ["Update draft Abcd1234 and change the title", ["content.blog_drafting"]],
  ["Update draft Abcd1234 and improve SEO metadata", ["content.blog_drafting", "seo.content_strategy"]],
  ["Update draft Abcd1234 and strengthen CTA", ["content.blog_drafting"]],
  ["Update draft Abcd1234 and improve title, CTA and SEO", ["content.blog_drafting", "seo.content_strategy"]],
] as const) test(`action capability dependencies are mandatory for: ${message}`, () => {
  const declaration = actionCapabilityDeclaration("blog.draft.update")!;
  assert.deepEqual(planner.capabilities(message, [], declaration.requiredSkills).requiredSkills, expectedSkills);
});
test("coordinated GTM prompt keeps Marketing and Research within the specialist budget", () => { const message = "Create a coordinated go-to-market plan. Analyze our positioning, identify SEO opportunities, and define research on the market and competitors."; const capabilities = planner.capabilities(message); assert.deepEqual(capabilities.requiredSkills, ["research.internal_synthesis", "marketing.strategy"]); assert.deepEqual(capabilities.optionalSkills, ["seo.content_strategy"]); assert.deepEqual(planner.plan(message).tasks.map((item) => item.agentId).sort(), ["marketing", "research"]); });
test("planner is deterministic, bounded, and leaves unsupported tasks with Emmy", () => { const message = "research SEO blog analytics documentation deployment email"; assert.deepEqual(planner.plan(message), planner.plan(message)); assert.ok(planner.plan(message).tasks.length <= MAX_SPECIALIST_TASKS); assert.equal(planner.plan("Please deploy the website").directAnswerPossible, true); });
test("contextual conversational follow-ups stay with Emmy without specialist orchestration", () => { const history = [{ role: "user" as const, content: "Analyze these metrics" }, { role: "assistant" as const, content: "Earlier response" }]; for (const message of ["go on", "continue", "what happened?", "go on, what happened?", "try again", "explain that", "what do you mean?"]) { const result = planner.capabilities(message, history); assert.equal(result.directAnswerPossible, true, message); assert.deepEqual(result.requiredSkills, []); } });
test("an explicit specialist follow-up still routes to the requested capability", () => { const history = [{ role: "assistant" as const, content: "Earlier response" }]; const result = planner.capabilities("Continue with a frontend accessibility analysis", history); assert.equal(result.directAnswerPossible, false); assert.ok(result.requiredSkills.includes("development.frontend_analysis")); });
test("SOP acceptance criteria do not over-select Testing without QA intent", () => { const prompt = "Draft internal documentation and an SOP for optimizing our business operations workflow, including responsibilities, handoffs, escalation steps, and measurable acceptance criteria."; assert.deepEqual(planner.plan(prompt).tasks.map((item) => item.agentId).sort(), ["business-operations", "documentation"]); });
test("explicit testing acceptance criteria still select Testing", () => { const result = planner.plan("Draft an SOP and define QA acceptance criteria and regression test cases"); assert.ok(result.tasks.some((item) => item.agentId === "testing")); assert.ok(result.tasks.some((item) => item.agentId === "documentation")); });
