/**
 * Summarize anonymous Web Vitals event lines exported from Vercel Runtime Logs.
 * Usage: node scripts/summarize-web-vitals.mjs field-vitals.log
 * Accepts plain text lines containing [mopc-web-vital] { ... }.
 */
import { readFileSync } from "node:fs";
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/summarize-web-vitals.mjs <vercel-runtime-log-export>");
  process.exit(2);
}
const records = [];
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const marker = "[mopc-web-vital]";
  const at = line.indexOf(marker);
  if (at < 0) continue;
  try {
    const row = JSON.parse(line.slice(at + marker.length).trim());
    if (["LCP", "INP", "CLS", "TTFB", "FCP"].includes(row.name) &&
      ["mobile", "desktop"].includes(row.device) && Number.isFinite(row.value))
      records.push(row);
  } catch { /* skip malformed log lines */ }
}
const groups = new Map();
for (const row of records) {
  const key = [row.name, row.device, row.page, row.locale].join(" / ");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row.value);
}
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
console.log("Core Web Vitals from consenting visitors — field results (p75)");
for (const [key, values] of [...groups].sort((a,b) => a[0].localeCompare(b[0]))) {
  const name = key.split(" / ")[0];
  const threshold = name === "LCP" ? 2500 : name === "INP" ? 200 : name === "CLS" ? 0.1 : null;
  const p75 = percentile(values, 0.75);
  console.log(`${key}: samples=${values.length}, p75=${p75}${threshold === null ? "" : p75 <= threshold ? " GOOD" : " NEEDS WORK"}`);
}
if (!records.length) console.log("No web-vital events found; check Vercel runtime log filter [mopc-web-vital].");
