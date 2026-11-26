/** Validate the make/model shape early, before streaming the page body.
 * Locale + brands + make + model + category is a five-segment route.
 * Category existence is validated by the storefront page against live CMS data.
 */
export function knownBrandRoute(
  segments: string[],
  brands: { slug: string }[],
  models: { brand: string; slug: string }[],
) {
  if ((segments[0] !== "ar" && segments[0] !== "en") ||
      segments[1] !== "brands" ||
      segments.length < 3 || segments.length > 5 ||
      !segments[2] || !brands.some((b) => b.slug === segments[2]))
    return false;
  if (segments.length > 3 &&
      (!segments[3] || !models.some((m) => m.brand === segments[2] && m.slug === segments[3])))
    return false;
  if (segments.length === 5 && !segments[4]) return false;
  return true;
}
