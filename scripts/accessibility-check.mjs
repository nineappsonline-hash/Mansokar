import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const results = [];
try {
  for (const locale of ["en", "ar"])
    for (const route of [
      "",
      "/products/precision-oil-filter",
      "/catalog",
      "/checkout",
      "/request-part",
    ]) {
      await page.goto(
        (process.env.BASE_URL || "http://localhost:3000") +
          "/" +
          locale +
          route,
      );
      await page.locator("h1").waitFor();
      await page.waitForTimeout(250);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      results.push({
        route: "/" + locale + route,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
    }
  writeFileSync(
    "docs/ACCESSIBILITY_RESULTS.json",
    JSON.stringify(results, null, 2),
  );
  const failures = results.filter((r) => r.violations.length);
  console.log(
    JSON.stringify(
      failures.length ? failures : { checked: results.length, violations: 0 },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
