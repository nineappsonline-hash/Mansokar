import { sitemapEntries, type SearchPage } from "./seo-inventory";
export const sitemapGroups = [
  "products",
  "vehicles",
  "guides",
  "pages",
] as const;
export type SitemapGroup = (typeof sitemapGroups)[number];
export const escapeXml = (v: unknown) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export function sitemapGroup(page: SearchPage): SitemapGroup {
  return page.kind === "product"
    ? "products"
    : page.kind === "brand" || page.kind === "model"
      ? "vehicles"
      : page.kind === "guide"
        ? "guides"
        : "pages";
}
export function sitemapIndex(base: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapGroups.map((g) => `<sitemap><loc>${escapeXml(base)}/sitemaps/${g}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
}
export function sitemapXml(
  pages: SearchPage[],
  base: string,
  group: SitemapGroup,
) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapEntries(
    pages.filter((p) => sitemapGroup(p) === group),
    base,
  )
    .map(
      (e) =>
        `<url><loc>${escapeXml(e.url)}</loc>${e.lastModified ? `<lastmod>${escapeXml(e.lastModified)}</lastmod>` : ""}${Object.entries(
          e.alternates.languages,
        )
          .map(
            ([lang, href]) =>
              `<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}"/>`,
          )
          .join(
            "",
          )}${(e.images || []).map((url) => `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`).join("")}</url>`,
    )
    .join("")}</urlset>`;
}
