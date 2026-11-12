// Applies the owner's explicit catalog defaults. Dry-run unless --apply is passed.
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const all: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("products")
      .select("id,manufacturer,specs,status,demo")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.code || "Unable to read products");
    all.push(...data);
    if (data.length < 500) break;
  }
  const products = all.filter((p) => !p.demo && p.status === "published");
  const changes = products
    .map((p) => {
      const specs = {
        ...p.specs,
        country_of_origin: "أصلي",
        authenticity: "أصلي",
        stock_quantity: "1000",
        stock_status: "in_stock",
      };
      const manufacturer =
        !p.manufacturer?.trim() ||
        /^genuine parts$/i.test(p.manufacturer.trim())
          ? "أصلي"
          : p.manufacturer;
      return {
        id: p.id,
        before: { manufacturer: p.manufacturer, specs: p.specs },
        after: { manufacturer, specs },
      };
    })
    .filter((c) => !isDeepStrictEqual(c.before, c.after));
  const result = {
    capturedAt: new Date().toISOString(),
    products: products.length,
    changed: changes.length,
    brandFallbacks: changes.filter(
      (c) => c.before.manufacturer !== c.after.manufacturer,
    ).length,
    stockDefaults: changes.filter(
      (c) => c.before.specs.stock_quantity !== c.after.specs.stock_quantity,
    ).length,
    originLabels: changes.filter(
      (c) =>
        c.before.specs.country_of_origin !== c.after.specs.country_of_origin,
    ).length,
  };
  console.log({ mode: apply ? "apply" : "dry-run", ...result });
  if (!apply) return;
  const backupDir = join(homedir(), ".local", "state", "mopc-catalog");
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backup = join(backupDir, `defaults-before-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify(changes, null, 2), { mode: 0o600 });
  console.log(`Rollback snapshot: ${backup}`);
  // Products.manufacturer has a foreign key to manufacturers.name.
  const { error: makerError } = await db
    .from("manufacturers")
    .upsert({ name: "أصلي" }, { onConflict: "name" });
  if (makerError) throw new Error(`Manufacturer fallback: ${makerError.code}`);
  for (let offset = 0; offset < changes.length; offset += 3) {
    await Promise.all(
      changes.slice(offset, offset + 3).map(async (c) => {
        let q = db
          .from("products")
          .update(c.after)
          .eq("id", c.id)
          .eq("status", "published")
          .eq("demo", false)
          .eq("manufacturer", c.before.manufacturer)
          .eq("specs", JSON.stringify(c.before.specs));
        const { data, error } = await q.select("id");
        if (error || data?.length !== 1)
          throw new Error(
            `Stopped at ${c.id}: ${error?.code || "concurrent edit"}`,
          );
      }),
    );
  }
  const verified: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("products")
      .select("id,manufacturer,specs,status,demo")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(`Read-back: ${error.code}`);
    verified.push(...data);
    if (data.length < 500) break;
  }
  for (const c of changes) {
    const saved = verified.find((p) => p.id === c.id);
    if (
      !isDeepStrictEqual(
        { manufacturer: saved?.manufacturer, specs: saved?.specs },
        c.after,
      )
    )
      throw new Error(`Read-back mismatch ${c.id}`);
  }
  await mkdir("docs/catalog", { recursive: true });
  await writeFile(
    "docs/catalog/defaults-result.json",
    JSON.stringify({ ...result, verified: changes.length, backup }, null, 2) +
      "\n",
  );
  console.log(`Verified ${changes.length} updates.`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Update failed");
  process.exitCode = 1;
});
