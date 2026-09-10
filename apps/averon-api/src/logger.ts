export type LogLevel = "debug" | "info" | "warn" | "error";

const service = "averon-api";

const secretKeyPattern = /^(authorization|cookie|set-cookie|access[-_]?token|id[-_]?token|refresh[-_]?token|secret|password|credential|api[-_]?key)$/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    secretKeyPattern.test(key) ? "[REDACTED]" : redact(item),
  ]));
}

export function formatLogEntry(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  return JSON.stringify({ timestamp: new Date().toISOString(), level, service, environment: process.env.NODE_ENV?.trim() || "development", message, ...redact(context) as object });
}

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const entry = formatLogEntry(level, message, context);
  if (level === "error") console.error(entry);
  else console.log(entry);
}
