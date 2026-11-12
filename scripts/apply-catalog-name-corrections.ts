// Guarded owner-requested copy corrections. Dry run by default; --apply writes.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { publicProduct, publicProductSlug } from "../src/lib/public-product";
import { readApplications } from "../src/lib/product-applications";
import { brands as baseBrands, type Product } from "../src/lib/catalog";
const removedPart = "OP-55570704";
async function main() {
  const apply = process.argv.includes("--apply");
  const names: Record<string, { ar: string; en: string }> = JSON.parse(
    await readFile("scripts/data/catalog-name-corrections.json", "utf8"),
  );
  const parts = [...Object.keys(names), removedPart];
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const [
    { data, error },
    { data: models, error: modelsError },
    { data: storedBrands, error: brandsError },
  ] = await Promise.all([
    db
      .from("products")
      .select(
        "id,sku,slug,name,description,manufacturer,category,family,type,price,sale,partNumber,partNumbers,demo,orderable,status,specs,seo,warranty,condition",
      )
      .in("partNumber", parts),
    db.from("vehicle_models").select("id,brand,slug,name"),
    db.from("vehicle_brands").select("slug,name"),
  ]);
  if (error || modelsError || brandsError)
    throw new Error(
      error?.code || modelsError?.code || brandsError?.code || "Read failed",
    );
  if (
    data!.length !== parts.length ||
    new Set(data!.map((p) => p.partNumber)).size !== parts.length
  )
    throw new Error("Part numbers are not unique or complete");
  const catalog = {
    models: models!,
    brands: storedBrands!.map((b) => ({
      ...b,
      ar: baseBrands.find((x) => x.slug === b.slug)?.ar || b.name,
    })),
  };
  type Change = {
    partNumber: string;
    id: string;
    canonical: string;
    before: Record<string, any>;
    after: Record<string, any>;
  };
  const changes: Change[] = (data! as Product[]).flatMap((p): Change[] => {
    if (p.partNumber === removedPart) {
      return p.status === "published"
        ? [
            {
              partNumber: p.partNumber,
              id: p.id,
              canonical: `/ar/products/${publicProductSlug(p)}`,
              before: {
                status: p.status,
                orderable: p.orderable,
                name: p.name,
              },
              after: { status: "draft", orderable: false },
            },
          ]
        : [];
    }
    if (p.status !== "published" || p.demo)
      throw new Error(`Unexpected state for ${p.partNumber}`);
    const target = names[p.partNumber];
    if (isDeepStrictEqual(p.name, target)) return [];
    const next = structuredClone(p);
    next.name = target;
    next.specs.public_slug = publicProductSlug(p);
    if (!p.seo?.manual) {
      const projected = publicProduct(next, undefined, false, catalog);
      next.description = projected.description;
      next.seo = { ...p.seo, ...projected.seo };
    }
    const before = {
      name: p.name,
      description: p.description,
      seo: p.seo,
      specs: p.specs,
    };
    const after = {
      name: next.name,
      description: next.description,
      seo: next.seo,
      specs: next.specs,
    };
    return [
      {
        partNumber: p.partNumber,
        id: p.id,
        canonical: `/ar/products/${publicProductSlug(p)}`,
        before,
        after,
      },
    ];
  });
  const summary = {
    capturedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    corrected: changes.filter((c) => c.partNumber !== removedPart).length,
    unpublished: changes.filter((c) => c.partNumber === removedPart).length,
  };
  console.log(summary);
  if (!apply) return;
  const backupDir = join(homedir(), ".local", "state", "mopc-catalog");
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backup = join(backupDir, `name-corrections-before-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify(changes, null, 2), { mode: 0o600 });
  console.log(`Rollback snapshot: ${backup}`);
  for (const c of changes) {
    let query = db
      .from("products")
      .update(c.after)
      .eq("id", c.id)
      .eq("partNumber", c.partNumber);
    for (const [key, value] of Object.entries(c.before))
      query =
        value == null
          ? query.is(key, null)
          : query.eq(
              key,
              typeof value === "object" ? JSON.stringify(value) : value,
            );
    const { data: saved, error: updateError } = await query.select("id");
    if (updateError || saved?.length !== 1)
      throw new Error(
        `Stopped at ${c.partNumber}: ${updateError?.code || "concurrent edit"}`,
      );
  }
  const { data: fresh, error: verifyError } = await db
    .from("products")
    .select(
      "id,slug,name,description,seo,specs,status,orderable,partNumber,manufacturer",
    )
    .in("partNumber", parts);
  if (verifyError) throw new Error(`Read-back: ${verifyError.code}`);
  for (const c of changes) {
    const row = fresh!.find((p) => p.id === c.id)!;
    for (const [key, value] of Object.entries(c.after))
      if (!isDeepStrictEqual(row[key as keyof typeof row], value))
        throw new Error(`Read-back mismatch: ${c.partNumber}/${key}`);
    const old = data!.find((p) => p.id === c.id)!;
    if (
      row.slug !== old.slug ||
      publicProductSlug(row as Product) !== c.canonical.slice(13) ||
      !isDeepStrictEqual(
        readApplications(row.specs),
        readApplications(old.specs),
      )
    )
      throw new Error(`URL or fitment changed: ${c.partNumber}`);
  }
  await mkdir("docs/catalog", { recursive: true });
  await writeFile(
    "docs/catalog/name-corrections-result.json",
    JSON.stringify(
      {
        ...summary,
        verified: changes.length,
        backup,
        changes: changes.map((c) => ({
          partNumber: c.partNumber,
          before: c.before.name,
          after: c.after.name,
          status: c.after.status || "published",
          canonical: c.canonical,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Verified ${changes.length} changes.`);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Update failed");
  process.exitCode = 1;
});
