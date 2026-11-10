import type { Locale, Product } from "./catalog";

export function countryOfOrigin(value?: string) {
  const text = (value || "").trim();
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064b-\u065f]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
  return /^(?:original(?: parts)?|oem|genuine(?: parts)?|after\s*market|اصلي|بديل|unknown|not specified|n\/?a|غير محدد|غير معروف|-|\d+)$/.test(
    normalized,
  )
    ? ""
    : text;
}

export function productSpecifications(
  p: Pick<Product, "specs"> & Partial<Pick<Product, "condition">>,
  locale: Locale,
) {
  const ar = locale === "ar";
  const labels: Record<string, string> = {
    country_of_origin: ar ? "بلد المنشأ" : "Country of origin",
    warranty_months: ar ? "مدة الضمان" : "Warranty period",
    fitting_position: ar ? "مكان التركيب" : "Fitting position",
    engine: ar ? "المحرك" : "Engine",
    engine_code: ar ? "كود المحرك" : "Engine code",
    material: ar ? "الخامة" : "Material",
    color: ar ? "اللون" : "Colour",
    weight: ar ? "الوزن" : "Weight",
    dimensions: ar ? "الأبعاد" : "Dimensions",
    [`fitment_notes_${locale}`]: ar ? "ملاحظات التوافق" : "Compatibility notes",
  };
  const origin = countryOfOrigin(p.specs.country_of_origin);
  const rows = [
    {
      key: "country_of_origin",
      label: labels.country_of_origin,
      value: origin || (ar ? "غير محدد" : "Not specified"),
    },
  ];
  const condition = p.specs.product_condition || p.condition;
  const conditions: Record<string, string> = ar
    ? { new: "جديدة", used: "مستعملة", refurbished: "مجددة" }
    : { new: "New", used: "Used", refurbished: "Refurbished" };
  if (condition && conditions[condition])
    rows.push({
      key: "product_condition",
      label: ar ? "حالة القطعة" : "Condition",
      value: conditions[condition],
    });
  const stock: Record<string, string> = ar
    ? {
        in_stock: "متوفر بالمخزون",
        out_of_stock: "غير متوفر بالمخزون",
        preorder: "طلب مسبق",
        backorder: "طلب مؤجل",
      }
    : {
        in_stock: "In stock",
        out_of_stock: "Out of stock",
        preorder: "Preorder",
        backorder: "Backorder",
      };
  if (stock[p.specs.stock_status])
    rows.push({
      key: "stock_status",
      label: ar ? "حالة المخزون المسجلة" : "Recorded stock status",
      value: stock[p.specs.stock_status],
    });
  for (const [key, value] of Object.entries(p.specs)) {
    if (
      !value ||
      key === "country_of_origin" ||
      key.startsWith("car_years:") ||
      key.startsWith("seo_") ||
      ["public_slug", "stock_status", "product_condition", "gtin"].includes(
        key,
      ) ||
      (key.startsWith("fitment_notes_") && key !== `fitment_notes_${locale}`)
    )
      continue;
    let display = value;
    if (key === "warranty_months") {
      const months = Number(value);
      if (!Number.isInteger(months) || months < 1 || months > 600) continue;
      const number = new Intl.NumberFormat(ar ? "ar-EG" : "en-EG").format(
        months,
      );
      display = ar
        ? months === 1
          ? "شهر واحد"
          : months === 2
            ? "شهران"
            : `${number} ${months <= 10 ? "أشهر" : "شهرًا"}`
        : `${number} ${months === 1 ? "month" : "months"}`;
    }
    rows.push({
      key,
      label: labels[key] || key.replace(/_/g, " "),
      value: display,
    });
  }
  return rows;
}
