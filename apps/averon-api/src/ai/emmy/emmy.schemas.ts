import { ApiError } from "../../errors/api-error.ts";
import type { AiMessage } from "../providers/ai-provider.ts";
export interface EmmyInput { message: string; history: AiMessage[] }
export function parseEmmyInput(value: unknown): EmmyInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "EMMY_INVALID_REQUEST", "The Emmy request must be an object.");
  const input = value as Record<string, unknown>; const unknown = Object.keys(input).filter((key) => !["message", "history"].includes(key));
  if (unknown.length) throw new ApiError(400, "EMMY_INVALID_REQUEST", "The Emmy request contains unsupported fields.");
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message || message.length > 2000) throw new ApiError(400, "EMMY_INVALID_REQUEST", "Message must contain between 1 and 2000 characters.");
  if (input.history !== undefined && !Array.isArray(input.history)) throw new ApiError(400, "EMMY_INVALID_REQUEST", "History must be an array.");
  const raw = (input.history ?? []) as unknown[]; if (raw.length > 8) throw new ApiError(400, "EMMY_INVALID_REQUEST", "Conversation history may contain at most 8 messages.");
  const history = raw.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError(400, "EMMY_INVALID_REQUEST", "History contains a malformed message.");
    const entry = item as Record<string, unknown>; if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.content !== "string" || !entry.content.trim() || entry.content.length > 900) throw new ApiError(400, "EMMY_INVALID_REQUEST", "History contains an invalid message.");
    return { role: entry.role, content: entry.content.trim() } as AiMessage;
  });
  return { message, history };
}
