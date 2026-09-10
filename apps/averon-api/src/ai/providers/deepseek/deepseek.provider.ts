import { ApiError } from "../../../errors/api-error.ts";
import type { AiProvider, AiProviderRequest, AiProviderResult, AiProviderStreamOptions } from "../ai-provider.ts";
import { logAiOperation } from "../../../observability/operations.ts";

export type AiFetch = typeof fetch;
export class DeepSeekProvider implements AiProvider {
  private readonly http: AiFetch; private readonly env: NodeJS.ProcessEnv;
  constructor(http: AiFetch = fetch, env: NodeJS.ProcessEnv = process.env) { this.http = http; this.env = env; }
  async generate(request: AiProviderRequest): Promise<AiProviderResult> {
    const startedAt = Date.now();
    const model = this.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    const key = this.env.DEEPSEEK_API_KEY?.trim();
    if (!key) throw new ApiError(503, "AI_PROVIDER_UNAVAILABLE", "Emmy is temporarily unavailable.");
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), Number(this.env.DEEPSEEK_TIMEOUT_MS ?? 20_000));
    try {
      const response = await this.http(`${this.env.DEEPSEEK_API_BASE_URL?.trim() || "https://api.deepseek.com"}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: request.systemPrompt }, ...request.messages], temperature: request.temperature ?? 0.3, ...(request.responseFormat ? { response_format: { type: request.responseFormat } } : {}) }),
      });
      const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } } | null;
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? "EMMY_RATE_LIMITED" : "AI_PROVIDER_ERROR", response.status === 429 ? "Emmy is receiving too many requests." : "Emmy could not complete the request.");
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new ApiError(502, "EMMY_RESPONSE_FAILED", "Emmy did not return a complete response.");
      const usage = data?.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined;
      logAiOperation({ requestId: request.requestId, model, ...request.observability, durationMs: Date.now() - startedAt, success: true, usage });
      return { text, usage };
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : caught instanceof Error && caught.name === "AbortError" ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_ERROR";
      logAiOperation({ requestId: request.requestId, model, ...request.observability, durationMs: Date.now() - startedAt, success: false, timeout: code === "AI_PROVIDER_TIMEOUT", errorCode: code });
      if (caught instanceof ApiError) throw caught;
      if (caught instanceof Error && caught.name === "AbortError") throw new ApiError(504, "AI_PROVIDER_TIMEOUT", "Emmy took too long to respond.");
      throw new ApiError(502, "AI_PROVIDER_ERROR", "Emmy could not complete the request.");
    } finally { clearTimeout(timeout); }
  }

  async generateStream(request: AiProviderRequest, options: AiProviderStreamOptions): Promise<AiProviderResult> {
    const startedAt = Date.now();
    const model = this.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    const key = this.env.DEEPSEEK_API_KEY?.trim();
    if (!key) throw new ApiError(503, "AI_PROVIDER_UNAVAILABLE", "Emmy is temporarily unavailable.");
    const controller = new AbortController(); const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, Number(this.env.DEEPSEEK_TIMEOUT_MS ?? 20_000));
    try {
      const response = await this.http(`${this.env.DEEPSEEK_API_BASE_URL?.trim() || "https://api.deepseek.com"}/chat/completions`, {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, stream: true, stream_options: { include_usage: true }, messages: [{ role: "system", content: request.systemPrompt }, ...request.messages], temperature: request.temperature ?? 0.3, ...(request.responseFormat ? { response_format: { type: request.responseFormat } } : {}) }),
      });
      if (!response.ok || !response.body) throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? "EMMY_RATE_LIMITED" : "AI_PROVIDER_ERROR", response.status === 429 ? "Emmy is receiving too many requests." : "Emmy could not complete the request.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let text = ""; let usage: AiProviderResult["usage"]; let firstDeltaAt = 0; let previousDeltaAt = 0; let streamChunkCount = 0; const streamChunkSizes: number[] = []; const streamGapMs: number[] = [];
      const consume = async (line: string) => {
        if (!line.startsWith("data:")) return; const payload = line.slice(5).trim(); if (!payload || payload === "[DONE]") return;
        const data = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
        const delta = data.choices?.[0]?.delta?.content ?? ""; if (delta) { const now = Date.now(); if (!firstDeltaAt) firstDeltaAt = now; if (previousDeltaAt && streamGapMs.length < 12) streamGapMs.push(now - previousDeltaAt); previousDeltaAt = now; streamChunkCount += 1; if (streamChunkSizes.length < 12) streamChunkSizes.push(delta.length); text += delta; await options.onTextDelta(delta); }
        if (data.usage) usage = { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens };
      };
      while (true) { const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done }); const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ""; for (const line of lines) await consume(line); if (chunk.done) break; }
      if (buffer.trim()) await consume(buffer); if (!text.trim()) throw new ApiError(502, "EMMY_RESPONSE_FAILED", "Emmy did not return a complete response.");
      logAiOperation({ requestId: request.requestId, model, ...request.observability, durationMs: Date.now() - startedAt, success: true, usage, streamMetrics: { firstDeltaMs: firstDeltaAt ? firstDeltaAt - startedAt : null, chunkCount: streamChunkCount, representativeChunkSizes: streamChunkSizes, representativeGapMs: streamGapMs } }); return { text, usage };
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : caught instanceof Error && caught.name === "AbortError" ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_ERROR";
      logAiOperation({ requestId: request.requestId, model, ...request.observability, durationMs: Date.now() - startedAt, success: false, timeout: code === "AI_PROVIDER_TIMEOUT", errorCode: code });
      if (caught instanceof ApiError) throw caught; if (caught instanceof Error && caught.name === "AbortError") throw new ApiError(504, options.signal?.aborted ? "EMMY_STREAM_CANCELLED" : "AI_PROVIDER_TIMEOUT", options.signal?.aborted ? "The response stream was cancelled." : "Emmy took too long to respond.");
      throw new ApiError(502, "AI_PROVIDER_ERROR", "Emmy could not complete the request.");
    } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", abort); }
  }
}
