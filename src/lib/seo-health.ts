import type { Product } from "./catalog";
import { readApplications } from "./product-applications";
import { publicProduct, publicProductSlug } from "./public-product";
import { productSearchCopy } from "./product-seo";
import { eligibleProduct, productQualityIssues } from "./seo-policy";
import { countryOfOrigin } from "./product-specifications";
export function seoHealthRows(
  products: Product[],
  images: { product_id: string }[],
  fitments: { product_id: string }[],
  modelIds: string[],
  base: string,
) {
  const titles = new Map<string, number>(),
    mpns = new Map<string, number>();
  for (const p of products) {
    const title = p.name.ar.trim().toLowerCase();
    titles.set(title, (titles.get(title) || 0) + 1);
    const part = (p.manufacturer + "|" + p.partNumber).trim().toLowerCase();
    mpns.set(part, (mpns.get(part) || 0) + 1);
  }
  return products.map((p) => {
    const photoCount = images.filter((i) => i.product_id === p.id).length;
    const linked =
      fitments.some((f) => f.product_id === p.id) ||
      readApplications(p.specs).some(
        (a) => modelIds.includes(a.model_id) && a.years.length > 0,
      );
    const issues = [
      ...productQualityIssues(p, photoCount, linked),
      ...(!countryOfOrigin(p.specs.country_of_origin)
        ? ["unknown_origin"]
        : []),
      ...((titles.get(p.name.ar.trim().toLowerCase()) || 0) > 1
        ? ["duplicate_title"]
        : []),
      ...((mpns.get(
        (p.manufacturer + "|" + p.partNumber).trim().toLowerCase(),
      ) || 0) > 1
        ? ["mpn_collision_review"]
        : []),
    ];
    const projected = publicProduct(p);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name.en || p.name.ar,
      canonical: `${base}/ar/products/${publicProductSlug(p)}`,
      eligibleAr: eligibleProduct(p, "ar"),
      eligibleEn: eligibleProduct(p, "en"),
      status: p.status,
      demo: p.demo,
      photoCount,
      issues,
      score: Math.max(0, 100 - issues.length * 10),
      updatedAt: p.seo_updated_at || null,
      title: productSearchCopy(projected, "ar").title,
      description: productSearchCopy(projected, "ar").description,
    };
  });
}
export type SeoHealthRow = ReturnType<typeof seoHealthRows>[number];
export function csvReport(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] || {});
  return (
    "\ufeff" +
    [
      keys,
      ...rows.map((r) =>
        keys.map((k) =>
          Array.isArray(r[k]) ? (r[k] as unknown[]).join(" | ") : (r[k] ?? ""),
        ),
      ),
    ]
      .map((r) =>
        r
          .map(
            (value) =>
              '"' +
              String(value)
                .replaceAll('"', '""')
                .replace(/^[=+@-]/, "'$&") +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
