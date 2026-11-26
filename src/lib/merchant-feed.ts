import type { Locale, Product } from "./catalog";
import {
  eligibleProduct,
  merchantPriceReady,
  verifiedAvailability,
  verifiedCondition,
} from "./seo-policy";
import { publicProduct } from "./public-product";
import { escapeXml } from "./sitemap-xml";
export function validGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = [...value].map(Number),
    check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((total, n, i) => total + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
export function feedExclusionReasons(
  p: Product,
  locale: Locale,
  images: string[],
) {
  return [
    ...(!merchantPriceReady(p) ? ["invalid_price"] : []),
    ...(!eligibleProduct(p, locale) ? ["not_eligible_for_locale"] : []),
    ...(/^أصلي$/u.test(p.manufacturer.trim()) ? ["brand_unverified"] : []),
    ...(!p.orderable ? ["not_orderable"] : []),
    ...(!images.length ? ["missing_photo"] : []),
    ...(!verifiedAvailability(p) ? ["unknown_availability"] : []),
    ...(!verifiedCondition(p) ? ["unknown_condition"] : []),
  ];
}
export function merchantFeed(
  products: { product: Product; images: string[] }[],
  locale: Locale,
  base: string,
) {
  const stock: Record<string, string> = {
    InStock: "in_stock",
    OutOfStock: "out_of_stock",
    PreOrder: "preorder",
    BackOrder: "backorder",
  };
  const condition: Record<string, string> = {
    NewCondition: "new",
    UsedCondition: "used",
    RefurbishedCondition: "refurbished",
  };
  const tag = (name: string, value: string) =>
    `<g:${name}>${escapeXml(value)}</g:${name}>`;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>MOPC</title><link>${escapeXml(base)}</link><description>MOPC automotive parts in Egypt</description>${products
    .filter(
      ({ product: p, images }) =>
        !feedExclusionReasons(p, locale, images).length,
    )
    .map(({ product: raw, images }) => {
      const p = publicProduct(raw);
      return (
        "<item>" +
        tag("id", p.id) +
        tag("title", p.name[locale]) +
        tag("description", p.description[locale]) +
        tag("link", `${base}/${locale}/products/${p.slug}`) +
        tag("image_link", new URL(images[0], base).href) +
        tag("price", `${((p.sale ?? p.price) / 100).toFixed(2)} EGP`) +
        tag(
          "availability",
          stock[verifiedAvailability(p)!.split("/").at(-1)!],
        ) +
        tag("condition", condition[verifiedCondition(p)!.split("/").at(-1)!]) +
        tag("brand", p.manufacturer) +
        tag("mpn", p.partNumber) +
        (p.specs.gtin && validGtin(p.specs.gtin)
          ? tag("gtin", p.specs.gtin)
          : "") +
        "</item>"
      );
    })
    .join("")}</channel></rss>`;
}
