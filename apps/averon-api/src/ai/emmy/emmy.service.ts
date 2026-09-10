import type { AiProvider } from "../providers/ai-provider.ts";
import { buildEmmySystemPrompt } from "./emmy.prompt.ts";
import type { EmmyInput } from "./emmy.schemas.ts";
export class EmmyService {
  private readonly provider: AiProvider;
  constructor(provider: AiProvider) { this.provider = provider; }
  async send(input: EmmyInput, requestId?: string) { const result = await this.provider.generate({ systemPrompt: buildEmmySystemPrompt(), messages: [...input.history, { role: "user", content: input.message }], temperature: 0.3, requestId, observability: { channel: "public", authenticated: false } }); return { reply: result.text }; }
}
