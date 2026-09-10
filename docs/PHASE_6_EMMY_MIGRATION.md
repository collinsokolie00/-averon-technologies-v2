# Phase 6 Emmy migration

## Previous execution path

`src/components/assistant/EmmyAssistant.tsx` sent non-streaming JSON to `POST /api/ai/chat` in root Vite middleware. The body was `{message, history}` and the response was `{reply}`. The browser kept up to ten messages in `sessionStorage` and sent the last eight. The endpoint was public, used `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` (`deepseek-chat` default), called `https://api.deepseek.com/chat/completions`, and had no timeout, retry, authentication, rate limit, usage logging, or persistent memory. Provider errors could be returned directly.

The system prompt and knowledge were a hard-coded server string describing Averon Technologies, routes, products, services, and account workflow. There was no Firestore, vector, JSON, or dynamic knowledge retrieval.

## New architecture

```text
Public Averon Emmy UI → typed API client → POST /api/v1/emmy/messages
  → validation + per-instance rate limiter → EmmyService
  → authoritative prompt/static knowledge → AiProvider
  → DeepSeekProvider → provider-neutral {reply}
```

`averon-api` is the only active DeepSeek caller. The provider abstraction owns HTTP, key/base URL/model, timeout, provider response mapping, and provider-neutral usage metadata. Emmy owns prompt construction and current public static knowledge.

## Public contract and behavior

Emmy remains public because the previous website assistant was public. This route exposes only customer-facing website guidance and has no admin, workspace, agent, or Business OS capability. The request accepts only `message` and optional `history`; the response is the standard API envelope containing `{reply}`. Provider/model selection is not accepted.

Responses remain non-streaming. Conversation history remains browser/session-only and is not persisted server-side. Requests allow a 1–2000 character message and at most eight history messages of at most 900 characters each. Malformed/unknown fields return `EMMY_INVALID_REQUEST`.

## Protection and errors

The temporary in-memory limiter allows 20 requests per minute per forwarded IP/connection address. It is per API instance and must be replaced by a distributed limiter before multi-instance production scaling. Provider calls time out after `DEEPSEEK_TIMEOUT_MS` (20 seconds by default). Stable errors include `EMMY_INVALID_REQUEST`, `EMMY_RATE_LIMITED`, `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_ERROR`, and `EMMY_RESPONSE_FAILED`.

Request logs contain request ID, method, and route, not prompts or responses. DeepSeek usage is normalized internally but no billing or persistence was added.

## Environment

Server-only variables in `apps/averon-api/.env.example`: `DEEPSEEK_API_KEY`, `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_MODEL`, and `DEEPSEEK_TIMEOUT_MS`. No frontend AI-provider variable is required.

## Tests and limitations

Injected HTTP/provider tests cover success/usage mapping, timeout, HTTP error, malformed response, missing configuration, public route access, validation/history bounds, provider errors, request IDs, and rate limiting. No live DeepSeek call was executed. Knowledge remains static source content; there is no moderation service, persistent memory, streaming, distributed rate limiting, specialist execution, or private Emmy App orchestration.
