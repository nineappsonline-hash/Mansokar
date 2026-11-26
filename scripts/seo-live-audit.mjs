#!/usr/bin/env node
/**
 * Read-only live SEO smoke audit. Run against an approved, public production site.
 * Usage: node scripts/seo-live-audit.mjs https://mopc.store
 */
const origin = new URL(process.argv[2] || "https://mopc.store").origin;
const errors = [];
const results = [];
const timeoutMs = 15000;
const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
const locations = (xml) => [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((m) => decode(m[1].trim()));
async function get(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Cross-origin audit target: " + url.href);
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow", headers: { "user-agent": "MOPC-SEO-Smoke-Audit/1.0" } });
  const body = await response.text();
  return { url: response.url, status: response.status, body, contentType: response.headers.get("content-type") || "" };
}
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  if (!condition) errors.push(label + (detail ? ": " + detail : ""));
}
function canonical(html) {
  return html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']+)/i)?.[1]
    || html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] || null;
}
try {
  const robots = await get("/robots.txt");
  check("robots.txt returns 200", robots.status === 200, String(robots.status));
  check("robots.txt references sitemap", robots.body.includes(origin + "/sitemap.xml"));
  check("robots allows crawling public pages", !/^Disallow:\s*\/\s*$/mi.test(robots.body));
  const index = await get("/sitemap.xml");
  check("sitemap index returns XML", index.status === 200 && index.body.includes("<sitemapindex"), String(index.status));
  const indexes = locations(index.body);
  check("sitemap index has groups", indexes.length >= 4, String(indexes.length));
  check("all sitemap groups are same origin", indexes.every((u) => new URL(u).origin === origin));
  for (const sitemapUrl of indexes) {
    if (new URL(sitemapUrl).origin !== origin) continue;
    const group = await get(sitemapUrl);
    check("group XML: " + new URL(sitemapUrl).pathname, group.status === 200 && group.body.includes("<urlset"), String(group.status));
    const urls = locations(group.body).filter((u) => /^https?:\/\//.test(u));
    check("group URL origins: " + new URL(sitemapUrl).pathname, urls.every((u) => new URL(u).origin === origin), String(urls.length));
    for (const pageUrl of urls.slice(0, 3)) {
      if (new URL(pageUrl).origin !== origin) continue;
      const page = await get(pageUrl);
      check("page HTTP 200: " + new URL(pageUrl).pathname, page.status === 200, String(page.status));
      const tag = canonical(page.body);
      check("page canonical: " + new URL(pageUrl).pathname, !!tag && new URL(tag, page.url).href === pageUrl, String(tag));
      check("page is not noindex: " + new URL(pageUrl).pathname,
        !/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(page.body) &&
        !/<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots/i.test(page.body));
    }
  }
  const root = await get("/");
  check("root redirects to Arabic canonical", new URL(root.url).pathname === "/ar", root.url);
} catch (error) {
  errors.push("Audit interrupted: " + (error instanceof Error ? error.message : String(error)));
}
for (const item of results) console.log((item.ok ? "PASS" : "FAIL") + " " + item.label + (item.ok ? "" : " — " + item.detail));
console.log("\n" + results.filter((r) => r.ok).length + "/" + results.length + " checks passed");
if (errors.length) {
  console.error("\nSEO audit failures:\n" + errors.join("\n"));
  process.exitCode = 1;
}
