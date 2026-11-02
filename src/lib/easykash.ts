import crypto from "node:crypto";
import { EASYKASH_API_URL, EASYKASH_PAYMENT_OPTIONS } from "./payments";

type StartPaymentInput = {
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerReference: string;
  locale: "ar" | "en";
  publicToken: string;
  siteUrl: string;
};

export async function startEasyKashPayment(input: StartPaymentInput) {
  const apiKey = process.env.EASYKASH_API_KEY;
  if (!apiKey) throw Error("Payment provider is not configured");
  const payload = {
    amount: Number(input.amount),
    currency: "EGP",
    name: input.customerName.trim(),
    email:
      input.customerEmail?.trim() ||
      process.env.EASYKASH_FALLBACK_EMAIL ||
      "orders@mansokar.com",
    mobile: input.customerPhone.trim(),
    redirectUrl: `${input.siteUrl}/${input.locale}/order/confirmation/${input.publicToken}`,
    customerReference: Number(input.customerReference),
    paymentOptions: EASYKASH_PAYMENT_OPTIONS,
    cashExpiry: 24,
  };
  const response = await fetch(EASYKASH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const raw = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw Error("Payment provider returned an invalid response");
  }
  if (!response.ok) {
    const detail =
      data.message ?? data.error ?? `Payment provider error ${response.status}`;
    throw Error(String(detail));
  }
  const nested =
    data.data && typeof data.data === "object"
      ? (data.data as Record<string, unknown>)
      : null;
  const redirectUrl =
    data.redirectUrl ?? data.url ?? data.paymentUrl ?? nested?.redirectUrl;
  if (typeof redirectUrl !== "string" || !redirectUrl.startsWith("http"))
    throw Error("Payment provider did not return a payment link");
  return redirectUrl;
}

export function verifyEasyKashSignature(
  payload: Record<string, unknown>,
  secret: string,
) {
  const signature = String(payload.signatureHash ?? "");
  if (!signature) return false;
  const data = [
    payload.ProductCode,
    payload.Amount,
    payload.ProductType,
    payload.PaymentMethod,
    payload.status,
    payload.easykashRef,
    payload.customerReference,
  ].join("");
  const calculated = crypto
    .createHmac("sha512", secret)
    .update(data)
    .digest("hex");
  const a = Buffer.from(calculated);
  const b = Buffer.from(signature.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function mapEasyKashStatus(status: unknown) {
  const value = String(status ?? "")
    .toUpperCase()
    .trim();
  if (
    ["PAID", "SUCCESS", "SUCCESSFUL", "COMPLETED", "APPROVED"].includes(value)
  )
    return "paid" as const;
  if (["FAILED", "FAILURE", "DECLINED", "REJECTED", "ERROR"].includes(value))
    return "failed" as const;
  if (["REFUNDED", "REVERSED"].includes(value)) return "refunded" as const;
  return "pending" as const;
}
