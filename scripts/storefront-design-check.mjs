import { chromium } from "playwright";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.BASE_URL || "http://localhost:3104";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  for (const locale of ["en", "ar"]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/${locale}`);
    await page.locator("h1").waitFor();
    const accessibility = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    assert.equal(
      accessibility.violations.length,
      0,
      `${locale} homepage color contrast`,
    );
    if (accessibility.violations.length)
      console.log(
        JSON.stringify({
          locale,
          contrast: accessibility.violations
            .flatMap((v) =>
              v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            )
            .slice(0, 12),
        }),
      );
    assert.equal(await page.locator(".brand-card").count(), 5);
    for (const img of await page.locator(".brand-card img").all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((el) => el.decode());
    }
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await page
        .locator("h1")
        .evaluate(
          (el) => getComputedStyle(el.closest("[data-motion-reveal]")).opacity,
        ),
      "1",
      "Hero text must remain visible with reduced motion",
    );
    await page.screenshot({
      path: `docs/screenshots/premium-home-${locale}-desktop.png`,
      fullPage: false,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${locale} homepage mobile overflow`,
    );
    await page.screenshot({
      path: `docs/screenshots/premium-home-${locale}-mobile.png`,
      fullPage: true,
    });
    await page.goto(`${base}/${locale}/products/precision-oil-filter`);
    await page.locator("h1").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${locale} product mobile overflow`,
    );
    assert.ok(
      (await page
        .getByRole("button", {
          name: locale === "ar" ? "أضف للسلة" : "Add to cart",
          exact: true,
        })
        .count()) >= 1,
    );
    await page.screenshot({
      path: `docs/screenshots/premium-product-${locale}-mobile.png`,
      fullPage: true,
    });
    for (const path of ["catalog", "brands/chevrolet", "guides", "contact"]) {
      await page.goto(`${base}/${locale}/${path}`);
      await page.locator("h1").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${locale}/${path} overflow`,
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "Arabic/English desktop and mobile storefront, five brand photos, product actions and supporting pages passed.",
  );
} finally {
  await browser.close();
}
