import type { Locale } from "./catalog";
export const governorates = [
  { code: "cairo", en: "Cairo", ar: "القاهرة" },
  { code: "giza", en: "Giza", ar: "الجيزة" },
  { code: "alexandria", en: "Alexandria", ar: "الإسكندرية" },
  { code: "dakahlia", en: "Dakahlia", ar: "الدقهلية" },
  { code: "red-sea", en: "Red Sea", ar: "البحر الأحمر" },
  { code: "beheira", en: "Beheira", ar: "البحيرة" },
  { code: "fayoum", en: "Fayoum", ar: "الفيوم" },
  { code: "gharbia", en: "Gharbia", ar: "الغربية" },
  { code: "ismailia", en: "Ismailia", ar: "الإسماعيلية" },
  { code: "monufia", en: "Monufia", ar: "المنوفية" },
  { code: "minya", en: "Minya", ar: "المنيا" },
  { code: "qalyubia", en: "Qalyubia", ar: "القليوبية" },
  { code: "new-valley", en: "New Valley", ar: "الوادي الجديد" },
  { code: "suez", en: "Suez", ar: "السويس" },
  { code: "aswan", en: "Aswan", ar: "أسوان" },
  { code: "assiut", en: "Assiut", ar: "أسيوط" },
  { code: "beni-suef", en: "Beni Suef", ar: "بني سويف" },
  { code: "port-said", en: "Port Said", ar: "بورسعيد" },
  { code: "damietta", en: "Damietta", ar: "دمياط" },
  { code: "sharqia", en: "Sharqia", ar: "الشرقية" },
  { code: "south-sinai", en: "South Sinai", ar: "جنوب سيناء" },
  { code: "kafr-el-sheikh", en: "Kafr El Sheikh", ar: "كفر الشيخ" },
  { code: "matrouh", en: "Matrouh", ar: "مطروح" },
  { code: "luxor", en: "Luxor", ar: "الأقصر" },
  { code: "qena", en: "Qena", ar: "قنا" },
  { code: "north-sinai", en: "North Sinai", ar: "شمال سيناء" },
  { code: "sohag", en: "Sohag", ar: "سوهاج" },
] as const;
export type ShippingArea = {
  id: string;
  name: string;
  governorate: string;
  amount: number;
  service_type?: "standard" | "express";
  delivery_min_hours?: number | null;
  delivery_max_hours?: number | null;
  business_days?: boolean;
};
export function shippingLabel(area: ShippingArea, locale: Locale) {
  const gov = governorates.find(
    (g) => g.en === area.governorate || g.ar === area.governorate,
  );
  const place = gov?.[locale] ?? area.governorate;
  const method =
    area.service_type === "express"
      ? locale === "ar"
        ? "شحن سريع"
        : "Express shipping"
      : locale === "ar"
        ? "شحن عادي"
        : "Normal shipping";
  return `${place} · ${method}${shippingWindow(area, locale) ? ` · ${shippingWindow(area, locale)}` : ""}${!area.id.startsWith("eg-") ? ` · ${area.name}` : ""}`;
}
export function shippingWindow(area: ShippingArea, locale: Locale) {
  if (!area.delivery_max_hours) return "";
  const ar = locale === "ar";
  if (area.business_days)
    return ar
      ? `من ${(area.delivery_min_hours ?? area.delivery_max_hours) / 24} إلى ${area.delivery_max_hours / 24} أيام عمل`
      : `${(area.delivery_min_hours ?? area.delivery_max_hours) / 24}–${area.delivery_max_hours / 24} business days`;
  if (area.delivery_max_hours > 72 && area.delivery_max_hours % 24 === 0)
    return ar
      ? `خلال ${area.delivery_max_hours / 24} يومًا`
      : `Within ${area.delivery_max_hours / 24} days`;
  return ar
    ? `خلال ${area.delivery_max_hours} ساعة`
    : `Within ${area.delivery_max_hours} hours`;
}
