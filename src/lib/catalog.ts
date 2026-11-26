export type Locale = "ar" | "en";
export type Text = { ar: string; en: string };
export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  name: Text;
  generation?: string;
  engineCode?: string;
  engineCapacity?: number;
  body?: string;
  trim?: string;
  fuelType?: string;
  forcedInduction?: string;
  transmission?: string;
};
export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: Text;
  description: Text;
  manufacturer: string;
  category: string;
  family: string;
  type: "aftermarket" | "oem";
  price: number;
  sale: number | null;
  partNumber: string;
  partNumbers?: string[];
  synonyms?: { ar: string[]; en: string[] };
  seo?: { title?: Text; description?: Text; manual?: boolean };
  policy_refs?: string[];
  condition?: "new";
  seo_updated_at?: string | null;
  demo: boolean;
  orderable: boolean;
  status: string;
  specs: Record<string, string>;
  cost?: number | null;
  warranty?: Text | null;
  editorial?: { why?: Text; installation?: Text };
};
export const brands = [
  {
    slug: "opel",
    name: "Opel",
    ar: "أوبل",
    models: ["astra", "corsa", "insignia"],
  },
  {
    slug: "peugeot",
    name: "Peugeot",
    ar: "بيجو",
    models: ["301", "308", "3008"],
  },
  {
    slug: "citroen",
    name: "Citroën",
    ar: "ستروين",
    models: ["c3", "c4", "c5-aircross"],
  },
  { slug: "mg", name: "MG", ar: "إم جي", models: ["5", "6", "zs"] },
  { slug: "chevrolet", name: "Chevrolet", ar: "شيفروليه", models: [] },
];
export const vehicles: Vehicle[] = brands.flatMap((b, bi) =>
  b.models.flatMap((model, mi) =>
    [2020, 2021, 2022].flatMap((year) =>
      ["1.6 petrol", "1.5 petrol"].map((engine, ei) => ({
        id: `${b.slug}-${model}-${year}-${ei}`,
        brand: b.slug,
        model,
        year,
        engine,
        name: {
          en: `${b.name} ${model.toUpperCase()} ${year} · ${engine}`,
          ar: `${b.ar} ${model.toUpperCase()} ${year} · ${engine}`,
        },
      })),
    ),
  ),
);
export const categories = [
  { slug: "filters", name: { en: "Filters", ar: "الفلاتر" } },
  { slug: "brakes", name: { en: "Brakes", ar: "الفرامل" } },
  { slug: "ignition", name: { en: "Ignition", ar: "الإشعال" } },
  { slug: "cooling", name: { en: "Cooling", ar: "التبريد" } },
];
export const demoProducts: Product[] = Array.from({ length: 8 }, (_, i) => ({
  id: `demo-${i + 1}`,
  sku: `DEMO-${String(i + 1).padStart(3, "0")}`,
  slug: [
    "precision-oil-filter",
    "ceramic-brake-pads",
    "ignition-service-kit",
    "cooling-filter",
    "oil-filter-alternative",
    "brake-pad-alternative",
    "spark-plug-set",
    "cabin-filter",
  ][i],
  name: {
    en: [
      "Precision oil filter",
      "Ceramic brake pads",
      "Ignition service kit",
      "Cooling filter",
      "Oil filter alternative",
      "Brake pad alternative",
      "Spark plug set",
      "Cabin filter",
    ][i],
    ar: [
      "فلتر زيت دقيق",
      "طقم تيل فرامل",
      "طقم صيانة الإشعال",
      "فلتر تبريد",
      "فلتر زيت After Market",
      "تيل فرامل After Market",
      "طقم بوجيهات",
      "فلتر مقصورة",
    ][i],
  },
  description: {
    en: "Fictional demonstration product. Specifications, fitment and prices are test data, not a real manufacturer offering.",
    ar: "منتج تجريبي خيالي. المواصفات والتوافق والأسعار بيانات اختبار وليست عرضاً حقيقياً من شركة مصنعة.",
  },
  manufacturer: i < 4 ? "Demo Works" : "Sample Parts",
  category: categories[i % 4].slug,
  family: `family-${i % 4}`,
  type: "aftermarket",
  price: [65000, 185000, 125000, 89000, 72000, 210000, 99000, 45000][i],
  sale: i === 0 ? 55000 : null,
  partNumber: `DEMO-PART-${i + 1}`,
  demo: true,
  orderable: true,
  status: "published",
  specs: { Condition: "New · demo", "Data origin": "Fictional test fixture" },
}));
export function demoFits(productId: string, vehicleId: string) {
  return (
    ["opel-astra-2021-0", "peugeot-301-2021-0"].includes(vehicleId) &&
    ["demo-1", "demo-5"].includes(productId)
  );
}
export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function money(value: number, _locale: Locale) {
  // Keep visible prices identical to checkout and Google Merchant feed.\n  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
export function fitmentLabel(
  vehicle: Vehicle | undefined,
  confirmed: boolean,
  locale: Locale,
) {
  if (!vehicle) {
    if (locale === "ar") return "";
    return "";
  }
  if (confirmed) {
    if (locale === "ar") return `متوافق مع ${vehicle.name.ar}`;
    return `Compatible with your ${vehicle.name.en}`;
  }
  if (locale === "ar")
    return `لسه ما اتأكدناش إن القطعة مناسبة لـ ${vehicle.name.ar}`;
  return `Compatibility not confirmed for ${vehicle.name.en}`;
}
export function priceCart(
  items: { product: Product; qty: number }[],
  shipping: number,
  discount = 0,
) {
  if (
    !Number.isSafeInteger(shipping) ||
    shipping < 0 ||
    !Number.isSafeInteger(discount) ||
    discount < 0
  )
    throw Error("Invalid amount");
  const subtotal = items.reduce((sum, { product, qty }) => {
    if (!Number.isInteger(qty) || qty < 1 || qty > 99)
      throw Error("Invalid quantity");
    return sum + (product.sale ?? product.price) * qty;
  }, 0);
  return {
    subtotal,
    discount: Math.min(discount, subtotal),
    shipping,
    total: Math.max(0, subtotal - discount) + shipping,
  };
}
export function parseMinor(value: string | undefined) {
  if (!value || !/^\d{1,7}(\.\d{1,2})?$/.test(value)) return undefined;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
