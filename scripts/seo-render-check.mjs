// Read-only: no account creation, catalog mutation, checkout or payment requests.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL || "http://127.0.0.1:3115";
const request = async (path) => {
  const r = await fetch(base + path);
  return { status: r.status, headers: r.headers, text: await r.text() };
};
const index = await request("/sitemap.xml");
assert.equal(index.status, 200);
assert.ok(index.text.includes("<sitemapindex"));
const children = {};
for (const group of ["products", "vehicles", "guides", "pages"]) {
  const r = await request("/sitemaps/" + group + ".xml");
  assert.equal(r.status, 200);
  assert.ok(r.text.includes("<urlset"));
  children[group] = r.text;
}
const locations = (xml) =>
  [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const product = locations(children.products).find((p) =>
  p.startsWith("/ar/products/"),
);
assert.ok(product);
const model = locations(children.vehicles).find((p) =>
  /^\/ar\/brands\/[^/]+\/[^/]+$/.test(p),
);
assert.ok(model);
const brand = model.split("/").slice(0, -1).join("/");
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
try {
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const p = await nojs.newPage();
  for (const route of [
    "/ar",
    "/en",
    brand.replace("/ar/", "/en/"),
    model.replace("/ar/", "/en/"),
    locations(children.products).find((p) => p.startsWith("/en/products/")),
    "/en/guides/check-part-compatibility",
    brand,
    model,
    product,
    "/ar/guides/check-part-compatibility",
  ]) {
    const response = await p.goto(base + route, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    assert.equal(await p.locator("h1").count(), 1);
    assert.ok((await p.locator("h1").textContent()).trim());
    assert.equal(
      await p.locator("html").getAttribute("lang"),
      route.startsWith("/en") ? "en-EG" : "ar-EG",
    );
    const canonical = await p
      .locator("link[rel=canonical]")
      .getAttribute("href");
    assert.equal(new URL(canonical).pathname, route);
    for (const text of await p
      .locator('script[type="application/ld+json"]')
      .allTextContents())
      JSON.parse(text);
    results.push({
      route,
      status: response.status(),
      serverRendered: true,
      canonical,
      jsonLd: await p.locator('script[type="application/ld+json"]').count(),
    });
  }
  await p.goto(base + brand);
  assert.ok(await p.locator("a[data-model-canonical]").count());
  await p.goto(base + model + "?page=2");
  assert.equal(
    new URL(await p.locator("link[rel=canonical]").getAttribute("href")).search,
    "?page=2",
  );
  await p.goto(base + model + "?year=2020");
  assert.match(
    await p.locator("meta[name=robots]").getAttribute("content"),
    /noindex/,
  );
  assert.equal((await request("/ar/brands/opel/does-not-exist")).status, 404);
  assert.ok(
    [401, 403].includes((await request("/api/admin-seo-report")).status),
  );
  assert.ok([401, 403].includes((await request("/api/merchant-feed")).status));
  const interactive = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const flow = await interactive.newPage();
  await flow.goto(base + brand);
  const card = flow.locator("[data-model]").first();
  await card.getByRole("button").first().click();
  const yearLink = card.locator("a[data-model-year]").first();
  await yearLink.waitFor({ state: "visible" });
  await yearLink.click();
  await flow.waitForURL(/year=/);
  const productLink = flow.locator("a.product-art").first();
  await productLink.click();
  await flow.waitForURL(/\/products\//);
  const add = flow.locator('[data-analytics="add_to_cart"]').first();
  await add.click();
  assert.ok(
    await flow.evaluate(() =>
      Object.keys(localStorage).some((k) => k.includes("cart")),
    ),
  );
  await interactive.close();
  const performance = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__seoVitals = { lcp: null, cls: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__seoVitals.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.__seoVitals.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (const route of [
      "/ar",
      brand,
      model,
      product,
      "/ar/guides/check-part-compatibility",
    ]) {
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => ({
        vitals: window.__seoVitals,
        domMs:
          performance.getEntriesByType("navigation")[0]
            .domContentLoadedEventEnd,
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
        failedImages: [...document.images].filter(
          (i) => i.complete && !i.naturalWidth,
        ).length,
      }));
      performance.push({ route, width: viewport.width, ...data });
      assert.equal(
        data.overflow,
        false,
        `Horizontal overflow ${route} at ${viewport.width}`,
      );
    }
    await ctx.close();
  }
  writeFileSync(
    "docs/seo/rendered-validation.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scope:
          "Local production build, real read-only catalog. No charges or writes. Unthrottled lab LCP/CLS; not field p75 or INP certification.",
        results,
        performance,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: SSR, locales, canonical pagination, facets, JSON-LD, 404, admin/feed authorization, mobile/desktop overflow. Measurements saved.",
  );
} finally {
  await browser.close();
}
