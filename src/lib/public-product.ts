import type { Product, Text } from "./catalog";
import { readApplications } from "./product-applications";
export type CarContext = {
  modelId: string;
  make: string;
  model: string;
  year?: number;
  name: Text;
};
export function publicProductSlug(
  p: Pick<Product, "id" | "name" | "manufacturer">,
) {
  const stem = `${p.name.en} ${p.manufacturer}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)
    .replace(/-$/, "");
  return `${stem || "spare-part"}-p-${p.id}`;
}
export function publicProductId(slug: string) {
  const match = slug.match(/-p-([0-9a-f]{8}-[0-9a-f-]{27}|demo-\d+)$/i);
  return match?.[1];
}
export function carContext(
  input: { make?: string; model?: string; year?: string | number },
  models: { id: string; brand: string; slug: string; name: Text }[],
  brands: { slug: string; name: string; ar: string }[],
): CarContext | undefined {
  const model = models.find(
      (m) => m.brand === input.make && m.slug === input.model,
    ),
    brand = brands.find((b) => b.slug === input.make);
  if (!model || !brand) return;
  const year = input.year ? Number(input.year) : undefined;
  if (
    year !== undefined &&
    (!Number.isInteger(year) || year < 1950 || year > 2100)
  )
    return;
  return {
    modelId: model.id,
    make: brand.slug,
    model: model.slug,
    year,
    name: {
      ar: `${brand.ar} ${model.name.ar}${year ? " " + year : ""}`,
      en: `${brand.name} ${model.name.en}${year ? " " + year : ""}`,
    },
  };
}
export function publicProduct(
  p: Product,
  context?: CarContext,
  verified = false,
): Product {
  const matches =
    context &&
    (verified ||
      readApplications(p.specs).some(
        (a) =>
          a.model_id === context.modelId &&
          (!context.year || a.years.includes(context.year)),
      ));
  const name = matches
    ? {
        ar: `${p.name.ar} · ${context.name.ar}`,
        en: `${p.name.en} · ${context.name.en}`,
      }
    : p.name;
  // Only the current model's individual years may appear in public copy.
  const modelYears =
    matches && !context.year
      ? readApplications(p.specs).find((a) => a.model_id === context.modelId)
          ?.years || []
      : [];
  const compatibility = {
    ar: modelYears.length
      ? ` متوافق مع ${[...modelYears]
          .sort((a, b) => a - b)
          .map((y) => `${context!.name.ar} ${y}`)
          .join("، ")}.`
      : "",
    en: modelYears.length
      ? ` Compatible with ${[...modelYears]
          .sort((a, b) => a - b)
          .map((y) => `${context!.name.en} ${y}`)
          .join(", ")}.`
      : "",
  };
  const description =
    p.demo && !matches
      ? {
          ar: "منتج تجريبي خيالي. المواصفات والأسعار بيانات اختبار وليست عرضاً فعلياً.",
          en: "Fictional demonstration product. Specifications and prices are test data, not a real offering.",
        }
      : {
          ar: `${name.ar} من ${p.manufacturer}. رقم القطعة ${p.partNumber}. راجع رقم القطعة وتكوين السيارة قبل الطلب.${compatibility.ar}`,
          en: `${name.en} by ${p.manufacturer}. Part number ${p.partNumber}. Check the part number and vehicle configuration before ordering.${compatibility.en}`,
        };
  return {
    id: p.id,
    sku: p.sku,
    slug: publicProductSlug(p),
    name,
    description,
    manufacturer: p.manufacturer,
    category: p.category,
    family: p.family,
    type: p.type,
    price: p.price,
    sale: p.sale,
    partNumber: p.partNumber,
    partNumbers: p.partNumbers,
    demo: p.demo,
    orderable: p.orderable,
    status: p.status,
    specs: Object.fromEntries(
      Object.entries(p.specs || {}).filter(
        ([key]) => !key.startsWith("car_years:"),
      ),
    ),
    warranty: p.warranty,
    policy_refs: p.policy_refs,
    condition: p.condition,
    seo: {
      title: {
        ar: `${name.ar} | ${p.manufacturer} | ${p.partNumber} في مصر`.slice(
          0,
          200,
        ),
        en: `${name.en} | ${p.manufacturer} | ${p.partNumber} in Egypt`.slice(
          0,
          200,
        ),
      },
      description,
    },
  };
}
export function productContextHref(
  locale: string,
  slug: string,
  context?: CarContext,
) {
  const query = context
    ? new URLSearchParams({
        make: context.make,
        model: context.model,
        ...(context.year ? { year: String(context.year) } : {}),
      }).toString()
    : "";
  return `/${locale}/products/${slug}${query ? "?" + query : ""}`;
}
