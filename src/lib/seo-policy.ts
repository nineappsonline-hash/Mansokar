import type { Locale, Product } from "./catalog";
import { readApplications } from "./product-applications";
export function translatedProduct(p: Pick<Product, "name">, locale: Locale) {
  const name = p.name?.[locale]?.trim() || "";
  return (
    name.length >= 3 &&
    (locale === "ar"
      ? /[\u0600-\u06ff]/.test(name)
      : /[a-zA-Z]{2}/.test(name) && !/[\u0600-\u06ff]/.test(name))
  );
}
export function eligibleProduct(p: Product, locale?: Locale) {
  return (
    !p.demo &&
    p.status === "published" &&
    !!p.manufacturer?.trim() &&
    !!p.partNumber?.trim() &&
    Number.isSafeInteger(p.price) &&
    p.price >= 0 &&
    (locale
      ? translatedProduct(p, locale)
      : translatedProduct(p, "ar") || translatedProduct(p, "en"))
  );
}
export function canonicalPage(
  path: string,
  filters: Record<string, string | undefined>,
) {
  const page = Number(filters.page);
  return (/^\/(?:ar|en)\/brands\/[^/]+\/[^/]+(?:\/[^/]+)?$/.test(path) ||
    /^\/(?:ar|en)\/site-map$/.test(path)) &&
    Number.isInteger(page) &&
    page > 1 &&
    !Object.keys(filters).some(
      (k) => k !== "page" && !k.startsWith("utm_") && !!filters[k],
    )
    ? `${path}?page=${page}`
    : path;
}
export function verifiedAvailability(p: Pick<Product, "specs">) {
  const statuses: Record<string, string> = {
    in_stock: "InStock",
    out_of_stock: "OutOfStock",
    preorder: "PreOrder",
    backorder: "BackOrder",
  };
  const quantity = p.specs?.stock_quantity;
  if (
    quantity !== undefined &&
    quantity !== "" &&
    (!/^\d+$/.test(quantity) || Number(quantity) === 0)
  )
    return quantity === "0" ? "https://schema.org/OutOfStock" : undefined;
  return statuses[p.specs?.stock_status]
    ? `https://schema.org/${statuses[p.specs.stock_status]}`
    : undefined;
}
export function verifiedCondition(p: Product) {
  const values: Record<string, string> = {
    new: "NewCondition",
    used: "UsedCondition",
    refurbished: "RefurbishedCondition",
  };
  const value = p.specs?.product_condition || p.condition;
  return value && values[value]
    ? `https://schema.org/${values[value]}`
    : undefined;
}
/** Amounts are stored as integer piasters; Merchant Center accepts EGP
 * with two decimal places, not only whole-pound amounts.
 */
export function merchantPriceReady(p: Pick<Product, "price" | "sale">) {
  return (
    Number.isSafeInteger(p.sale ?? p.price) &&
    (p.sale ?? p.price) >= 0
  );
}
export function productQualityIssues(
  p: Product,
  photoCount = 0,
  hasFitment = false,
) {
  return [
    ...(!p.name?.ar?.trim() ? ["missing_arabic_name"] : []),
    ...(!translatedProduct(p, "en") ? ["missing_english_translation"] : []),
    ...(!p.partNumber?.trim() ? ["missing_mpn"] : []),
    ...(!photoCount ? ["missing_photos"] : []),
    ...(!hasFitment ? ["unknown_compatibility"] : []),
    ...(!verifiedAvailability(p) ? ["unknown_stock"] : []),
    ...(!merchantPriceReady(p) ? ["invalid_price"] : []),
    ...(!verifiedCondition(p) ? ["unknown_condition"] : []),
  ];
}

/** A model-wide application is valid even when no production years were provided. */
export function hasModelApplication(specs: Record<string, string>, modelId: string) {
  return readApplications(specs).some((application) => application.model_id === modelId);
}

/** Category landing pages require real search inventory and a translated label. */
export function categoryLandingIndexable(
  total: number,
  name: Pick<Product, "name">["name"] | undefined,
  locale: Locale,
) {
  return Number.isFinite(total) && total > 0 &&
    Boolean(name && translatedProduct({ name }, locale));
}
