import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, XCircle } from "lucide-react";

import { getDepositPaymentStatus } from "../../lib/stripe";

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const [message, setMessage] = useState("Confirming your deposit payment...");

  useEffect(() => {
    let active = true;

    async function confirmPayment(attempt = 0) {
      if (!sessionId) {
        setMessage("Missing Checkout Session reference.");
        return;
      }

      const status = await getDepositPaymentStatus(sessionId);
      if (!active) return;

      if (status?.status === "paid") {
        setMessage("Deposit confirmed in Firestore. Your contract page is updated.");
        return;
      }

      if (attempt < 5) {
        window.setTimeout(() => {
          void confirmPayment(attempt + 1);
        }, 1400);
        return;
      }

      setMessage("Payment return received. Waiting for Stripe webhook confirmation.");
    }

    void confirmPayment();
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <section className="payment-result">
      <div className="payment-result-card">
        <CheckCircle2 size={34} />
        <p className="section-kicker">Payment success</p>
        <h1>{message}</h1>
        <Link className="btn-primary" to="/account/contracts">Back to contract</Link>
      </div>
    </section>
  );
}

export function PaymentCancelPage() {
  return (
    <section className="payment-result">
      <div className="payment-result-card cancelled">
        <XCircle size={34} />
        <p className="section-kicker">Payment cancelled</p>
        <h1>Your deposit payment was not completed.</h1>
        <Link className="btn-primary" to="/account/contracts">Return to contract</Link>
      </div>
    </section>
  );
}
