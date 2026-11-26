export const TARGET_ORIGIN = "https://mopc.store";
export function siteOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  return env.SEO_DOMAIN_MIGRATION === "true"
    ? TARGET_ORIGIN
    : new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin;
}
/** Canonicalize the bare homepage at the edge, before Next.js can stream a 200. */
export function rootLocaleRedirect(url: URL) {
  if (url.pathname !== "/") return null;
  const target = new URL(url.href);
  target.pathname = "/ar";
  return target;
}

/** Redirect retired model spellings, preserving category, year and search
 * parameters. Only enable after the historical product application references
 * have been migrated to the canonical model in the live database.
 */
export function legacyVehicleModelRedirect(url: URL) {
  const match = url.pathname.match(
    /^\/(ar|en)\/brands\/(chevrolet|opel)\/([a-z0-9-]+)(\/[^/]+)?\/?$/,
  );
  if (!match) return null;
  const [, locale, brand, model, category = ""] = match;
  const canonical = brand === "chevrolet" && model === "cruz"
    ? "cruze"
    : brand === "opel" && model === "insginia-a"
      ? "insignia-a"
      : null;
  if (!canonical) return null;
  const target = new URL(url.href);
  target.pathname = `/${locale}/brands/${brand}/${canonical}${category}`;
  return target;
}

export function migrationRedirect(
  url: URL,
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.SEO_DOMAIN_MIGRATION !== "true" ||
    /^\/(api|auth|admin)(\/|$)/.test(url.pathname)
  )
    return null;
  const hosts = [
    "mansokar.vercel.app",
    "mansokar-9apps.vercel.app",
    "mopc.store",
    "www.mopc.store",
  ];
  if (!hosts.includes(url.hostname) || url.origin === TARGET_ORIGIN)
    return null;
  return new URL(url.pathname + url.search, TARGET_ORIGIN).href;
}
export function indexingApproved(
  env: Record<string, string | undefined> = process.env,
) {
  return env.STORE_LAUNCH_APPROVED === "true" && env.VERCEL_ENV !== "preview";
}
