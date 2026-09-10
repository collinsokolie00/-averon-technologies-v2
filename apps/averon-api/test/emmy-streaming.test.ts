import test from "node:test";
import assert from "node:assert/strict";
import type { AiProvider, AiProviderRequest, AiProviderStreamOptions } from "../src/ai/providers/ai-provider.ts";
import { MemoryBusinessOsRepository, MemoryConversationRepository, MemoryWorkspaceRepository, request } from "./http-harness.ts";

function workspace() { return new MemoryWorkspaceRepository({ businesses: [{ id: "averon", name: "Averon Technologies", slug: "averon", status: "active" }], workspaces: [{ id: "averon", businessId: "averon", name: "Averon Technologies", slug: "averon", status: "active" }], memberships: [{ id: "averon__user-1", userId: "user-1", workspaceId: "averon", businessId: "averon", role: "owner", status: "active" }] }); }
function businessOs() { const repo = new MemoryBusinessOsRepository(); repo.roots.set("averon", { workspaceId: "averon", businessId: "averon", status: "active", schemaVersion: 1 }); return repo; }
function events(raw: string) { return raw.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>); }

class StreamingProvider implements AiProvider {
  streamed = false; specialistCalls: string[] = []; streamRequest?: AiProviderRequest;
  async generate(input: AiProviderRequest) { const agentId = input.observability?.agentId; if (!agentId) return { text: "unused" }; this.specialistCalls.push(agentId); const taskId = /"taskId":"([^"]+)"/.exec(input.messages[0]?.content ?? "")?.[1] ?? `task-${agentId}`; const version = `${agentId}.v1`; const output = agentId === "seo" ? { targetIntent: "informational", suggestedKeywords: ["AI automation"], titleSuggestions: ["AI Automation Guide"], metaDescriptionSuggestions: ["A practical AI automation guide."], contentOutline: ["Introduction"], limitations: ["External metrics were not supplied."] } : { title: "AI Automation Guide", summary: "A practical guide.", body: "Advisory article draft.", suggestedSlug: "ai-automation-guide", callToAction: "Contact Averon.", assumptions: [], missingInformation: [] }; return { text: JSON.stringify({ schemaVersion: version, agentId, taskId, status: "completed", summary: "Completed.", missingInformation: [], output }) }; }
  async generateStream(input: AiProviderRequest, options: AiProviderStreamOptions) { this.streamed = true; this.streamRequest = input; const chunks = ['{"reply":"First line\\n', '**bold** and `code` 🌍', '","claims":[]}']; for (const chunk of chunks) await options.onTextDelta(chunk); return { text: chunks.join("") }; }
}

async function create(repo: MemoryConversationRepository) { const result = await request("/api/v1/emmy/conversations", { method: "POST", authorization: "Bearer valid", body: { workspaceId: "averon" }, conversationRepository: repo, workspaceRepository: workspace() }); return String(result.payload.data.id); }

test("direct private response streams real ordered deltas, persists once, and reloads identically", async () => {
  const repo = new MemoryConversationRepository(); const provider = new StreamingProvider(); const id = await create(repo);
  const result = await request(`/api/v1/emmy/conversations/${id}/messages/stream`, { method: "POST", authorization: "Bearer valid", body: { message: "Hello" }, conversationRepository: repo, workspaceRepository: workspace(), businessOsRepository: businessOs(), aiProvider: provider });
  const stream = events(result.rawBody); const completed = stream.find((event) => event.type === "completed")!; const deltas = stream.filter((event) => event.type === "delta").map((event) => event.content).join("");
  assert.equal(provider.streamed, true); assert.equal(deltas, "First line\n**bold** and `code` 🌍"); assert.equal(completed.reply, deltas); assert.equal((completed.assistantMessage as { content: string }).content, deltas);
  const messages = await repo.listMessages(id); assert.deepEqual(messages.map((item) => item.role), ["user", "assistant"]); assert.equal(messages[1].content, deltas); assert.equal(messages[1].generationStatus, "completed");
});

test("stream completion and persisted refresh state pass five repeated runs", async () => { for (let run = 0; run < 5; run += 1) { const repo = new MemoryConversationRepository(); const provider = new StreamingProvider(); const id = await create(repo); const result = await request(`/api/v1/emmy/conversations/${id}/messages/stream`, { method: "POST", authorization: "Bearer valid", body: { message: `Hello ${run + 1}` }, conversationRepository: repo, workspaceRepository: workspace(), businessOsRepository: businessOs(), aiProvider: provider }); const stream = events(result.rawBody); assert.equal(stream.at(-1)?.type, "completed", `run ${run + 1}`); const persisted = await repo.listMessages(id); assert.equal(persisted.length, 2); assert.equal(persisted[1].content, "First line\n**bold** and `code` 🌍"); assert.equal(persisted[1].generationStatus, "completed"); } });

test("substantial private request orchestrates before synthesis stream and still completes canonically", async () => {
  const repo = new MemoryConversationRepository(); const provider = new StreamingProvider(); const id = await create(repo);
  const prompt = "Recommend an SEO-informed blog article strategy for Averon Technologies, including search intent, an outline, measurable priorities, assumptions, and the authoritative business inputs still required.";
  const result = await request(`/api/v1/emmy/conversations/${id}/messages/stream`, { method: "POST", authorization: "Bearer valid", body: { message: prompt }, conversationRepository: repo, workspaceRepository: workspace(), businessOsRepository: businessOs(), aiProvider: provider }); const stream = events(result.rawBody);
  assert.ok(provider.specialistCalls.length > 0); assert.equal(provider.streamed, true); assert.equal(stream.at(-1)?.type, "completed"); assert.equal((await repo.listMessages(id)).filter((item) => item.role === "assistant").length, 1);
});

test("retrying a conversation safely bounds a previously persisted long assistant response", async () => {
  const repo = new MemoryConversationRepository(); const provider = new StreamingProvider(); const id = await create(repo);
  await repo.appendMessage(id, { role: "assistant", content: `The marketing specialist returned an invalid result. ${"A".repeat(3_276)}`, generationStatus: "completed" });
  const result = await request(`/api/v1/emmy/conversations/${id}/messages/stream`, { method: "POST", authorization: "Bearer valid", body: { message: "Create a coordinated go-to-market marketing strategy with competitor research and measurable priorities." }, conversationRepository: repo, workspaceRepository: workspace(), businessOsRepository: businessOs(), aiProvider: provider });
  const stream = events(result.rawBody); assert.equal(stream.at(-1)?.type, "completed"); assert.equal(provider.streamRequest?.messages[0]?.content.length, 900); assert.match(provider.streamRequest?.systemPrompt ?? "", /current-run statuses are authoritative/i); assert.match(provider.streamRequest?.systemPrompt ?? "", /never report an earlier specialist failure/i); assert.equal((await repo.listMessages(id)).at(-1)?.generationStatus, "completed");
});

test("interrupted provider stream preserves partial assistant content honestly", async () => {
  const repo = new MemoryConversationRepository(); const id = await create(repo); const provider: AiProvider = { async generate() { return { text: "unused" }; }, async generateStream(_input, options) { await options.onTextDelta('{"reply":"Partial'); throw new Error("network lost"); } };
  const result = await request(`/api/v1/emmy/conversations/${id}/messages/stream`, { method: "POST", authorization: "Bearer valid", body: { message: "Hello" }, conversationRepository: repo, workspaceRepository: workspace(), businessOsRepository: businessOs(), aiProvider: provider }); const stream = events(result.rawBody);
  assert.equal(stream.at(-1)?.type, "interrupted"); const messages = await repo.listMessages(id); assert.equal(messages.at(-1)?.content, "Partial"); assert.equal(messages.at(-1)?.generationStatus, "interrupted");
});
