import type { Locale } from "./catalog";

/** Make model-category search snippets distinct from the model overview.
 * Category copy describes a filtered product subset and never claims that a
 * vehicle or part is universally compatible.
 */
export function modelCategorySearchCopy(input: {
  locale: Locale;
  make: string;
  model: string;
  category: string;
}) {
  const { locale, make, model, category } = input;
  const fullName = `${make} ${model}`.trim();
  // Keep category intent prominent for searches such as "قطع ميكانيكية شيفروليه كروز".
  // A section is a subset of the model's recorded catalogue, not a universal
  // fitment claim. Avoid repeating "قطع غيار" in generic category names.
  if (locale === "ar") {
    const isGeneric = category.trim() === "قطع غيار";
    const title = isGeneric
      ? `قسم قطع الغيار ${fullName}`
      : `${category} ${fullName} | قطع غيار`;
    return {
      title,
      description: `تصفح ${category} ${fullName} في موبِك من المنتجات المسجلة للموديل. قارن اسم القطعة ورقمها وماركتها، وراجع سنة الصنع والموتور قبل الطلب.`,
    };
  }
  return {
    title: `${fullName} ${category} in Egypt`,
    description: `Browse ${category} for ${fullName} at MOPC. Compare part numbers and makers; check year, engine and fitment before ordering.`,
  };
}
