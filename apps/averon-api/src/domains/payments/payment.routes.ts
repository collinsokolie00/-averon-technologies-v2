import { ApiError } from "../../errors/api-error.ts";
import { parseId } from "../business/business.schemas.ts";
import type { AuthContext } from "../../services/auth/authentication.ts";
import type { PaymentService } from "./payment.service.ts";
import type { PaymentProvider } from "../../providers/payments/stripe/stripe.adapter.ts";
import { logPaymentOperation } from "../../observability/operations.ts";

export async function handlePaymentRoute(input: { method: string; path: string; body: unknown; auth: AuthContext; service: PaymentService; requestId?: string }) {
  if (input.method === "POST" && input.path === "/api/v1/payments/checkout") {
    const body = input.body as Record<string, unknown>; if (!body || Object.keys(body).some((key) => key !== "invoiceId")) throw new ApiError(400, "UNKNOWN_FIELDS", "Only invoiceId may be submitted.");
    try {
      const data = await input.service.createCheckout(parseId(String(body.invoiceId ?? "")), input.auth.user.userId);
      logPaymentOperation("payment_checkout_succeeded", { requestId: input.requestId, reused: data.reused });
      return { status: 201, data };
    } catch (caught) {
      logPaymentOperation("payment_checkout_failed", { requestId: input.requestId, errorCode: caught instanceof ApiError ? caught.code : "INTERNAL_ERROR" });
      throw caught;
    }
  }
  if (input.method === "GET" && input.path.startsWith("/api/v1/payments/status/")) {
    const reference = parseId(input.path.slice("/api/v1/payments/status/".length)); const status = await input.service.status(reference, input.auth.user.userId);
    if (!status) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment status was not found."); return { status: 200, data: status };
  }
  return null;
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined, provider: PaymentProvider, service: PaymentService, requestId?: string) {
  if (!signature) { logPaymentOperation("payment_webhook_verification_failed", { requestId, errorCode: "INVALID_WEBHOOK_SIGNATURE" }); throw new ApiError(400, "INVALID_WEBHOOK_SIGNATURE", "The Stripe signature is required."); }
  let event;
  try { event = provider.verifyWebhook(rawBody, signature); }
  catch (caught) { logPaymentOperation("payment_webhook_verification_failed", { requestId, errorCode: caught instanceof ApiError ? caught.code : "INVALID_WEBHOOK_SIGNATURE" }); throw caught; }
  try {
    const result = await service.reconcile(event);
    logPaymentOperation(result === "duplicate" ? "payment_reconciliation_duplicate" : "payment_reconciliation_succeeded", { requestId, result, eventType: event.type });
    return { received: true, result };
  } catch (caught) {
    logPaymentOperation(caught instanceof ApiError && caught.code === "PAYMENT_AMOUNT_MISMATCH" ? "payment_reconciliation_mismatch" : "payment_reconciliation_failed", { requestId, errorCode: caught instanceof ApiError ? caught.code : "INTERNAL_ERROR", eventType: event.type });
    throw caught;
  }
}
