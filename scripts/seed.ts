import { writeFileSync } from "node:fs";
import { brands, vehicles, categories, demoProducts } from "../src/lib/catalog";
const quote = (v: unknown) =>
  v === null
    ? "null"
    : typeof v === "boolean" || typeof v === "number"
      ? String(v)
      : "'" +
        (typeof v === "object" ? JSON.stringify(v) : String(v)).replaceAll(
          "'",
          "''",
        ) +
        "'";
const sql: string[] = [
  "-- FICTIONAL DEMO DATA. Never use as a real fitment guide.",
];
function insert(table: string, rows: Record<string, unknown>[]) {
  for (const row of rows)
    sql.push(
      `insert into public.${table} (${Object.keys(row)
        .map((x) => '"' + x + '"')
        .join(
          ",",
        )}) values (${Object.values(row).map(quote).join(",")}) on conflict do nothing;`,
    );
}
insert(
  "vehicle_brands",
  brands.map((b) => ({ slug: b.slug, name: b.name })),
);
insert(
  "vehicle_models",
  brands.flatMap((b) =>
    b.models.map((m) => ({
      id: `${b.slug}-${m}`,
      brand: b.slug,
      slug: m,
      name: { en: m.toUpperCase(), ar: m.toUpperCase() },
    })),
  ),
);
insert(
  "vehicle_configs",
  vehicles.map((v) => ({
    id: v.id,
    model_id: `${v.brand}-${v.model}`,
    year: v.year,
    engine: v.engine,
  })),
);
insert("categories", categories);
insert("manufacturers", [{ name: "Demo Works" }, { name: "Sample Parts" }]);
insert("products", demoProducts);
insert(
  "product_fitments",
  ["demo-1", "demo-5"].flatMap((id) =>
    ["opel-astra-2021-0", "peugeot-301-2021-0"].map((v) => ({
      product_id: id,
      vehicle_config_id: v,
    })),
  ),
);
// No live shipping rates, enabled payment methods, or approved policies are invented.
writeFileSync("supabase/seed.sql", sql.join("\n") + "\n");
