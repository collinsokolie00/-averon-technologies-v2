export type CapabilityName = "firebase" | "firestore" | "payments" | "emmy";
export type CapabilityState = "enabled" | "disabled" | "degraded";

export interface CapabilityStatus {
  state: CapabilityState;
  code: string;
}

export type CapabilityRegistry = Record<CapabilityName, CapabilityStatus>;

export function buildCapabilityRegistry(env: NodeJS.ProcessEnv): CapabilityRegistry {
  const firebaseConfigured = Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
      || env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
      || env.FIREBASE_CONFIG?.trim()
      || env.GOOGLE_CLOUD_PROJECT?.trim()
      || env.FIREBASE_PROJECT_ID?.trim(),
  );
  const stripeKey = Boolean(env.STRIPE_SECRET_KEY?.trim());
  const stripeWebhook = Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
  const paymentOrigin = Boolean(env.PAYMENT_FRONTEND_ORIGIN?.trim());

  return {
    firebase: firebaseConfigured
      ? { state: "enabled", code: "CONFIGURED" }
      : { state: "degraded", code: "APPLICATION_DEFAULT_CREDENTIALS_UNCONFIRMED" },
    firestore: firebaseConfigured
      ? { state: "enabled", code: "CLIENT_AVAILABLE" }
      : { state: "degraded", code: "FIREBASE_CONFIGURATION_UNCONFIRMED" },
    payments: stripeKey && stripeWebhook && paymentOrigin
      ? { state: "enabled", code: "CONFIGURED" }
      : stripeKey || stripeWebhook || paymentOrigin
        ? { state: "degraded", code: "INCOMPLETE_CONFIGURATION" }
        : { state: "disabled", code: "NOT_CONFIGURED" },
    emmy: env.DEEPSEEK_API_KEY?.trim()
      ? { state: "enabled", code: "CONFIGURED" }
      : { state: "disabled", code: "NOT_CONFIGURED" },
  };
}

export function readiness(registry: CapabilityRegistry) {
  const coreReady = registry.firebase.state === "enabled" && registry.firestore.state === "enabled";
  const optionalDegraded = registry.payments.state !== "enabled" || registry.emmy.state !== "enabled";
  return {
    status: coreReady ? (optionalDegraded ? "degraded" : "ready") : "not_ready",
    capabilities: registry,
  } as const;
}
