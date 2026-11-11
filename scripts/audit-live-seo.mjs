// Read-only audit: public pages only; no orders, credentials or customer records.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const origin = process.env.BASE_URL || "https://mopc.store";
const expectedIndex = process.env.EXPECT_INDEXABLE === "true";
const report = {
  capturedAt: new Date().toISOString(),
  origin,
  sitemaps: {},
  pages: [],
  issues: [],
};
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const locations = [];
  for (const group of ["products", "vehicles", "guides", "pages"]) {
    const response = await fetch(`${origin}/sitemaps/${group}.xml`);
    assert.equal(response.status, 200);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.every((url) => url.startsWith(origin + "/")));
    report.sitemaps[group] = urls.length;
    locations.push(...urls);
  }
  const routes = [
    ...new Set([
      "/ar",
      "/en",
      ...["ar", "en"].flatMap((l) =>
        ["products", "brands", "guides"].flatMap((type) =>
          locations
            .filter((u) => u.includes(`/${l}/${type}/`))
            .slice(0, 3)
            .map((u) => new URL(u).pathname),
        ),
      ),
      "/ar/policies/shipping",
      "/ar/policies/returns",
      "/ar/policies/warranty",
      "/ar/cart",
      "/ar/checkout",
      "/ar/catalog?q=filter",
      "/ar/products/does-not-exist",
    ]),
  ];
  for (let offset = 0; offset < routes.length; offset += 4) {
    await Promise.all(
      routes.slice(offset, offset + 4).map(async (route) => {
        const page = await context.newPage();
        const response = await page.goto(origin + route, {
          waitUntil: "domcontentloaded",
        });
        const result = await page.evaluate(() => ({
          title: document.title,
          description: document.querySelector('meta[name="description"]')
            ?.content,
          robots: document.querySelector('meta[name="robots"]')?.content,
          canonical: document.querySelector('link[rel="canonical"]')?.href,
          h1Count: document.querySelectorAll("h1").length,
          ogTitle: document.querySelector('meta[property="og:title"]')?.content,
          structuredTypes: [
            ...document.querySelectorAll('script[type="application/ld+json"]'),
          ].flatMap((n) => {
            const data = JSON.parse(n.textContent);
            return (data["@graph"] || [data]).map((d) => d["@type"]);
          }),
        }));
        const privateRoute = /\/(cart|checkout|catalog)(\?|$)/.test(route);
        const missing = route.endsWith("does-not-exist");
        const headerRobots = response.headers()["x-robots-tag"];
        if (missing) assert.equal(response.status(), 404);
        else {
          assert.equal(response.status(), 200);
          if (privateRoute) assert.match(result.robots, /noindex/);
          else {
            assert.ok(result.title && result.description && result.canonical);
            assert.equal(result.h1Count, 1, `${route}: expected one H1`);
            if (/noindex/.test(`${headerRobots} ${result.robots}`))
              report.issues.push(`${route}: noindex`);
          }
        }
        console.log(`Checked ${route}: ${response.status()}`);
        report.pages.push({
          route,
          status: response.status(),
          headerRobots,
          ...result,
        });
        await page.close();
      }),
    );
  }
  report.pages.sort((a, b) => a.route.localeCompare(b.route));
  const robots = await (await fetch(origin + "/robots.txt")).text();
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  report.robots = robots;
  writeFileSync(
    "docs/seo/live-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        sitemaps: report.sitemaps,
        pagesChecked: report.pages.length,
        issues: report.issues,
      },
      null,
      2,
    ),
  );
  if (expectedIndex) assert.deepEqual(report.issues, []);
} finally {
  await browser.close();
}
