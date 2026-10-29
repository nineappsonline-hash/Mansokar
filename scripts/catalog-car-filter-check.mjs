import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3104";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const expected = await db.rpc("search_products_by_car", {
  p_make: "opel",
  p_model: "astra",
  p_year: 2021,
});
if (expected.error) throw expected.error;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  await context.addCookies([
    { name: "vehicle", value: "opel-astra-2021-0", url: base },
  ]);
  for (const locale of ["en", "ar"]) {
    await page.goto(`${base}/${locale}/catalog?make=`);
    assert.equal(
      await page
        .locator(
          ".catalog-filters [name=category],.catalog-filters [name=min],.catalog-filters [name=max]",
        )
        .count(),
      0,
    );
    await page.locator("select[name=make]").selectOption("chevrolet");
    await page.locator("select[name=model]").selectOption("cruze");
    await page.locator("select[name=year]").selectOption("2021");
    await page.locator("select[name=make]").selectOption("opel");
    assert.equal(await page.locator("select[name=model]").inputValue(), "");
    assert.equal(await page.locator("select[name=year]").inputValue(), "");
    await page.locator("select[name=model]").selectOption("astra");
    await page.locator("select[name=year]").selectOption("2021");
    await page.locator(".catalog-filters button").click();
    await page.waitForURL((url) => url.searchParams.get("year") === "2021");
    assert.equal(
      await page.locator(".product-card").count(),
      expected.data.products.length,
    );
    assert.ok(
      (await page.locator(".results-heading").innerText()).includes(
        String(expected.data.total),
      ),
    );
    assert.equal(new URL(page.url()).searchParams.has("vehicle"), false);
    await page.screenshot({
      path: `docs/screenshots/catalog-car-filter-${locale}-desktop.png`,
      fullPage: false,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Catalog mobile overflow",
    );
    await page.screenshot({
      path: `docs/screenshots/catalog-car-filter-${locale}-mobile.png`,
      fullPage: true,
    });
    await page.locator(".catalog-filters a").click();
    await page.waitForURL((url) => url.searchParams.get("make") === "");
    assert.equal(await page.locator("select[name=make]").inputValue(), "");
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  console.log(
    "Make/model/year filtering, dependent resets, saved-vehicle override, clear filters and Arabic/English desktop/mobile layouts passed.",
  );
} finally {
  await browser.close();
}
