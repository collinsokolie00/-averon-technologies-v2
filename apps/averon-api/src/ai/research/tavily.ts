export interface ExternalResearchResult { title: string; url: string; content: string; score?: number }
export interface ExternalResearchSource { search(query: string, requestId?: string): Promise<ExternalResearchResult[]> }

import { log } from "../../logger.ts";

type TavilyPayload = { results?: Array<{ title?: unknown; url?: unknown; content?: unknown; score?: unknown }> };

export class TavilyResearchSource implements ExternalResearchSource {
  private readonly apiKey: string; private readonly timeoutMs: number; private readonly fetcher: typeof fetch;
  constructor(fetcher: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env) { this.fetcher = fetcher; this.apiKey = env.TAVILY_API_KEY?.trim() ?? ""; const configured = Number(env.TAVILY_TIMEOUT_MS ?? 12_000); this.timeoutMs = Number.isFinite(configured) ? Math.max(1_000, Math.min(configured, 20_000)) : 12_000; }
  get configured() { return Boolean(this.apiKey); }
  async search(query: string, requestId?: string) {
    if (!this.apiKey) return [];
    const started = Date.now();
    const response = await this.fetcher("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}`, ...(requestId ? { "X-Project-ID": "averon-emmy" } : {}) }, body: JSON.stringify({ query: query.slice(0, 1_000), topic: "general", search_depth: "basic", max_results: 5, include_answer: false, include_raw_content: false, include_images: false }), signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) { log("warn", "external_research", { provider: "tavily", requestId, success: false, statusCode: response.status, durationMs: Date.now() - started }); throw new Error(`TAVILY_HTTP_${response.status}`); }
    const payload = await response.json() as TavilyPayload;
    const results = (payload.results ?? []).flatMap((item) => typeof item.title === "string" && typeof item.url === "string" && /^https?:\/\//i.test(item.url) && typeof item.content === "string" ? [{ title: item.title.slice(0, 300), url: item.url.slice(0, 2_000), content: item.content.slice(0, 2_000), ...(typeof item.score === "number" ? { score: item.score } : {}) }] : []).slice(0, 5);
    log("info", "external_research", { provider: "tavily", requestId, success: true, resultCount: results.length, durationMs: Date.now() - started });
    return results;
  }
}
