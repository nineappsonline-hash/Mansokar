/** These are spelling variants of a registered car model, not new fitments.
 * Never redirect or remove a legacy model until its database references have
 * been migrated and verified.  This map is used for new import selection only.
 */
const aliases: Record<string, Record<string, string>> = {
  chevrolet: { cruz: "cruze" },
  opel: { "insginia-a": "insignia-a" },
};

export function canonicalVehicleModelSlug(make: string, slug: string) {
  return aliases[make]?.[slug] ?? slug;
}

export function resolveImportModelAlias<T extends { id: string; brand: string; slug: string }>(
  brand: string,
  candidate: T,
  available: T[],
): T {
  const canonical = canonicalVehicleModelSlug(brand, candidate.slug);
  if (canonical === candidate.slug) return candidate;
  // An existing canonical model must be available: do not create inferred
  // model records or silently remap imports onto an unknown target.
  return available.find((model) =>
    model.brand === brand && model.slug === canonical,
  ) ?? candidate;
}

export function knownImportAlias(make: string, rawSlug: string) {
  return canonicalVehicleModelSlug(make, rawSlug) !== rawSlug;
}
