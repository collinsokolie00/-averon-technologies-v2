import { ApiError } from "../../errors/api-error.ts";
import type { PaymentProvider } from "../../providers/payments/stripe/stripe.adapter.ts";
import type { PaymentRepository } from "./payment.repository.ts";
import type { CheckoutResult, PaymentEvent } from "./payment.types.ts";

export class PaymentService {
  private readonly repository: PaymentRepository;
  private readonly provider: PaymentProvider;
  private readonly frontendOrigin: string;
  private readonly onPaid?: (event: PaymentEvent) => Promise<unknown>;
  constructor(repository: PaymentRepository, provider: PaymentProvider, frontendOrigin: string, onPaid?: (event: PaymentEvent) => Promise<unknown>) { this.repository = repository; this.provider = provider; this.frontendOrigin = frontendOrigin.replace(/\/$/, ""); this.onPaid = onPaid; }
  async createCheckout(invoiceId: string, customerId: string): Promise<CheckoutResult> {
    const invoice = await this.repository.getInvoice(invoiceId);
    if (!invoice) throw new ApiError(404, "PAYMENT_NOT_FOUND", "The invoice was not found.");
    if (invoice.customerId !== customerId) throw new ApiError(403, "PAYMENT_NOT_ALLOWED", "This invoice is not available to the authenticated user.");
    if (invoice.status === "paid") throw new ApiError(409, "INVOICE_ALREADY_PAID", "The invoice has already been paid.");
    if (!Number.isInteger(invoice.amountCents) || invoice.amountCents < 100 || !["eur", "usd"].includes(invoice.currency)) throw new ApiError(409, "PAYMENT_NOT_ALLOWED", "The invoice payment details are invalid.");
    if (invoice.checkoutReference) {
      const existing = await this.provider.getCheckout(invoice.checkoutReference);
      if (existing?.reusable) return { checkoutUrl: existing.url, checkoutReference: existing.id, reused: true };
    }
    const checkout = await this.provider.createCheckout(invoice, { success: `${this.frontendOrigin}/payment/success`, cancel: `${this.frontendOrigin}/payment/cancel` }, `invoice-${invoice.invoiceId}-${invoice.checkoutReference ?? "initial"}`);
    await this.repository.recordCheckout(invoice, checkout.id);
    return { checkoutUrl: checkout.url, checkoutReference: checkout.id, reused: false };
  }
  status(reference: string, customerId: string) { return this.repository.getPaymentStatus(reference, customerId); }
  async reconcile(event: PaymentEvent) { const result=await this.repository.reconcile(event);if(result!=="ignored"&&event.type==="paid"&&this.onPaid)await this.onPaid(event);return result; }
}
