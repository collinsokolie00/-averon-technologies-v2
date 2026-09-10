export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  issues?: string[];
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;

function validateId(label: string, value: unknown): ValidationResult<string> {
  if (typeof value !== "string" || !idPattern.test(value)) {
    return { success: false, issues: [`${label} must be a valid identifier.`] };
  }
  return { success: true, data: value };
}

export const validateWorkspaceId = (value: unknown) => validateId("workspaceId", value);
export const validateBusinessId = (value: unknown) => validateId("businessId", value);
export const validateUserId = (value: unknown) => validateId("userId", value);

export interface EmmyMessageRequest {
  workspaceId: string;
  message: string;
  conversationId?: string;
}

export function validateEmmyMessageRequest(value: unknown): ValidationResult<EmmyMessageRequest> {
  if (!value || typeof value !== "object") return { success: false, issues: ["Request body must be an object."] };
  const input = value as Record<string, unknown>;
  const workspace = validateWorkspaceId(input.workspaceId);
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const issues = [...(workspace.issues ?? [])];
  if (!message || message.length > 10_000) issues.push("message must contain between 1 and 10000 characters.");
  if (input.conversationId !== undefined && typeof input.conversationId !== "string") issues.push("conversationId must be a string.");
  if (issues.length) return { success: false, issues };
  return {
    success: true,
    data: { workspaceId: workspace.data!, message, conversationId: input.conversationId as string | undefined },
  };
}

export interface ApiEnvironment {
  port: number;
  allowedOrigins: string[];
  firebaseProjectId?: string;
}

export function validateApiEnvironment(env: Record<string, string | undefined>): ValidationResult<ApiEnvironment> {
  const port = Number(env.PORT ?? 8787);
  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
  const issues: string[] = [];
  if (!Number.isInteger(port) || port < 1 || port > 65535) issues.push("PORT must be a valid TCP port.");
  for (const origin of allowedOrigins) {
    try {
      const parsed = new URL(origin);
      if (parsed.origin !== origin.replace(/\/$/, "") || !["http:", "https:"].includes(parsed.protocol)) issues.push(`Invalid CORS origin: ${origin}`);
    } catch { issues.push(`Invalid CORS origin: ${origin}`); }
  }
  if (issues.length) return { success: false, issues };
  return { success: true, data: { port, allowedOrigins, firebaseProjectId: env.FIREBASE_PROJECT_ID } };
}
