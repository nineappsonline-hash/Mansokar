/**
 * Measure actual first-view requests in Chromium, route-by-route.
 * Read-only: does not submit a cart, checkout, login, or payment form.
 *
 * Setup: npx playwright install chromium
 * Run:   npm run perf:routes
 *        PERF_BASE_URL=https://mopc.store PERF_PRODUCT_URL=/ar/products/example npm run perf:routes
 *        npm run perf:routes -- --desktop
 *
 * This is a browser network audit, NOT a simulated PageSpeed score.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const base = process.env.PERF_BASE_URL || "https://mopc.store";
const root = new URL(base);
if (!["https:", "http:"].includes(root.protocol)) throw Error("Expected an HTTP(S) site");
const locale = process.env.PERF_LOCALE === "en" ? "en" : "ar";
const desktop = process.argv.includes("--desktop");
const viewport = desktop
  ? { width: 1365, height: 900 }
  : { width: 390, height: 844 };
const output = process.env.PERF_REPORT_PATH || "reports/browser-network.json";
const makeUrl = (path) => new URL(path, root).toString();
const pathFor = (path) => `/${locale}${path}`;
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  async function audit(label, path) {
    // A fresh browser context prevents cached assets from one route
    // distorting the next route's cold first-view network measurements.
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: desktop ? 1 : 2,
      isMobile: !desktop,
      hasTouch: !desktop,
      serviceWorkers: "block",
      locale: locale === "ar" ? "ar-EG" : "en-US",
    });
    const page = await context.newPage();
    const failures = [];
    const cdp = await context.newCDPSession(page);
    const requestInfo = new Map();
    const entries = [];

    await cdp.send("Network.enable");
    cdp.on("Network.responseReceived", ({ requestId, response, type }) => {
      requestInfo.set(requestId, {
        url: response.url,
        type,
        status: response.status,
        mime: response.mimeType,
        servedFromDiskCache: Boolean(response.fromDiskCache),
      });
    });
    cdp.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      const item = requestInfo.get(requestId);
      if (item) entries.push({ ...item, encodedBytes: encodedDataLength });
    });
    cdp.on("Network.loadingFailed", ({ requestId, errorText }) => {
      const item = requestInfo.get(requestId);
      if (item) failures.push(`${item.url}: ${errorText}`);
    });
    page.on("pageerror", (error) => failures.push(`JavaScript: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400)
        failures.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await page.addInitScript(() => {
      window.__mopcMetrics = { lcp: null, cls: 0, longTasks: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.__mopcMetrics.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput)
              window.__mopcMetrics.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.__mopcMetrics.longTasks += entry.duration;
        }).observe({ type: "longtask", buffered: true });
      } catch {}
    });

    const started = Date.now();
    let response = null;
    try {
      response = await page.goto(makeUrl(path), {
        waitUntil: "domcontentloaded",
        timeout: 35000,
      });
      // Capture scripts/fonts/images needed shortly after first paint,
      // without scrolling or activating lazy below-the-fold sections.
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await wait(1800);
    } catch (error) {
      failures.push(`Navigation: ${String(error)}`);
    }

    const observed = await page.evaluate(() => {
      const metrics = window.__mopcMetrics ?? {};
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        lcpMs: metrics.lcp,
        cls: metrics.cls,
        longTaskMs: metrics.longTasks,
        domContentLoadedMs: nav?.domContentLoadedEventEnd || null,
      };
    }).catch(() => ({}));

    const sameOrigin = entries.filter((item) => {
      try { return new URL(item.url).origin === root.origin; }
      catch { return false; }
    });
    const unique = [...new Map(sameOrigin.map((item) => [item.url, item])).values()];
    const group = (suffix) => unique.filter((item) => new URL(item.url).pathname.includes("/_next/static/") && new URL(item.url).pathname.endsWith(suffix));
    const assets = {
      js: group(".js"),
      css: group(".css"),
      image: unique.filter((x) => x.type === "Image"),
      font: unique.filter((x) => x.type === "Font"),
    };
    const sum = (arr) => arr.reduce((n, e) => n + (e.encodedBytes || 0), 0);
    const summary = {
      label,
      url: page.url(),
      status: response?.status() || null,
      viewport,
      elapsedMs: Date.now() - started,
      ...observed,
      bytes: {
        js: sum(assets.js),
        css: sum(assets.css),
        image: sum(assets.image),
        font: sum(assets.font),
        allSameOrigin: sum(unique),
      },
      counts: {
        js: assets.js.length,
        css: assets.css.length,
        image: assets.image.length,
        font: assets.font.length,
      },
      heaviestScripts: [...assets.js].sort((a,b) => b.encodedBytes-a.encodedBytes).slice(0, 8),
      cssFiles: assets.css,
      failures: [...new Set(failures)].slice(0, 30),
    };
    results.push(summary);
    console.log(`[browser-perf] ${label}: HTTP ${summary.status}, JS ${(summary.bytes.js/1024).toFixed(1)} KB, CSS ${(summary.bytes.css/1024).toFixed(1)} KB, LCP ${summary.lcpMs?.toFixed(0) ?? "n/a"} ms, errors ${summary.failures.length}`);
    const links = await page.locator(`a[href*="/${locale}/products/"]`).evaluateAll((elements) =>
      elements.map((item) => item.getAttribute("href")).filter(Boolean)
    ).catch(() => []);
    await context.close();
    return links[0] || null;
  }

  const homeProduct = await audit("home", pathFor(""));
  const catalogProduct = await audit("catalog", pathFor("/catalog"));
  const product = process.env.PERF_PRODUCT_URL || catalogProduct || homeProduct;
  if (product) await audit("product", product);
  else console.warn("[browser-perf] No publicly linked product detected. Set PERF_PRODUCT_URL to test one.");
  await audit("checkout-view-only", pathFor("/checkout"));
} finally {
  await browser.close();
}
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, JSON.stringify({
  note: "Cold-context Chromium first-view request transfer totals. Does not equate to PageSpeed mobile lab score. Network variability, cache policy, bot protection, and Chrome/browser versions affect measurements.",
  measuredAt: new Date().toISOString(),
  base: root.origin,
  results,
}, null, 2));
console.log("[browser-perf] Wrote", output);

const critical = results.filter((row) =>
  ["home", "catalog"].includes(row.label) &&
  (row.status !== 200 || row.failures.some((f) => f.startsWith("Navigation:")))
);
if (critical.length) {
  console.error("[browser-perf] Critical pages did not load:", critical.map((r) => r.label + ": " + r.status).join(", "));
  process.exitCode = 1;
}
