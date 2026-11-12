// Applies the owner's brand and origin catalog defaults. Dry-run unless --apply is passed.
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
  const products: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("products")
      .select("id,manufacturer,specs")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(`Read products: ${error.code}`);
    products.push(...data);
    if (data.length < 500) break;
  }
  const changes = products
    .map((p) => {
      const manufacturer =
        !p.manufacturer?.trim() ||
        /^(?:أصلي|genuine parts)$/iu.test(p.manufacturer.trim())
          ? "GM"
          : p.manufacturer;
      const specs = {
        ...p.specs,
        country_of_origin: "أصلي",
        authenticity: "أصلي",
      };
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
    originLabels: changes.filter(
      (c) => c.before.specs?.country_of_origin !== "أصلي",
    ).length,
  };
  console.log({ mode: apply ? "apply" : "dry-run", ...result });
  if (!apply) return;

  const backupDir = join(homedir(), ".local", "state", "mopc-catalog");
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backup = join(backupDir, `brand-origin-before-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify(changes, null, 2), { mode: 0o600 });
  console.log(`Rollback snapshot: ${backup}`);
  const { error: makerError } = await db
    .from("manufacturers")
    .upsert({ name: "GM" }, { onConflict: "name" });
  if (makerError) throw new Error(`Manufacturer reference: ${makerError.code}`);

  for (let offset = 0; offset < changes.length; offset += 3) {
    await Promise.all(
      changes.slice(offset, offset + 3).map(async (c) => {
        const { data, error } = await db
          .from("products")
          .update(c.after)
          .eq("id", c.id)
          .eq("manufacturer", c.before.manufacturer)
          .eq("specs", JSON.stringify(c.before.specs))
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(`Stopped at ${c.id}: ${error?.code || "concurrent edit"}`);
      }),
    );
  }
  const verified: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("products")
      .select("id,manufacturer,specs")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(`Read-back: ${error.code}`);
    verified.push(...data);
    if (data.length < 500) break;
  }
  for (const c of changes) {
    const saved = verified.find((p) => p.id === c.id);
    if (!isDeepStrictEqual({ manufacturer: saved?.manufacturer, specs: saved?.specs }, c.after))
      throw new Error(`Read-back mismatch ${c.id}`);
  }
  await mkdir("docs/catalog", { recursive: true });
  await writeFile(
    "docs/catalog/brand-origin-result.json",
    JSON.stringify({ ...result, verified: changes.length, backup }, null, 2) + "\n",
  );
  console.log(`Verified ${changes.length} updates.`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Update failed");
  process.exitCode = 1;
});
