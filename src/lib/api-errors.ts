import { z } from "zod";
import type { Locale } from "./catalog";
const messages: Record<string, { ar: string; en: string }> = {
  Unauthorized: { ar: "سجّل دخولك الأول.", en: "Please sign in first." },
  Forbidden: {
    ar: "مش متاح لحسابك تنفّذ الخطوة دي.",
    en: "You do not have permission for this action.",
  },
  "Cash on delivery has not been enabled": {
    ar: "الدفع عند الاستلام مش متاح حاليًا.",
    en: "Cash on delivery is currently unavailable.",
  },
  "No payment method has been enabled": {
    ar: "لسه مفيش طريقة دفع متاحة.",
    en: "No payment method has been enabled.",
  },
  "Payment method is not available": {
    ar: "طريقة الدفع دي مش متاحة حاليًا.",
    en: "The selected payment method is unavailable.",
  },
  "Payment proof is required": {
    ar: "ارفع إيصال التحويل علشان تكمّل الطلب.",
    en: "Please upload the transfer receipt to complete the order.",
  },
  "Payment proof expired or already used": {
    ar: "إيصال التحويل مش متاح للمراجعة أو اتستخدم قبل كده. ارفعه تاني.",
    en: "The transfer receipt expired or was already used. Please upload it again.",
  },
  "Unable to save payment proof": {
    ar: "مقدرناش نحفظ إيصال التحويل. جرّب تاني.",
    en: "Unable to save the transfer receipt. Please try again.",
  },
  "Payment provider is not configured": {
    ar: "الدفع أونلاين مش متاح حاليًا.",
    en: "The payment provider is not configured.",
  },
  "Payment provider did not return a payment link": {
    ar: "مقدرناش نبدأ عملية الدفع. جرّب تاني.",
    en: "Unable to start the payment. Please try again.",
  },
  "Payment provider returned an invalid response": {
    ar: "مقدرناش نتصل ببوابة الدفع. جرّب تاني.",
    en: "The payment provider returned an invalid response. Please try again.",
  },
  "Transfer already reviewed": {
    ar: "التحويل ده اتراجع قبل كده.",
    en: "This transfer has already been reviewed.",
  },
  "Delivery area is not configured": {
    ar: "التوصيل مش متاح للمنطقة دي.",
    en: "Delivery is unavailable for the selected area.",
  },
  "Invalid or expired coupon": {
    ar: "كود الخصم مش صحيح أو صلاحيته خلصت.",
    en: "This coupon is invalid or has expired.",
  },
  "Product unavailable": {
    ar: "في قطعة مش متاحة في السلة. راجع القطع الموجودة فيها.",
    en: "A cart item is unavailable. Please review your cart.",
  },
  "Invalid vehicle": {
    ar: "اختار مواصفات عربيتك من الاختيارات المتاحة.",
    en: "Please choose a valid vehicle configuration.",
  },
  "Merchant policies must be approved before checkout": {
    ar: "الطلب مش متاح حاليًا لحد ما سياسات المتجر تتعتمد.",
    en: "Checkout is unavailable until the store policies are approved.",
  },
  "Order total changed. Review your order again.": {
    ar: "تغير إجمالي الطلب. راجع الأسعار والتوصيل من جديد.",
    en: "The total changed. Please review prices and delivery again.",
  },
  "Demo checkout prohibited": {
    ar: "المنتجات التجريبية مش متاحة للشراء.",
    en: "Demo products cannot be ordered.",
  },
  "Demo products cannot be ordered in this environment": {
    ar: "المنتجات التجريبية مش متاحة للشراء.",
    en: "Demo products cannot be ordered.",
  },
};
const fields: Record<string, { ar: string; en: string }> = {
  make: { ar: "ماركة العربية", en: "Vehicle make" },
  model: { ar: "موديل العربية", en: "Vehicle model" },
  year: { ar: "سنة الصنع", en: "Vehicle year" },
  engine: { ar: "الموتور", en: "Engine" },
  name: { ar: "الاسم", en: "Name" },
  phone: { ar: "رقم الموبايل", en: "Mobile number" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  address: { ar: "العنوان", en: "Address" },
  details: { ar: "العنوان", en: "Address" },
  area: { ar: "منطقة التوصيل", en: "Delivery area" },
  coupon: { ar: "كود الخصم", en: "Coupon" },
  vehicle: { ar: "العربية", en: "Vehicle" },
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
          ? `اتأكد من ${field}.`
          : `Please check ${field.toLowerCase()}.`,
      )
      .join(" ");
  }
  const message = error instanceof Error ? error.message : "";
  if (messages[message]) return messages[message][locale];
  if (message.includes("Too many"))
    return locale === "ar"
      ? "عدد المحاولات كبير. جرّب تاني كمان شوية."
      : "Too many attempts. Please try again shortly.";
  if (admin && message) return message;
  return locale === "ar"
    ? "مقدرناش نكمّل الطلب. راجع البيانات وجرّب تاني."
    : "Unable to complete the request. Check your details and try again.";
}
