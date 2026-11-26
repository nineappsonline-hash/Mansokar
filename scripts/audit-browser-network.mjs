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
        domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
        // Navigation timing excludes the artificial networkidle/1800ms audit wait.
        ttfbMs: nav ? Math.max(0, nav.responseStart - nav.requestStart) : null,
        responseStartMs: nav?.responseStart ?? null,
        fcpMs: performance.getEntriesByType("paint")
          .find((entry) => entry.name === "first-contentful-paint")?.startTime ?? null,
      };
    }).catch(() => ({}));

    const sameOrigin = entries.filter((item) => {
      try { return new URL(item.url).origin === root.origin; }
      catch { return false; }
    });
    const unique = [...new Map(sameOrigin.map((item) => [item.url, item])).values()];
    const group = (suffix) => unique.filter((item) => new URL(item.url).pathname.includes("/_next/static/") && new URL(item.url).pathname.endsWith(suffix));
    // Site-origin counts help isolate the MOPC app, but product photography
    // often arrives directly from an external image CDN. Capture those bytes
    // too, otherwise the mobile image budget appears artificially small.
    const allRequests = [...new Map(entries.map((item) => [item.url, item])).values()];
    const allImages = allRequests.filter((item) => item.type === "Image");
    const allFonts = allRequests.filter((item) => item.type === "Font");
    const assets = {
      js: group(".js"),
      css: group(".css"),
      image: unique.filter((x) => x.type === "Image"),
      font: unique.filter((x) => x.type === "Font"),
    };
    const sum = (arr) => arr.reduce((n, e) => n + (e.encodedBytes || 0), 0);
    const heavy = (arr) => [...arr]
      .sort((a, b) => (b.encodedBytes || 0) - (a.encodedBytes || 0))
      .slice(0, 8);
    const summary = {
      label,
      url: page.url(),
      status: response?.status() || null,
      documentCache: response ? {
        vercel: response.headers()["x-vercel-cache"] || null,
        cdn: response.headers()["x-cache"] || null,
        cacheControl: response.headers()["cache-control"] || null,
        age: response.headers()["age"] || null,
      } : null,
      viewport,
      elapsedMs: Date.now() - started,
      ...observed,
      bytes: {
        js: sum(assets.js),
        css: sum(assets.css),
        image: sum(assets.image),
        font: sum(assets.font),
        allSameOrigin: sum(unique),
        // Includes external image hosts and Next image optimization responses.
        imageAllOrigins: sum(allImages),
        fontAllOrigins: sum(allFonts),
        allOrigins: sum(allRequests),
      },
      counts: {
        js: assets.js.length,
        css: assets.css.length,
        image: assets.image.length,
        imageAllOrigins: allImages.length,
        font: assets.font.length,
        allOrigins: allRequests.length,
      },
      heaviestScripts: heavy(assets.js),
      heaviestImages: heavy(allImages),
      // The critical product image may be a remote URL, not /product-media.
      heaviestRequests: heavy(allRequests),
      cssFiles: assets.css,
      failures: [...new Set(failures)].slice(0, 30),
    };
    results.push(summary);
    console.log(`[browser-perf] ${label}: HTTP ${summary.status}, JS ${(summary.bytes.js/1024).toFixed(1)} KB, CSS ${(summary.bytes.css/1024).toFixed(1)} KB, all-origin images ${(summary.bytes.imageAllOrigins/1024).toFixed(1)} KB, TTFB ${summary.ttfbMs?.toFixed(0) ?? "n/a"} ms, FCP ${summary.fcpMs?.toFixed(0) ?? "n/a"} ms, LCP ${summary.lcpMs?.toFixed(0) ?? "n/a"} ms, errors ${summary.failures.length}`);
    const links = await page.locator(`a[href*="/${locale}/products/"]`).evaluateAll((elements) =>
      elements.map((item) => item.getAttribute("href")).filter(Boolean)
    ).catch(() => []);
    await context.close();
    return links[0] || null;
  }

  // Sample canonical storefront pages from XML rather than one card.
  async function sitemapPaths(path, kind) {
    try {
      const response = await fetch(makeUrl(path), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error("HTTP " + response.status);
      const xml = await response.text();
      const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)]
        .map((m) => m[1].replaceAll("&amp;", "&"))
        .map((value) => { try { return new URL(value); } catch { return null; } })
        .filter((url) => url?.origin === root.origin);
      const pattern = kind === "model"
        ? new RegExp("^/" + locale + "/brands/[^/]+/[^/]+/?$")
        : new RegExp("^/" + locale + "/products/[^/]+/?$");
      return [...new Set(urls.filter((url) => pattern.test(url.pathname)).map((url) => url.pathname))];
    } catch (error) {
      console.warn("[browser-perf] Sitemap unavailable: " + path + ": " + String(error));
      return [];
    }
  }
  const modelPaths = await sitemapPaths("/sitemaps/vehicles.xml", "model");
  const productPaths = await sitemapPaths("/sitemaps/products.xml", "product");
  const homeProduct = await audit("home", pathFor(""));
  const catalogProduct = await audit("catalog", pathFor("/catalog"));
  const product = process.env.PERF_PRODUCT_URL || catalogProduct || homeProduct;
  if (product) await audit("product", product);
  else console.warn("[browser-perf] No publicly linked product detected. Set PERF_PRODUCT_URL to test one.");
  const spread = (items, count) => [...new Set(Array.from(
    { length: Math.min(items.length, count) },
    (_, i) => items[Math.floor(i * (items.length - 1) / Math.max(1, Math.min(items.length, count) - 1))]
  ))];
  for (const [i, path] of spread(modelPaths, 3).entries())
    await audit("model-" + (i + 1), path);
  for (const [i, path] of spread(productPaths.filter(
    (path) => !product || new URL(product, root).pathname !== path
  ), 3).entries())
    await audit("product-sample-" + (i + 1), path);
  await audit("checkout-view-only", pathFor("/checkout"));
} finally {
  await browser.close();
}
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, JSON.stringify({
  note: "Cold-context Chromium first-view request transfer totals, including third-party product images. TTFB is browser navigation responseStart minus requestStart; FCP/LCP/CLS are lab observations, not field Core Web Vitals. INP is not measured without real user interaction. Network variability, cache policy, bot protection, and Chromium versions affect measurements.",
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
