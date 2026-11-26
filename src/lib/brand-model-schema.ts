import type { Locale, Text } from "./catalog";

/** List only the registered models actually shown on a make landing page.
 * Model labels and URLs come from the catalogue, not a generated fitment claim.
 */
export function brandModelListSchema(input: {
  locale: Locale;
  make: { slug: string; ar: string; name: string };
  models: { slug: string; name: Text }[];
  origin: string;
}) {
  const { locale, make, origin } = input;
  const base = new URL(origin).origin;
  const models = input.models.filter((model) =>
    Boolean(model.slug?.trim() && model.name?.[locale]?.trim()),
  );
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${base}/${locale}/brands/${encodeURIComponent(make.slug)}#models`,
    name: locale === "ar"
      ? `موديلات ${make.ar} المسجلة`
      : `Registered ${make.name} models`,
    numberOfItems: models.length,
    itemListElement: models.map((model, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${locale === "ar" ? make.ar : make.name} ${model.name[locale]}`,
      url: `${base}/${locale}/brands/${encodeURIComponent(make.slug)}/${encodeURIComponent(model.slug)}`,
    })),
  };
}
