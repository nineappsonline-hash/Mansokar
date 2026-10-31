export type PaymentMethod =
  "cod" | "card" | "instapay" | "wallet" | "installments";
export type ManualPaymentMethod = "instapay" | "wallet";
export const onlineMethods = [
  "card",
  "instapay",
  "wallet",
  "installments",
] as const;
export const EASYKASH_API_URL = "https://back.easykash.net/api/directpayv1/pay";
export const EASYKASH_PAYMENT_OPTIONS = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 31, 32, 34,
];
export const INSTAPAY_URL = "https://ipn.eg/S/jimmydodo/instapay/3Jvfcf";
export const WALLET_NUMBER = "01023862436";
export const INSTALLMENT_PROVIDERS = [
  "Valu",
  "Contact",
  "Suhoola",
  "Klivvr",
  "Aman",
] as const;
export interface PaymentAdapter {
  start(
    orderId: string,
    amount: number,
  ): Promise<{ redirectUrl: string; reference: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    orderId: string;
    status: "paid" | "failed" | "refunded";
  }>;
  refund(reference: string, amount: number): Promise<void>;
}
export function availablePayments(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (process.env.EASYKASH_API_KEY) methods.push("card");
  methods.push("instapay", "wallet");
  if (process.env.COD_ENABLED === "true") methods.push("cod");
  return methods;
}
export function isManualPayment(
  method: PaymentMethod,
): method is ManualPaymentMethod {
  return method === "instapay" || method === "wallet";
}
export function paymentMethodLabel(
  method: PaymentMethod | string | null | undefined,
  locale: "ar" | "en",
) {
  const labels: Record<string, { ar: string; en: string }> = {
    card: {
      ar: "بطاقات الائتمان والتقسيط",
      en: "Credit cards & installments",
    },
    installments: {
      ar: "بطاقات الائتمان والتقسيط",
      en: "Credit cards & installments",
    },
    instapay: { ar: "إنستاباي", en: "InstaPay" },
    wallet: { ar: "محفظة إلكترونية", en: "E-wallet" },
    cod: { ar: "الدفع عند الاستلام", en: "Cash on delivery" },
  };
  return method ? (labels[method]?.[locale] ?? method) : "";
}
export function paymentReference(orderId: string) {
  const hex = orderId.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(hex))
    return ((BigInt("0x" + hex) % 900000000000n) + 100000000000n).toString();
  const digits = orderId.replace(/\D/g, "").slice(-12);
  const value = Number(digits);
  return String(Number.isSafeInteger(value) && value > 0 ? value : Date.now());
}
export function assertDemoAllowed(
  isDemo: boolean,
  environment = process.env.NODE_ENV,
  enabled = process.env.ALLOW_DEMO_CHECKOUT,
) {
  if (isDemo && (environment === "production" || enabled !== "true"))
    throw Error("Demo products cannot be ordered in this environment");
}
export function adapterFor(): never {
  throw Error("No online payment provider has been approved or configured");
}
