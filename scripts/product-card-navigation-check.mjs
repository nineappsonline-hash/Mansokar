import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3104";
const browser = await chromium.launch({ headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      hasTouch: mobile,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const locale of ["en", "ar"]) {
      for (const target of ["photo", "name", "price", "keyboard"]) {
        await page.goto(`${base}/${locale}/catalog`);
        const card = page.locator(".product-card").first();
        await card.waitFor();
        const href = await card
          .locator(".card-navigation-link")
          .getAttribute("href");
        if (target === "photo") await card.locator(".product-art").click();
        else if (target === "name")
          await card.locator(".card-navigation-link").click();
        else if (target === "keyboard") {
          await card.locator(".card-navigation-link").focus();
          await page.keyboard.press("Enter");
        } else {
          const price = card.locator(".product-price");
          await price.scrollIntoViewIfNeeded();
          const box = await price.boundingBox();
          if (mobile)
            await page.touchscreen.tap(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
          else
            await page.mouse.click(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
        }
        await page.waitForURL(base + href);
        await page.locator("h1").waitFor();
      }
      await page.goto(`${base}/${locale}/catalog`);
      const card = page.locator(".product-card").first();
      const add = card.locator(".purchase-add");
      await add.click();
      await card.locator(".purchase-add svg.lucide-check").waitFor();
      assert.equal(new URL(page.url()).pathname, `/${locale}/catalog`);
      await page.goto(`${base}/${locale}`);
      const offer = page.locator(".offer-card").first();
      if (await offer.count()) {
        const href = await offer
          .locator(".card-navigation-link")
          .getAttribute("href");
        const prices = offer.locator(".offer-prices");
        await prices.scrollIntoViewIfNeeded();
        const box = await prices.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForURL(base + href);
      }
    }
    await context.close();
  }
  console.log(
    "Product images, names, card body, keyboard links, independent cart buttons and offer cards passed in Arabic/English on desktop/mobile.",
  );
} finally {
  await browser.close();
}
