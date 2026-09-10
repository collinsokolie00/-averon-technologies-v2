import { validateApiEnvironment } from "@averon/validation";

export interface ServerEnvironment {
  port: number;
  version: string;
  allowedOrigins: string[];
  firebaseProjectId?: string;
  environment: string;
  build?: string;
  shutdownTimeoutMs: number;
}

export function loadServerEnvironment(env: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  const validation = validateApiEnvironment(env);
  if (!validation.success || !validation.data) {
    throw new Error(`Invalid API environment: ${(validation.issues ?? []).join(" ")}`);
  }
  const shutdownTimeoutMs = Number(env.SHUTDOWN_TIMEOUT_MS ?? 10_000);
  if (!Number.isInteger(shutdownTimeoutMs) || shutdownTimeoutMs < 1_000 || shutdownTimeoutMs > 60_000) {
    throw new Error("Invalid API environment: SHUTDOWN_TIMEOUT_MS must be between 1000 and 60000.");
  }
  for (const [name, fallback] of [["DEEPSEEK_TIMEOUT_MS", 20_000], ["STRIPE_TIMEOUT_MS", 20_000]] as const) {
    const timeout = Number(env[name] ?? fallback);
    if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 120_000) throw new Error(`Invalid API environment: ${name} must be between 1000 and 120000.`);
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    try { JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON); }
    catch { throw new Error("Invalid API environment: FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON."); }
  }
  if (env.PAYMENT_FRONTEND_ORIGIN?.trim()) {
    const origin = new URL(env.PAYMENT_FRONTEND_ORIGIN);
    if (origin.origin !== env.PAYMENT_FRONTEND_ORIGIN.replace(/\/$/, "") || !["http:", "https:"].includes(origin.protocol)) throw new Error("Invalid API environment: PAYMENT_FRONTEND_ORIGIN must be an HTTP(S) origin.");
  }
  return {
    port: validation.data.port,
    allowedOrigins: validation.data.allowedOrigins,
    firebaseProjectId: validation.data.firebaseProjectId,
    version: env.API_VERSION?.trim() || "0.1.0",
    environment: env.NODE_ENV?.trim() || "development",
    build: env.API_BUILD?.trim() || undefined,
    shutdownTimeoutMs,
  };
}
