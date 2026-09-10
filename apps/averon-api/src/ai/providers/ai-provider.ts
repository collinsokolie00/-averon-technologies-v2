export interface AiMessage { role: "user" | "assistant"; content: string }
export interface AiProviderRequest { systemPrompt: string; messages: AiMessage[]; temperature?: number; responseFormat?: "json_object"; requestId?: string; observability?: { channel: "public" | "private"; authenticated: boolean; workspaceId?: string; businessId?: string; operation?: "direct" | "specialist" | "synthesis"; agentId?: string } }
export interface AiProviderResult { text: string; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }
export interface AiProviderStreamOptions { signal?: AbortSignal; onTextDelta: (delta: string) => void | Promise<void> }
export interface AiProvider { generate(request: AiProviderRequest): Promise<AiProviderResult>; generateStream?(request: AiProviderRequest, options: AiProviderStreamOptions): Promise<AiProviderResult> }
