import { indexingApproved } from "./site-url";

/** Sitemap availability follows the public crawl policy in robots.txt. */
export function sitemapPublished(
  env: Record<string, string | undefined> = process.env,
) {
  return indexingApproved(env) && Boolean(env.NEXT_PUBLIC_SUPABASE_URL);
}
