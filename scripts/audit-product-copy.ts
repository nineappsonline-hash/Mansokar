// Read-only audit. Only public product and vehicle fields are queried.
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import { publicProduct, publicProductSlug } from "../src/lib/public-product";
import { productCardVehicles } from "../src/lib/product-card-vehicles";
import { productSearchCopy } from "../src/lib/product-seo";
import { brands as baseBrands, type Product } from "../src/lib/catalog";
import { readApplications } from "../src/lib/product-applications";

async function main() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  async function rows(table: string, fields: string) {
    const all: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from(table)
        .select(fields)
        .order(table === "vehicle_brands" ? "slug" : "id")
        .range(offset, offset + 499);
      if (error) throw new Error(`${table}: ${error.message}`);
      all.push(...data);
      if (data.length < 500) return all;
    }
  }
  const [products, models, storedBrands] = await Promise.all([
    rows(
      "products",
      "id,sku,slug,name,description,manufacturer,category,family,type,price,sale,partNumber,partNumbers,demo,orderable,status,specs,seo,warranty",
    ),
    rows("vehicle_models", "id,brand,slug,name"),
    rows("vehicle_brands", "slug,name"),
  ]);
  const catalog = {
    models,
    brands: storedBrands.map((b) => ({
      ...b,
      ar: baseBrands.find((base) => base.slug === b.slug)?.ar || b.name,
    })),
  };
  const live = (products as Product[]).filter(
    (p) => p.status === "published" && !p.demo,
  );
  const issues: { slug: string; problem: string }[] = [];
  let checked = 0;
  for (const raw of live) {
    const slug = publicProductSlug(raw);
    const applications = readApplications(raw.specs);
    const projected = publicProduct(raw, undefined, false, catalog);
    if (!applications.length)
      issues.push({ slug, problem: "No recorded model/year applications" });
    for (const locale of ["ar", "en"] as const) {
      const cars = productCardVehicles(raw, catalog, locale);
      if (cars.length !== applications.length)
        issues.push({
          slug,
          problem: `${locale}: missing model or make mapping`,
        });
      const copy = productSearchCopy(projected, locale);
      for (const car of cars)
        for (const value of [car.name, car.years].filter(Boolean)) {
          if (
            ![
              copy.title,
              copy.description,
              projected.description[locale],
            ].every((s) => s.includes(value))
          )
            issues.push({
              slug,
              problem: `${locale}: generated copy missing ${value}`,
            });
        }
      checked++;
    }
  }
  const report = {
    capturedAt: new Date().toISOString(),
    publishedProducts: live.length,
    localizedCopiesChecked: checked,
    productsWithApplications: live.filter(
      (p) => readApplications(p.specs).length,
    ).length,
    issues,
  };
  await mkdir("docs/seo", { recursive: true });
  await writeFile(
    "docs/seo/product-vehicle-metadata-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ...report, issues: issues.slice(0, 5) }));
  if (issues.length) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Audit failed");
  process.exitCode = 1;
});
