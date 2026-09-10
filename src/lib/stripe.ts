import { averonApi } from "./averonApi";

export const stripeFrontendReady = true;

export interface DepositCheckoutRequest {
  invoiceId: string;
}

export async function createDepositCheckoutSession(payload: DepositCheckoutRequest) {
  const response = await averonApi.payments.createCheckout(payload);
  return { url: response.data.checkoutUrl, sessionId: response.data.checkoutReference };
}

export async function getDepositPaymentStatus(sessionId: string) {
  try { return (await averonApi.payments.status(sessionId)).data; } catch { return null; }
}
