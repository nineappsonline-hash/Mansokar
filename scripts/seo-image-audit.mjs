// Read-only bounded image check. Set IMAGE_AUDIT_LIMIT=0 for the complete saved catalog.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await db
  .from("product_images")
  .select("id,product_id,path")
  .order("id")
  .limit(10000);
if (error) throw Error(error.message);
const limit = Number(process.env.IMAGE_AUDIT_LIMIT ?? 20);
const images = limit ? data.slice(0, limit) : data;
const base = process.env.BASE_URL || "http://127.0.0.1:3115";
const results = [];
for (let n = 0; n < images.length; n += 4)
  await Promise.all(
    images.slice(n, n + 4).map(async (image) => {
      const route = image.path.startsWith("https://")
        ? image.path
        : base + "/product-media/" + image.id;
      try {
        const r = await fetch(route, {
          method: "HEAD",
          signal: AbortSignal.timeout(20000),
        });
        results.push({
          productId: image.product_id,
          mediaId: image.id,
          status: r.status,
          type: r.headers.get("content-type"),
          valid: r.ok && !!r.headers.get("content-type")?.startsWith("image/"),
        });
      } catch {
        results.push({
          productId: image.product_id,
          mediaId: image.id,
          status: "network_error",
          valid: false,
        });
      }
    }),
  );
// Some image hosts reject HEAD. Retry failures with a bounded GET and cancel the body.
for (const row of results.filter((r) => !r.valid)) {
  const image = images.find((i) => i.id === row.mediaId);
  const route = image.path.startsWith("https://")
    ? image.path
    : base + "/product-media/" + image.id;
  try {
    const r = await fetch(route, {
      headers: { Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(15000),
    });
    row.retryStatus = r.status;
    row.valid = r.ok && !!r.headers.get("content-type")?.startsWith("image/");
    await r.body?.cancel();
  } catch {
    row.retryStatus = "network_error";
  }
}
const result = {
  checkedAt: new Date().toISOString(),
  totalRecords: data.length,
  checked: results.length,
  scope: limit
    ? "Bounded sample, not a complete image certification"
    : "Full saved image catalog",
  failures: results.filter((r) => !r.valid),
  results,
};
writeFileSync(
  "docs/seo/image-validation.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log({
  total: result.totalRecords,
  checked: result.checked,
  failures: result.failures.length,
});
