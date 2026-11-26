import type { Locale, Product } from "./catalog";
import { feedExclusionReasons } from "./merchant-feed";

export type MerchantRow = { product: Product; images: string[] };

/**
 * Summarize feed eligibility using the exact same exclusion rules as the
 * actual Google Merchant Center export. All counts are aggregate-only.
 */
export function merchantReadiness(rows: MerchantRow[], locale: Locale) {
  const reasons: Record<string, number> = {};
  let eligible = 0;
  for (const { product, images } of rows) {
    const exclusions = feedExclusionReasons(product, locale, images);
    if (!exclusions.length) eligible++;
    for (const reason of exclusions) reasons[reason] = (reasons[reason] ?? 0) + 1;
  }
  return {
    locale,
    productsChecked: rows.length,
    productsEligible: eligible,
    productsExcluded: rows.length - eligible,
    exclusions: Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
  };
}

export function merchantImagesByProduct(
  images: { id: string; product_id: string; path: string }[],
  isRemote: (path: string) => boolean,
) {
  const grouped = new Map<string, string[]>();
  for (const image of images) {
    if (!image.path?.trim()) continue;
    const list = grouped.get(image.product_id) ?? [];
    list.push(isRemote(image.path) ? image.path : `/product-media/${image.id}`);
    grouped.set(image.product_id, list);
  }
  return grouped;
}
