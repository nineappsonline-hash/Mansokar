import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
const base = process.env.BASE_URL || "http://localhost:3104";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);
const [
  { data: brands, error: brandError },
  { data: models, error: modelError },
] = await Promise.all([
  db.from("vehicle_brands").select("slug"),
  db.from("vehicle_models").select("brand,slug,name"),
]);
assert.ifError(brandError);
assert.ifError(modelError);
const targets = {
  opel: ["astra", "insignia", "grandland", "crossland"],
  mg: ["5", "6", "hs", "rx5", "zs"],
  chevrolet: ["cruze", "malibu", "captiva"],
  peugeot: ["2008", "3008"],
  citroen: ["c3", "c5"],
};
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const sitemap = await (await page.request.get(base + "/sitemap.xml")).text();
  for (const locale of ["ar", "en"])
    for (const brand of brands) {
      const saved = models.filter((m) => m.brand === brand.slug);
      await page.goto(`${base}/${locale}/brands/${brand.slug}`);
      const links = await page
        .locator(".model-card")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.model));
      assert.deepEqual(
        [...links].sort(),
        saved.map((m) => m.slug).sort(),
        `${locale}/${brand.slug}: cards must match saved models`,
      );
      for (const model of saved) {
        assert.ok(
          sitemap.includes(`/${locale}/brands/${brand.slug}/${model.slug}<`),
        );
      }
      if (saved.length) {
        const model = saved[0];
        const card = page.locator(`.model-card[data-model="${model.slug}"]`);
        const before = page.url();
        await card.getByRole("button").click();
        assert.equal(
          page.url(),
          before,
          "Opening the model must not navigate away",
        );
        assert.equal(
          await card.getByRole("button").getAttribute("aria-expanded"),
          "true",
        );
        if (saved.length > 1) {
          const other = page.locator(
            `.model-card[data-model="${saved[1].slug}"]`,
          );
          await other.getByRole("button").click();
          assert.equal(
            await card.getByRole("button").getAttribute("aria-expanded"),
            "false",
          );
          assert.equal(
            await other.getByRole("button").getAttribute("aria-expanded"),
            "true",
          );
          await card.getByRole("button").click();
          assert.equal(
            await other.getByRole("button").getAttribute("aria-expanded"),
            "false",
          );
        }
        const yearLink = card.locator("[data-model-year]").first();
        const selectedYear = (await yearLink.count())
          ? await yearLink.getAttribute("data-model-year")
          : null;
        if (selectedYear) await yearLink.click();
        else await card.locator("[data-model-browse]").click();
        await page.locator(".model-product-filters").waitFor();
        assert.equal(
          await page.locator('select[name="make"]').inputValue(),
          brand.slug,
        );
        assert.equal(
          await page.locator('select[name="model"]').inputValue(),
          model.slug,
        );
        if (selectedYear)
          assert.equal(
            await page.locator('select[name="year"]').inputValue(),
            selectedYear,
          );
        assert.ok(
          (await page.getByRole("heading", { level: 1 }).innerText())
            .toLowerCase()
            .includes(model.name[locale].toLowerCase()),
        );
        assert.ok(
          !(await page.locator("main").innerText()).includes(
            "VEHICLE CONFIGURATION",
          ),
        );
        await page.waitForFunction((expected) => {
          const link = document.head.querySelector('link[rel="canonical"]');
          return link && new URL(link.href).pathname === expected;
        }, `/${locale}/brands/${brand.slug}/${model.slug}`);
        assert.equal(
          new URL(
            await page
              .locator('head link[rel="canonical"]')
              .getAttribute("href"),
          ).pathname,
          `/${locale}/brands/${brand.slug}/${model.slug}`,
        );
        const cards = page.locator(".product-card");
        if (await cards.count())
          assert.ok(
            (await cards.first().innerText())
              .toLowerCase()
              .includes(model.name[locale].toLowerCase()),
          );
        // Existing direct links must also open products after a hard reload.
        await page.reload();
        await page.locator(".model-product-filters").waitFor();
        if (brand.slug === "opel") {
          await page.locator(".model-product-filters > summary").click();
          await page.locator('select[name="year"]').selectOption("2015");
          await page.locator(".catalog-filters button").click();
          await page.waitForURL(`**/${locale}/catalog?**`);
          assert.equal(
            new URL(page.url()).searchParams.get("make"),
            brand.slug,
          );
          assert.equal(
            new URL(page.url()).searchParams.get("model"),
            model.slug,
          );
          assert.equal(new URL(page.url()).searchParams.get("year"), "2015");
        }
      }
      const removed = (targets[brand.slug] || []).filter(
        (slug) => !saved.some((m) => m.slug === slug),
      );
      for (const slug of removed) {
        assert.ok(
          !sitemap.includes(`/${locale}/brands/${brand.slug}/${slug}<`),
        );
        await page.goto(`${base}/${locale}/brands/${brand.slug}/${slug}`);
        await page.getByRole("heading", { name: "404", exact: true }).waitFor();
      }
    }
  console.log(
    `Arabic/English model cards match saved records for ${brands.length} makes; model cards expand in place and year selection opens filtered products, with old model links still supported; removed model URLs return not-found and stay out of the sitemap.`,
  );
} finally {
  await browser.close();
}
