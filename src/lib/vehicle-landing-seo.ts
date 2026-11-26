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
  if (locale === "ar")
    return {
      title: `قسم ${category} لموديل ${fullName} في مصر`,
      description: `تصفح المنتجات الموجودة في قسم ${category} لعربية ${fullName} في كتالوج موبِك. القسم جزء من المنتجات المسجلة للموديل؛ راجع رقم القطعة والموتور وسنة الصنع قبل الطلب.`,
    };
  return {
    title: `${fullName} ${category} category in Egypt`,
    description: `Browse MOPC's ${category} category for ${fullName}. This is a filtered selection from the model catalogue. Confirm part number, engine and model year before buying.`,
  };
}
