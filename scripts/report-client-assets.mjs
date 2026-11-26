/**
 * Measure emitted JS/CSS files and route-associated chunks in a Next build.
 * RSC manifests list potentially referenced chunks, not necessarily the
 * network requests on the first page view. Never confuse these with Lighthouse.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { runInNewContext } from "node:vm";

const root = process.cwd();
const next = join(root, ".next");
const staticRoot = join(next, "static");
const manifestPath = join(next, "app-build-manifest.json");
const appServer = join(next, "server", "app");
const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
const walk = (dir, visit) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, visit);
    else if (entry.isFile()) visit(file);
  }
};
const normalize = (path) =>
  String(path).replace(/^\/_next\//, "").replace(/^_next\//, "").replace(/^\//, "");
if (!existsSync(staticRoot)) {
  console.error("[asset-report] Next.js static build output not found.");
  process.exitCode = 1;
} else {
  const assets = [];
  walk(staticRoot, (absolute) => {
    if (!/\.(js|css)$/.test(absolute)) return;
    const bytes = statSync(absolute).size;
    const gzip = gzipSync(readFileSync(absolute), { level: 6 }).length;
    assets.push({
      path: absolute.slice(next.length + 1).replaceAll("\\", "/"),
      type: absolute.endsWith(".css") ? "css" : "js",
      bytes,
      gzip,
    });
  });
  const total = (rows) => rows.reduce((sum, a) => sum + a.gzip, 0);
  const byPath = new Map(assets.map((asset) => [asset.path, asset]));
  const pages = {};
  const manifestSources = [];

  function record(route, paths, source) {
    const unique = [...new Set(paths.map(normalize))];
    const files = unique.map((path) => byPath.get(path)).filter(Boolean);
    const missing = unique.filter((path) => !byPath.has(path));
    // Only include files actually emitted by the build. Some references are
    // runtime/inlined identifiers and cannot be counted as static downloads.
    if (!files.length) return;
    const current = pages[route];
    const combined = current
      ? [...new Map([...current.files, ...files].map((file) => [file.path, file])).values()]
      : files;
    pages[route] = {
      source,
      count: combined.length,
      gzip: total(combined),
      jsGzip: total(combined.filter((file) => file.type === "js")),
      cssGzip: total(combined.filter((file) => file.type === "css")),
      missingReferences: missing.length,
      files: combined,
    };
  }

  // Older/webpack App Router builds may expose a consolidated manifest.
  if (existsSync(manifestPath)) {
    manifestSources.push("app-build-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [route, paths] of Object.entries(manifest.pages || {})) {
      record(route, paths, "app-build-manifest");
    }
  }

  // Next 16 also writes per-page client reference manifests beneath server/app.
  // Extract route-scoped module chunk references without importing any app code.
  let referenceCount = 0;
  let inspectedExample = false;
  walk(appServer, (file) => {
    if (!file.endsWith("_client-reference-manifest.js")) return;
    referenceCount++;
    try {
      const context = { __RSC_MANIFEST: {} };
      runInNewContext(readFileSync(file, "utf8"), { globalThis: context }, { timeout: 500 });
      for (const [route, manifest] of Object.entries(context.__RSC_MANIFEST || {})) {
        if (!inspectedExample && route.includes("[locale]")) {
          const modules = Object.values(manifest.clientModules || {});
          console.log("[asset-report] sample manifest:", route, "keys:", Object.keys(manifest).join(","), "modules:", modules.length, "sample chunks:", JSON.stringify(modules.slice(0, 2).map((m) => m.chunks)).slice(0, 900));
          inspectedExample = true;
        }
        const paths = [];
        for (const mod of Object.values(manifest.clientModules || {})) {
          for (const chunk of mod.chunks || []) {
            if (typeof chunk === "string" && /\.(js|css)$/.test(chunk))
              paths.push(chunk);
          }
        }
        for (const list of Object.values(manifest.entryCSSFiles || {})) {
          for (const css of Array.isArray(list) ? list : []) {
            const path = typeof css === "string" ? css : css?.path;
            if (typeof path === "string" && path.endsWith(".css"))
              paths.push(path);
          }
        }
        record(route, paths, "client-reference-manifest (potential, not first-view network)");
      }
    } catch (error) {
      console.warn("[asset-report] Could not parse:", file.slice(next.length + 1), String(error).slice(0, 120));
    }
  });
  manifestSources.push(referenceCount + " client-reference manifest files");

  const report = {
    note: "Route sizes represent build-referenced assets (including chunks loaded later), NOT first-view downloads. Compare actual first-view requests with browser network or Lighthouse. Files are shared between routes and must not be summed.",
    manifestSources,
    totals: {
      js: { count: assets.filter((a) => a.type === "js").length, gzip: total(assets.filter((a) => a.type === "js")) },
      css: { count: assets.filter((a) => a.type === "css").length, gzip: total(assets.filter((a) => a.type === "css")) },
    },
    pages,
    largest: assets.sort((a, b) => b.gzip - a.gzip).slice(0, 12),
  };
  writeFileSync(join(root, "client-asset-report.json"), JSON.stringify(report, null, 2));
  console.log("[asset-report] total emitted JS gzip:", kb(report.totals.js.gzip));
  console.log("[asset-report] total emitted CSS gzip:", kb(report.totals.css.gzip));
  console.log("[asset-report] manifest sources:", manifestSources.join(", "));
  for (const [route, row] of Object.entries(pages)) {
    console.log("[asset-report] route:", route, "referenced:", row.count, "js:", kb(row.jsGzip), "css:", kb(row.cssGzip));
  }
  if (!Object.keys(pages).length)
    console.warn("[asset-report] No route associations found; totals must not be reported as first-view loads.");
  for (const asset of report.largest.slice(0, 8)) {
    console.log("[asset-report] top:", asset.path, "gzip:", kb(asset.gzip), "raw:", kb(asset.bytes));
  }
}
