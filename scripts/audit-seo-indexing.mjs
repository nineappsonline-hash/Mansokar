/**
 * Read-only SEO smoke audit against the currently deployed storefront.
 * Ensures search crawlers can discover the sitemap and that indexable product
 * pages contain a canonical and purchasable Offer structured data.
 *
 * npm run seo:live-audit
 * SEO_BASE_URL=https://mopc.store SEO_REPORT_PATH=reports/seo-live.json npm run seo:live-audit
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const origin = new URL(process.env.SEO_BASE_URL || "https://mopc.store").origin;
const output = process.env.SEO_REPORT_PATH || "reports/seo-live.json";
const checks = [];
const sampleSize = 8;
// Known Google-indexed SKUs are checked while they remain in the live sitemap.
// An intentionally retired listing must not trigger a false monitoring error.
const indexedProductIds = [
  "c4c0ce8c-7060-4591-9e4e-64650dfc7f15",
  "dd33f9e5-f912-4b77-b474-5114fb4c4192",
  "1f840aa9-ea09-4d10-b996-2282152fb18a",
  "c1c18d2f-fd78-4f94-aca8-42d55e132175",
];
const timeoutMs = 20000;
const fail = (label, reason) => checks.push({ label, status: "FAIL", reason });
const pass = (label, note) => checks.push({ label, status: "PASS", note });
const fetchPage = async (path, redirect = "follow") => {
  const response = await fetch(new URL(path, origin), {
    redirect,
    headers: { "User-Agent": "MOPC-SEO-Audit/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  return { response, body };
};
const inspect = async (label, run) => {
  try { await run(); }
  catch (error) { fail(label, String(error)); }
};
const linkCanonical = (html) => {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const tag = tags.find((value) => /\brel=["']canonical["']/i.test(value));
  return tag?.match(/\bhref=["']([^"']+)/i)?.[1] || null;
};
const hasNoindex = (html) => /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)
  || /<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html);
const structuredObjects = (html) => {
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  return scripts.filter((value) => /\btype=["']application\/ld\+json["']/i.test(value))
    .flatMap((script) => {
      const text = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "");
      try { const obj = JSON.parse(text); return Array.isArray(obj) ? obj : [obj]; }
      catch { return []; }
    });
};
const productsIn = (obj) => {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj.flatMap(productsIn);
  const product = obj["@type"] === "Product" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"));
  return [...(product ? [obj] : []), ...productsIn(obj["@graph"] || [])];
};

await inspect("root redirect", async () => {
  const { response } = await fetchPage("/", "manual");
  const location = response.headers.get("location");
  if (![301, 308].includes(response.status) || !location || new URL(location, origin).href !== origin + "/ar")
    throw Error(`Expected permanent redirect to /ar, received ${response.status} ${location || ""}`);
  pass("root redirect", "Permanent redirect / -> /ar");
});
await inspect("robots.txt", async () => {
  const { response, body } = await fetchPage("/robots.txt");
  if (response.status !== 200 || !body.includes("Sitemap:") || !body.includes("/sitemap.xml"))
    throw Error(`robots.txt unexpected: HTTP ${response.status}; sitemap reference missing`);
  if (!/Disallow:\s*\/admin/i.test(body))
    throw Error("Administrative area not disallowed in robots.txt");
  if (/User-agent:\s*\*[^]*?Disallow:\s*\/\s*(?:\r?\n|$)/i.test(body.split(/User-agent:\s*(?:GPTBot|Google-Extended)/i)[0]))
    throw Error("All-user-agents rule appears to block the entire storefront");
  pass("robots.txt", "200; sitemap advertised; admin disallowed; public crawl allowed");
});
let sitemapProducts = "";
let sitemapVehicles = "";
await inspect("sitemap index", async () => {
  const { response, body } = await fetchPage("/sitemap.xml");
  if (response.status !== 200 || !body.includes("<sitemapindex") || !body.includes("/sitemaps/products.xml"))
    throw Error(`Missing sitemap index or product sitemap: HTTP ${response.status}`);
  pass("sitemap index", "200; index references product sitemap");
});
await inspect("vehicle sitemap", async () => {
  const { response, body } = await fetchPage("/sitemaps/vehicles.xml");
  if (response.status !== 200 || !body.includes("<urlset") || !body.includes("/brands/"))
    throw Error(`Vehicle sitemap missing or empty: HTTP ${response.status}`);
  sitemapVehicles = body;
  pass("vehicle sitemap", "200; model URLs discoverable in XML");
});
await inspect("product sitemap", async () => {
  const { response, body } = await fetchPage("/sitemaps/products.xml");
  if (response.status !== 200 || !body.includes("<urlset") || !body.includes("/ar/products/"))
    throw Error(`Missing Arabic product URLs: HTTP ${response.status}`);
  sitemapProducts = body;
  pass("product sitemap", "200; Arabic product URLs available");
});
await inspect("Arabic homepage canonical", async () => {
  const { response, body } = await fetchPage("/ar");
  const canonical = linkCanonical(body);
  if (response.status !== 200 || (canonical && new URL(canonical, origin).href !== origin + "/ar"))
    throw Error(`Homepage status or canonical unexpected: ${response.status}, ${canonical}`);
  if (!canonical) throw Error("Homepage canonical missing");
  if (hasNoindex(body) || /\bnoindex\b/i.test(response.headers.get("x-robots-tag") || ""))
    throw Error("Arabic homepage unexpectedly noindex");
  pass("Arabic homepage canonical", "200; /ar canonical; indexable");
});
// Crawl a bounded bilingual sample of actual model pages advertised by XML.
const modelSitemapUrls = [...new Set(
  [...sitemapVehicles.matchAll(/<loc>(https?:\/\/[^<]*\/(?:ar|en)\/brands\/[^<]+)<\/loc>/g)]
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .filter((url) => {
      const pathname = new URL(url).pathname;
      return new URL(url).origin === origin &&
        /^\/(?:ar|en)\/brands\/[^/]+\/[^/]+$/.test(pathname);
    }),
)];
const modelSample = [
  ...modelSitemapUrls.filter((url) => new URL(url).pathname.startsWith("/ar/")).slice(0, 3),
  ...modelSitemapUrls.filter((url) => new URL(url).pathname.startsWith("/en/")).slice(0, 3),
];
if (sitemapVehicles && !modelSample.length)
  fail("vehicle samples", "Vehicle sitemap contains no model landing pages");
let modelPagesPassed = 0;
for (const url of modelSample) {
  const path = new URL(url).pathname;
  await inspect(`model landing ${path}`, async () => {
    const { response, body } = await fetchPage(url);
    if (response.status !== 200) throw Error(`Model HTTP ${response.status}`);
    const canonical = linkCanonical(body);
    if (!canonical || new URL(canonical, origin).href !== url)
      throw Error(`Model canonical mismatch: ${canonical}`);
    if (hasNoindex(body) || /\bnoindex\b/i.test(response.headers.get("x-robots-tag") || ""))
      throw Error("Model unexpectedly noindex");
    const collection = structuredObjects(body).find((item) =>
      item?.["@type"] === "CollectionPage" && item?.mainEntity?.["@type"] === "ItemList"
    );
    if (!collection || !Array.isArray(collection.mainEntity.itemListElement) ||
        collection.mainEntity.itemListElement.length === 0)
      throw Error("No valid CollectionPage / nonempty ItemList JSON-LD");
    if (!collection.mainEntity.itemListElement.every((item) =>
      item["@type"] === "ListItem" && item.position > 0 &&
      /^https:\/\/mopc\.store\/(?:ar|en)\/products\//.test(item.url || "")
    )) throw Error("Model ItemList contains invalid product links");
    modelPagesPassed++;
    pass(`model landing ${path}`, "200; canonical; indexable; populated CollectionPage");
  });
}

const matches = [...sitemapProducts.matchAll(/<loc>(https?:\/\/[^<]*\/(?:ar|en)\/products\/[^<]+)<\/loc>/g)]
  .map((match) => match[1].replaceAll("&amp;", "&"))
  .filter((url) => new URL(url).origin === origin);
const unique = [...new Set(matches)];
const indexed = indexedProductIds.flatMap((id) =>
  unique.filter((url) => url.endsWith(`-p-${id}`)),
);
const sampleUrls = [...new Set([
  ...indexed,
  ...unique.filter((url) => new URL(url).pathname.startsWith("/ar/products/")).slice(0, 2),
  ...unique.filter((url) => new URL(url).pathname.startsWith("/en/products/")).slice(0, 2),
])].slice(0, sampleSize);
let sampled = 0;
for (const url of sampleUrls) {
  const label = `product markup ${new URL(url).pathname.split("/").at(-1)}`;
  await inspect(label, async () => {
    const { response, body } = await fetchPage(url);
    if (response.status !== 200) throw Error(`Product HTTP ${response.status}`);
    const canonical = linkCanonical(body);
    if (!canonical || new URL(canonical, origin).href !== url) throw Error(`Canonical mismatch ${canonical}`);
    if (hasNoindex(body) || /\bnoindex\b/i.test(response.headers.get("x-robots-tag") || ""))
      throw Error("Product unexpectedly noindex");
    const products = structuredObjects(body).flatMap(productsIn);
    if (!products.length) throw Error("No valid Product JSON-LD found");
    if (!products.some((product) => product.offers && product.offers.priceCurrency === "EGP" && product.offers.price !== undefined))
      throw Error("Product has no EGP Offer; check live checkout orderability vs markup");
    sampled++;
    pass(label, "200; canonical; indexable; Product/Offer EGP");
  });
}
if (!matches.length) fail("product samples", "No Arabic products in sitemap to sample");

const report = {
  measuredAt: new Date().toISOString(), origin,
  note: "Read-only HTTP checks. Google URL Inspection is separate, and indexed snapshots can lag the live website.",
  modelPagesPassed, modelPagesAttempted: modelSample.length,
  eligibleProductSamplesPassed: sampled, eligibleProductSamplesAttempted: sampleUrls.length,
  checks,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(checks.map((x) => `[${x.status}] ${x.label}: ${x.reason || x.note}`).join("\n"));
console.log(`SEO live report written: ${output}`);
if (checks.some((x) => x.status === "FAIL")) process.exitCode = 1;
