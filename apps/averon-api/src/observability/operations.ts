import { log } from "../logger.ts";

export function logAiOperation(context: Record<string, unknown>) {
  log(context.success ? "info" : "warn", "ai_operation", { provider: "deepseek", ...context });
}

export function logPaymentOperation(event: string, context: Record<string, unknown> = {}) {
  log(event.includes("failed") || event.includes("mismatch") ? "warn" : "info", event, {
    provider: "stripe",
    ...context,
  });
}
