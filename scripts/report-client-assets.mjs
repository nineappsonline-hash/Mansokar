/**
 * Report Next.js client assets from the finished production build.
 * Measures actual emitted files (and gzip sizes), not source-code estimates.
 * Does not modify the compiled artifacts or depend on external tools.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const next = join(root, ".next");
const staticRoot = join(next, "static");
const manifestPath = join(next, "app-build-manifest.json");
if (!existsSync(staticRoot)) {
  console.error("[asset-report] Next.js static build output not found.");
  process.exitCode = 1;
} else {
  const assets = [];
  function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) scan(absolute);
      else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
        const bytes = statSync(absolute).size;
        const gzip = gzipSync(readFileSync(absolute), { level: 6 }).length;
        assets.push({
          path: absolute.slice(next.length + 1).replaceAll("\\", "/"),
          type: entry.name.endsWith(".css") ? "css" : "js",
          bytes,
          gzip,
        });
      }
    }
  }
  scan(staticRoot);
  const total = (rows) => rows.reduce((sum, a) => sum + a.gzip, 0);
  const byPath = new Map(assets.map((asset) => [asset.path, asset]));
  const pages = {};
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [route, paths] of Object.entries(manifest.pages || {})) {
      const files = [...new Set(paths)].map((path) => byPath.get(path)).filter(Boolean);
      pages[route] = {
        count: files.length,
        gzip: total(files),
        files: files.map((f) => ({ path: f.path, gzip: f.gzip, bytes: f.bytes })),
      };
    }
  }
  const report = {
    note: "Build-file sizes only; route manifests can include shared chunks. Transfer and cache behavior require browser measurement.",
    totals: {
      js: { count: assets.filter((a) => a.type === "js").length, gzip: total(assets.filter((a) => a.type === "js")) },
      css: { count: assets.filter((a) => a.type === "css").length, gzip: total(assets.filter((a) => a.type === "css")) },
    },
    pages,
    largest: assets.sort((a, b) => b.gzip - a.gzip).slice(0, 12),
  };
  writeFileSync(join(root, "client-asset-report.json"), JSON.stringify(report, null, 2));
  const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
  console.log("[asset-report] total emitted JS gzip:", kb(report.totals.js.gzip));
  console.log("[asset-report] total emitted CSS gzip:", kb(report.totals.css.gzip));
  for (const [route, row] of Object.entries(pages)) {
    console.log("[asset-report] route:", route, "manifest assets:", row.count, "gzip:", kb(row.gzip));
  }
  for (const asset of report.largest.slice(0, 8)) {
    console.log("[asset-report] top:", asset.path, "gzip:", kb(asset.gzip), "raw:", kb(asset.bytes));
  }
}
