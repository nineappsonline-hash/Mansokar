export type PaymentMethod =
  "cod" | "card" | "instapay" | "wallet" | "installments";
export const onlineMethods = [
  "card",
  "instapay",
  "wallet",
  "installments",
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
  return process.env.COD_ENABLED === "true" ? (["cod"] as const) : [];
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
