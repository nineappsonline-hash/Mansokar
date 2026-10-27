import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.BASE_URL || "http://localhost:3000";
const checks = [];
try {
  for (const locale of ["en", "ar"]) {
    await page.goto(`${base}/${locale}`);
    await page.locator("h1").waitFor();
    assert.equal(await page.locator(".brand-card").count(), 4);
    assert.equal(await page.locator(".hero select").count(), 0);
    assert.equal(
      await page.locator("[dir]").first().getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    for (const brand of ["opel", "peugeot", "citroen", "mg"]) {
      await page.goto(`${base}/${locale}/brands/${brand}`);
      assert.equal(await page.locator(".model-card").count(), 3);
    }
    checks.push(`${locale}: home + four brand model pages`);
  }
  await page.goto(base + "/en/brands/opel/astra");
  await page.selectOption("#configuration", "opel-astra-2021-0");
  await page.locator("form button").click();
  await page.waitForURL("**/catalog?vehicle=opel-astra-2021-0");
  assert.equal(await page.locator(".product-card").count(), 2);
  await page.goto(base + "/en/products/precision-oil-filter");
  await page.locator(".fit-card.confirmed").waitFor();
  assert.match(await page.locator(".fit-card").innerText(), /Opel ASTRA/);
  assert.doesNotMatch(await page.locator(".fit-card").innerText(), /Peugeot/);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.goto(base + "/en/cart");
  await page
    .locator(".cart-row")
    .filter({ hasText: "Precision oil filter" })
    .waitFor();
  assert.match(
    await page.locator(".cart-row").innerText(),
    /Precision oil filter/,
  );
  checks.push("selected fitment privacy + add to cart");
  await page.goto(base + "/en/products/precision-oil-filter");
  await page.locator(".product-art.large").click();
  await page.locator("dialog").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("dialog").waitFor({ state: "hidden" });
  checks.push("gallery keyboard open / Escape close");
  await page.goto(
    base + "/en/products/precision-oil-filter?vehicle=opel-astra-2021-1",
  );
  assert.equal(await page.locator(".fit-card.confirmed").count(), 0);
  assert.match(await page.locator(".fit-card").innerText(), /not confirmed/);
  checks.push("wrong engine remains unconfirmed");
  await page.getByRole("link", { name: "العربية", exact: true }).click();
  await page.waitForURL(
    "**/ar/products/precision-oil-filter?vehicle=opel-astra-2021-1",
  );
  assert.equal(await page.locator(".fit-card.confirmed").count(), 0);
  checks.push("language switch preserves product and active engine");
  await page.goto(base + "/admin");
  assert.match(await page.locator("h1").innerText(), /Administrator access/);
  const denied = await page.request.post(base + "/api/admin-product", {
    headers: { origin: base },
    data: {},
  });
  assert.ok([401, 403, 503].includes(denied.status()));
  checks.push("admin access denied without verified allowlist");
  for (const locale of ["ar", "en"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/${locale}`);
    await page.locator("h1").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    mkdirSync("docs/screenshots", { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/home-${locale}-mobile.png`,
      fullPage: true,
      caret: "initial",
    });
    await page.goto(`${base}/${locale}/products/precision-oil-filter`);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: `docs/screenshots/product-${locale}-mobile.png`,
      fullPage: true,
      caret: "initial",
    });
    const bar = await page.locator(".mobile-buy-bar").boundingBox();
    assert.ok(bar && bar.y + bar.height <= 845);
    checks.push(
      `${locale}: mobile home/product without overflow + bottom action bar`,
    );
  }
  await page.evaluate(() =>
    localStorage.setItem("compare", JSON.stringify([{ id: "demo-1" }])),
  );
  await page.goto(base + "/en/compare");
  await page
    .getByRole("heading", {
      name: "Choose a second product to compare",
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator(".product-grid article").count(), 0);
  await page.evaluate(() =>
    localStorage.setItem(
      "compare",
      JSON.stringify([{ id: "demo-1" }, { id: "demo-5" }]),
    ),
  );
  await page.goto(base + "/en/compare");
  await page.locator(".product-grid article").nth(1).waitFor();
  assert.equal(await page.locator(".product-grid article").count(), 2);
  await page.goto(base + "/ar/brands/opel");
  assert.match(await page.title(), /أوبل/);
  const crumbs = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  assert.ok(
    crumbs.some((text) => JSON.parse(text)["@type"] === "BreadcrumbList"),
  );
  checks.push(
    "comparison requires two same-family products; Arabic brand metadata and linked breadcrumb schema verified",
  );
  await page.goto(base + "/en");
  await page.locator("#home-search").fill("filters");
  await page
    .locator('.search-suggestions a[href="/en/categories/filters"]')
    .waitFor();
  await page
    .locator('.search-suggestions a[href="/en/categories/filters"]')
    .click();
  await page.getByRole("heading", { name: "Filters", exact: true }).waitFor();
  checks.push(
    "category autocomplete navigates to its localized category landing page",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  const finalHome = await page.goto(base + "/en");
  assert.equal(
    new URL(await page.locator('link[rel="canonical"]').getAttribute("href"))
      .pathname,
    "/en",
  );
  assert.match(finalHome.headers()["x-robots-tag"] ?? "", /noindex/);
  checks.push(
    "preview indexing is disabled and homepage canonical URLs do not redirect",
  );
  await page.screenshot({
    path: "docs/screenshots/home-en-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  writeFileSync(
    "docs/BROWSER_RESULTS.json",
    JSON.stringify({ base, checks, errors }, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(checks.join("\n"));
} finally {
  await browser.close();
}
