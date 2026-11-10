export const TARGET_ORIGIN = "https://mopc.store";
export function siteOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  return env.SEO_DOMAIN_MIGRATION === "true"
    ? TARGET_ORIGIN
    : new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin;
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
