import assert from "node:assert/strict";
import test from "node:test";
import { decideRequest, permitsAction } from "../src/ai/emmy/request-decision.ts";

test("current-turn polarity deterministically separates advisory, mutation, and approval", () => {
  const advisory = decideRequest("Review this page. Do not modify anything.");
  assert.equal(advisory.kind, "READ_ONLY");
  assert.equal(advisory.mutationIntent, false);
  assert.deepEqual(advisory.prohibitedMutations, ["all_mutations"]);
  assert.equal(permitsAction(advisory, "proposal"), false);

  const mutation = decideRequest("Change the homepage hero spacing to 24px.");
  assert.equal(mutation.kind, "MUTATION_REQUEST");
  assert.equal(mutation.selectedCapability, "frontend.source.propose");
  assert.equal(permitsAction(mutation, "proposal"), true);

  const approval = decideRequest("Approve and apply the pending frontend proposal.");
  assert.equal(approval.kind, "APPROVAL_RESPONSE");
  assert.equal(approval.requestedOutcome, "apply");
  assert.equal(approval.approvalRequired, true);
  assert.equal(permitsAction(approval, "approval"), true);
});

test("history resolves context but never supplies missing mutation authority", () => {
  const history = [{ role: "user" as const, content: "Create an unpublished blog draft about automation." }, { role: "assistant" as const, content: "Draft created." }];
  for (const message of ["Summarize it.", "What changed?", "Review the draft. Recommendations only."]) {
    const decision = decideRequest(message, history);
    assert.equal(decision.mutationIntent, false, message);
    assert.equal(permitsAction(decision, "proposal"), false, message);
  }
  const update = decideRequest("Change its title to Efficiency Guide.", history);
  assert.equal(update.kind, "MUTATION_REQUEST");
  assert.equal(update.mutationIntent, true);
});

test("negative instructions block only their corresponding operation", () => {
  const sourceProposal = decideRequest("Increase the homepage hero button spacing to 24px. Prepare the change for review only. Do not deploy.");
  assert.equal(sourceProposal.kind, "MUTATION_REQUEST");
  assert.equal(sourceProposal.selectedCapability, "frontend.source.propose");
  assert.deepEqual(sourceProposal.prohibitedMutations, ["deploy"]);

  const unpublished = decideRequest("Create an unpublished blog draft about automation. Do not publish it.");
  assert.equal(unpublished.kind, "MUTATION_REQUEST");
  assert.equal(unpublished.selectedCapability, "blog.draft.create");
  assert.deepEqual(unpublished.prohibitedMutations, ["publish"]);

  for (const message of ["Don't change anything; analyze the homepage.", "Review only. Do not modify any files.", "Recommendations only for the frontend."]) {
    assert.equal(permitsAction(decideRequest(message), "proposal"), false, message);
  }
});

test("Chat and controlled Task text produce the same operational decision", () => {
  const chat = "Review the homepage frontend. Do not modify anything. Return recommendations only.";
  const task = `${chat}\nAssigned specialist constraints: frontend, marketing, critic. Use the existing planner and mandatory dependency rules; do not bypass readiness or safety.`;
  const chatDecision = decideRequest(chat);
  const taskDecision = decideRequest(task);
  assert.equal(taskDecision.kind, chatDecision.kind);
  assert.equal(taskDecision.mutationIntent, chatDecision.mutationIntent);
  assert.equal(taskDecision.selectedCapability, chatDecision.selectedCapability);
  assert.deepEqual(taskDecision.prohibitedMutations, chatDecision.prohibitedMutations);
});

test("ambiguous mutation fails closed for clarification", () => {
  const decision = decideRequest("Change it and make it better.");
  assert.equal(decision.kind, "CLARIFICATION_REQUIRED");
  assert.equal(decision.mutationIntent, false);
  assert.deepEqual(decision.reasonCodes, ["TARGET_UNRESOLVED"]);
});

test("quoted mutation language never supplies current-turn write authority", () => {
  for (const message of ["What does ‘change the hero spacing’ mean?", "Explain the request \"create a blog draft\".", "Review the phrase 'apply that proposal'."]) {
    const decision = decideRequest(message);
    assert.equal(decision.mutationIntent, false, message);
    assert.equal(permitsAction(decision, "proposal"), false, message);
    assert.equal(permitsAction(decision, "approval"), false, message);
  }
});

test("unsupported mutations fail closed while negated operations remain advisory", () => {
  for (const message of ["Delete draft ABC12345.", "Publish the blog draft.", "Deploy the website.", "Send this to the customer."]) {
    const decision = decideRequest(message);
    assert.equal(decision.kind, "UNSUPPORTED", message);
    assert.equal(decision.mutationIntent, true, message);
    assert.deepEqual(decision.reasonCodes, ["ACTION_NOT_SUPPORTED"], message);
    assert.equal(permitsAction(decision, "proposal"), false, message);
  }
  for (const message of ["Review the code. Do not deploy.", "Create an unpublished blog draft. Do not publish it."]) {
    assert.notEqual(decideRequest(message).kind, "UNSUPPORTED", message);
  }
});
