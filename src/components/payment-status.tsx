"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/catalog";
import { statusLabel } from "@/lib/i18n";
import {
  INSTAPAY_URL,
  WALLET_NUMBER,
  isManualPayment,
  paymentMethodLabel,
  type PaymentMethod,
} from "@/lib/payments";

export function PaymentStatus({
  token,
  locale,
  initialStatus,
  initialPaymentStatus,
  method,
}: {
  token: string;
  locale: Locale;
  initialStatus: string;
  initialPaymentStatus: string;
  method: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const ar = locale === "ar";
  const paymentMethod = method as PaymentMethod | null;

  useEffect(() => {
    if (
      paymentStatus !== "pending" ||
      !["card", "installments"].includes(method ?? "")
    )
      return;
    let active = true;
    const load = async () => {
      const response = await fetch(
        `/api/order-status?token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      ).catch(() => null);
      if (!response?.ok || !active) return;
      const data = await response.json();
      if (!active) return;
      setStatus(data.status);
      setPaymentStatus(data.payment_status);
    };
    const timer = window.setInterval(load, 3000);
    load();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [method, paymentStatus, token]);

  return (
    <div className="stack">
      <p>
        {statusLabel(status, locale)} · {statusLabel(paymentStatus, locale)}
      </p>
      {method && (
        <p className="muted">
          {ar ? "طريقة الدفع" : "Payment method"}:{" "}
          {paymentMethodLabel(paymentMethod, locale)}
        </p>
      )}
      {paymentMethod === "cod" && paymentStatus === "unpaid" && (
        <p className="notice">
          {ar
            ? "جهّز قيمة الطلب كاش علشان تدفع وقت الاستلام."
            : "Please prepare the order total in cash for delivery."}
        </p>
      )}
      {isManualPayment(paymentMethod as PaymentMethod) &&
        paymentStatus === "failed" && (
          <p className="notice">
            {ar
              ? "إيصال التحويل لسه ما اتأكدش. تواصل مع خدمة العملاء وابعثلنا رقم الطلب."
              : "The transfer receipt was not confirmed. Please contact support with your order number."}
          </p>
        )}
      {isManualPayment(paymentMethod as PaymentMethod) &&
        paymentStatus === "pending" && (
          <div className="notice">
            <p>
              {ar
                ? "تم استلام طلبك وإيصال التحويل. هنراجع الدفع خلال 24 ساعة."
                : "Your order and transfer receipt were received. Payment will be reviewed within 24 hours."}
            </p>
            {method === "instapay" ? (
              <a href={INSTAPAY_URL} target="_blank" rel="noreferrer">
                {ar ? "تحويل عبر إنستاباي" : "Pay with InstaPay"}
              </a>
            ) : (
              <p>
                {ar ? "رقم المحفظة" : "Wallet number"}:{" "}
                <strong dir="ltr">{WALLET_NUMBER}</strong>
              </p>
            )}
          </div>
        )}
      {["card", "installments"].includes(method ?? "") &&
        paymentStatus === "pending" && (
          <p className="muted" aria-live="polite">
            {ar
              ? "جارٍ التحقق من الدفع. سيتم تحديث الحالة تلقائياً."
              : "Verifying payment. This status will update automatically."}
          </p>
        )}
    </div>
  );
}
