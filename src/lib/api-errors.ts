import { z } from "zod";
import type { Locale } from "./catalog";
const messages: Record<string, { ar: string; en: string }> = {
  Unauthorized: { ar: "يرجى تسجيل الدخول أولاً.", en: "Please sign in first." },
  Forbidden: {
    ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    en: "You do not have permission for this action.",
  },
  "Cash on delivery has not been enabled": {
    ar: "الدفع عند الاستلام غير متاح حالياً.",
    en: "Cash on delivery is currently unavailable.",
  },
  "No payment method has been enabled": {
    ar: "لم يتم تفعيل أي طريقة دفع.",
    en: "No payment method has been enabled.",
  },
  "Payment method is not available": {
    ar: "طريقة الدفع المختارة غير متاحة.",
    en: "The selected payment method is unavailable.",
  },
  "Payment proof is required": {
    ar: "يرجى رفع إثبات التحويل لإتمام الطلب.",
    en: "Please upload the transfer receipt to complete the order.",
  },
  "Payment proof expired or already used": {
    ar: "انتهت صلاحية إثبات التحويل. يرجى رفعه مرة أخرى.",
    en: "The transfer receipt expired or was already used. Please upload it again.",
  },
  "Unable to save payment proof": {
    ar: "تعذر حفظ إثبات التحويل. يرجى المحاولة مرة أخرى.",
    en: "Unable to save the transfer receipt. Please try again.",
  },
  "Payment provider is not configured": {
    ar: "بوابة الدفع غير مهيأة حالياً.",
    en: "The payment provider is not configured.",
  },
  "Payment provider did not return a payment link": {
    ar: "تعذر بدء عملية الدفع. يرجى المحاولة مرة أخرى.",
    en: "Unable to start the payment. Please try again.",
  },
  "Payment provider returned an invalid response": {
    ar: "تعذر الاتصال ببوابة الدفع. يرجى المحاولة مرة أخرى.",
    en: "The payment provider returned an invalid response. Please try again.",
  },
  "Transfer already reviewed": {
    ar: "تمت مراجعة التحويل بالفعل.",
    en: "This transfer has already been reviewed.",
  },
  "Delivery area is not configured": {
    ar: "التوصيل غير متاح للمنطقة المحددة.",
    en: "Delivery is unavailable for the selected area.",
  },
  "Invalid or expired coupon": {
    ar: "كود الخصم غير صالح أو انتهت صلاحيته.",
    en: "This coupon is invalid or has expired.",
  },
  "Product unavailable": {
    ar: "إحدى القطع في السلة غير متاحة. يرجى مراجعة السلة.",
    en: "A cart item is unavailable. Please review your cart.",
  },
  "Invalid vehicle": {
    ar: "يرجى اختيار تكوين سيارة صالح.",
    en: "Please choose a valid vehicle configuration.",
  },
  "Merchant policies must be approved before checkout": {
    ar: "الطلب غير متاح لحين اعتماد سياسات المتجر.",
    en: "Checkout is unavailable until the store policies are approved.",
  },
  "Order total changed. Review your order again.": {
    ar: "تغير إجمالي الطلب. يرجى مراجعة الأسعار والتوصيل مرة أخرى.",
    en: "The total changed. Please review prices and delivery again.",
  },
  "Demo checkout prohibited": {
    ar: "لا يمكن شراء المنتجات التجريبية.",
    en: "Demo products cannot be ordered.",
  },
  "Demo products cannot be ordered in this environment": {
    ar: "لا يمكن شراء المنتجات التجريبية.",
    en: "Demo products cannot be ordered.",
  },
};
const fields: Record<string, { ar: string; en: string }> = {
  make: { ar: "علامة السيارة", en: "Vehicle make" },
  model: { ar: "موديل السيارة", en: "Vehicle model" },
  year: { ar: "سنة السيارة", en: "Vehicle year" },
  engine: { ar: "المحرك", en: "Engine" },
  name: { ar: "الاسم", en: "Name" },
  phone: { ar: "رقم الموبايل", en: "Mobile number" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  address: { ar: "العنوان", en: "Address" },
  details: { ar: "العنوان", en: "Address" },
  area: { ar: "منطقة التوصيل", en: "Delivery area" },
  coupon: { ar: "كود الخصم", en: "Coupon" },
  vehicle: { ar: "السيارة", en: "Vehicle" },
  items: { ar: "السلة", en: "Cart" },
  consent: { ar: "الموافقة على السياسات", en: "Policy consent" },
  contact: { ar: "بيانات التواصل", en: "Contact details" },
  description: { ar: "وصف الطلب", en: "Request description" },
};
export function apiError(
  error: unknown,
  locale: Locale,
  admin = false,
): string {
  if (error instanceof z.ZodError) {
    if (admin)
      return error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    return [
      ...new Set(
        error.issues.map(
          (i) =>
            fields[String(i.path[0])]?.[locale] ??
            (locale === "ar" ? "البيانات المدخلة" : "Submitted details"),
        ),
      ),
    ]
      .map((field) =>
        locale === "ar"
          ? `يرجى التحقق من ${field}.`
          : `Please check ${field.toLowerCase()}.`,
      )
      .join(" ");
  }
  const message = error instanceof Error ? error.message : "";
  if (messages[message]) return messages[message][locale];
  if (message.includes("Too many"))
    return locale === "ar"
      ? "عدد المحاولات كبير. يرجى المحاولة بعد قليل."
      : "Too many attempts. Please try again shortly.";
  if (admin && message) return message;
  return locale === "ar"
    ? "تعذر إتمام الطلب. راجع البيانات وحاول مرة أخرى."
    : "Unable to complete the request. Check your details and try again.";
}
