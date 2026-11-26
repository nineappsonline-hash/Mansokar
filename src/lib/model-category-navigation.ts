import { duplicateModelCategory, vehicleLandingLocales } from "./seo-inventory";
import { translatedProduct } from "./seo-policy";
import type { Locale, Text } from "./catalog";

/** Determine model-category browse destinations from scoped inventory counts.
 * This does not load the full product/photo/CMS sitemap at request time.
 * Empty or duplicate category landings must not be linked.
 */
export function modelCategoryBrowsePaths(input: {
  locale: Locale;
  make: string;
  model: string;
  makeName: { ar: string; en: string };
  modelName: Text;
  modelTotal: number;
  categories: { slug: string; name: Text; total: number }[];
}): Set<string> {
  const { locale, make, model, makeName, modelName, modelTotal } = input;
  if (!vehicleLandingLocales(makeName, modelName).includes(locale) || modelTotal <= 0) {
    return new Set();
  }
  const modelCounts = { [`${make}/${model}`]: modelTotal };
  const categoryCounts = Object.fromEntries(input.categories.map(({ slug, total }) =>
    [`${make}/${model}/${slug}`, total]));
  return new Set(input.categories
    .filter(({ name, slug, total }) =>
      total > 0 &&
      translatedProduct({ name }, locale) &&
      !duplicateModelCategory(make, model, slug, modelCounts, categoryCounts))
    .map(({ slug }) => `/brands/${make}/${model}/${slug}`));
}
