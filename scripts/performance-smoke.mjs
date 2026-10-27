import { writeFileSync } from "node:fs";
const base = process.env.BASE_URL || "http://localhost:3001";
const routes = [
  "/en",
  "/ar",
  "/en/catalog",
  "/en/products/precision-oil-filter",
];
const timings = [];
for (let batch = 0; batch < 5; batch++) {
  await Promise.all(
    routes.map(async (route) => {
      const start = performance.now();
      const response = await fetch(base + route);
      await response.text();
      if (!response.ok) throw Error(`HTTP ${response.status}: ${route}`);
      timings.push(performance.now() - start);
    }),
  );
}
timings.sort((a, b) => a - b);
const result = {
  requests: timings.length,
  concurrency: 4,
  medianMs: Math.round(timings[Math.floor(timings.length / 2)]),
  p95Ms: Math.round(timings[Math.ceil(timings.length * 0.95) - 1]),
  scope:
    "Local production runtime, read-only demo catalog; no Supabase/database/network/provider load certification.",
};
writeFileSync("docs/PERFORMANCE_SMOKE.json", JSON.stringify(result, null, 2));
console.log(result);
