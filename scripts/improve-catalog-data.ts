// Reviewed copy corrections only. Dry run by default; --apply writes guarded updates.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { publicProduct, publicProductSlug } from "../src/lib/public-product";
import { csvReport } from "../src/lib/seo-health";
import { countryOfOrigin } from "../src/lib/product-specifications";
import { translatedProduct, productQualityIssues } from "../src/lib/seo-policy";
import { readApplications } from "../src/lib/product-applications";
import { brands as baseBrands, type Product } from "../src/lib/catalog";
async function main() {
  const apply = process.argv.includes("--apply");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const dictionary: Record<string, string> = JSON.parse(
    await readFile("scripts/data/catalog-english-names.json", "utf8"),
  );
  const corrections = new Set([
    "تيش ميزان شمال",
    "تيش ميزان يمين",
    "غطاء قربة مياه",
    "قاعدة محرك شمال أوتوماتيك",
    "غطاء تاكيهات  Z16XER",
  ]);
  async function rows(table: string, fields: string) {
    const result: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from(table)
        .select(fields)
        .order(table === "vehicle_brands" ? "slug" : "id")
        .range(offset, offset + 499);
      if (error) throw new Error(`${table}: ${error.message}`);
      result.push(...data);
      if (data.length < 500) return result;
    }
  }
  const fields =
    "id,slug,sku,name,description,manufacturer,partNumber,partNumbers,category,family,type,price,sale,specs,seo,status,demo,orderable,warranty,condition";
  const [all, models, brands, images] = await Promise.all([
    rows("products", fields),
    rows("vehicle_models", "id,brand,slug,name"),
    rows("vehicle_brands", "slug,name"),
    rows("product_images", "id,product_id"),
  ]);
  const products = (all as Product[]).filter(
    (p) => p.status === "published" && !p.demo,
  );
  const carCatalog = {
    models,
    brands: brands.map((b) => ({
      ...b,
      ar: baseBrands.find((x) => x.slug === b.slug)?.ar || b.name,
    })),
  };
  const changes: {
    id: string;
    partNumber: string;
    nameAr: string;
    slug: string;
    before: Record<string, any>;
    after: Record<string, any>;
  }[] = [];
  for (const p of products) {
    const next = structuredClone(p);
    const translation = dictionary[p.name.ar];
    if (
      translation &&
      (!translatedProduct(p, "en") || corrections.has(p.name.ar))
    )
      next.name.en = translation;
    if (
      p.specs.country_of_origin &&
      !countryOfOrigin(p.specs.country_of_origin)
    )
      delete next.specs.country_of_origin;
    // Freeze the existing canonical URL before any translated name changes its fallback slug.
    if (next.name.en !== p.name.en) {
      next.specs.public_slug = publicProductSlug(p);
      if (!p.seo?.manual) {
        const projected = publicProduct(next, undefined, false, carCatalog);
        next.description = projected.description;
        next.seo = { ...p.seo, ...projected.seo };
      }
    }
    const before: Record<string, any> = {},
      after: Record<string, any> = {};
    for (const field of ["name", "description", "seo", "specs"] as const)
      if (!isDeepStrictEqual(p[field], next[field])) {
        before[field] = p[field];
        after[field] = next[field];
      }
    if (Object.keys(after).length)
      changes.push({
        id: p.id,
        partNumber: p.partNumber,
        nameAr: p.name.ar,
        slug: publicProductSlug(p),
        before,
        after,
      });
  }
  await mkdir("docs/catalog", { recursive: true });
  const summary = {
    products: products.length,
    changedProducts: changes.length,
    translatedNames: changes.filter((c) => c.after.name).length,
    cleanedOrigins: changes.filter(
      (c) =>
        c.before.specs?.country_of_origin && !c.after.specs?.country_of_origin,
    ).length,
  };
  await writeFile(
    "docs/catalog/improvement-plan.json",
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        ...summary,
        changes: changes.map((c) => ({
          id: c.id,
          partNumber: c.partNumber,
          nameAr: c.nameAr,
          canonical: `https://mopc.store/ar/products/${c.slug}`,
          fields: Object.keys(c.after),
          oldEnglishName: c.before.name?.en,
          newEnglishName: c.after.name?.en,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ mode: apply ? "apply" : "dry-run", ...summary });
  if (apply && changes.length) {
    const backupDir = join(homedir(), ".local", "state", "mopc-catalog");
    const backup = join(backupDir, `backup-${Date.now()}.json`);
    await mkdir(backupDir, { recursive: true, mode: 0o700 });
    await writeFile(backup, JSON.stringify(changes, null, 2), { mode: 0o600 });
    console.log(`Rollback snapshot: ${backup}`);
    for (let offset = 0; offset < changes.length; offset += 3) {
      await Promise.all(
        changes.slice(offset, offset + 3).map(async (c) => {
          let query = db
            .from("products")
            .update(c.after)
            .eq("id", c.id)
            .eq("status", "published")
            .eq("demo", false);
          // Compare every field being changed: stop rather than overwrite concurrent admin edits.
          for (const [field, value] of Object.entries(c.before))
            query =
              value == null
                ? query.is(field, null)
                : query.eq(field, JSON.stringify(value));
          const { data, error } = await query.select("id");
          if (error || data?.length !== 1)
            throw new Error(
              `Update stopped at ${c.id}: ${error?.code || (error ? "database/network error; check saved state before resuming" : "concurrent change")}`,
            );
        }),
      );
    }
    const fresh = (await rows("products", fields)) as Product[];
    for (const c of changes) {
      const row = fresh.find((p) => p.id === c.id)!;
      for (const [key, value] of Object.entries(c.after))
        if (!isDeepStrictEqual(row[key as keyof Product], value))
          throw new Error(`Read-back mismatch: ${c.id}/${key}`);
      const old = products.find((p) => p.id === c.id)!;
      for (const key of [
        "price",
        "sale",
        "partNumber",
        "manufacturer",
        "slug",
        "status",
        "orderable",
      ] as const)
        if (!isDeepStrictEqual(row[key], old[key]))
          throw new Error(`Protected field changed: ${c.id}/${key}`);
      if (
        publicProductSlug(row) !== c.slug ||
        !isDeepStrictEqual(
          readApplications(row.specs),
          readApplications(old.specs),
        )
      )
        throw new Error(`URL or compatibility changed: ${c.id}`);
    }
    await writeFile(
      "docs/catalog/improvement-result.json",
      JSON.stringify(
        {
          appliedAt: new Date().toISOString(),
          ...summary,
          verifiedReadBack: changes.length,
          preserved: [
            "canonical URLs",
            "prices",
            "part numbers",
            "manufacturer",
            "vehicle applications",
            "orderability",
            "manual SEO overrides",
          ],
        },
        null,
        2,
      ) + "\n",
    );
  }
  const current = apply
    ? ((await rows("products", fields)) as Product[]).filter(
        (p) => p.status === "published" && !p.demo,
      )
    : products;
  const followUp = current
    .map((p) => ({
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      canonical: `https://mopc.store/ar/products/${publicProductSlug(p)}`,
      issues: [
        ...productQualityIssues(
          p,
          images.filter((i) => i.product_id === p.id).length,
          readApplications(p.specs).length > 0,
        ),
        ...(!countryOfOrigin(p.specs.country_of_origin)
          ? ["unknown_country_of_origin"]
          : []),
        ...(/^genuine parts$/i.test(p.manufacturer)
          ? ["manufacturer_not_identified"]
          : []),
      ],
    }))
    .filter((p) => p.issues.length);
  await writeFile(
    "docs/catalog/follow-up.json",
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        products: current.length,
        missingEnglishNames: current.filter((p) => !translatedProduct(p, "en"))
          .length,
        items: followUp,
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    "docs/catalog/supplier-review.csv",
    csvReport(
      followUp.map((p) => ({
        partNumber: p.partNumber,
        arabicName: p.name.ar,
        englishName: p.name.en,
        url: p.canonical,
        needsReview: p.issues,
        confirmedManufacturer: "",
        confirmedCountryOfOrigin: "",
        confirmedStockStatus: "",
        confirmedCondition: "",
        confirmedPriceEGP: "",
        verifiedPhotoURL: "",
        clarifiedPartName: "",
      })),
    ),
  );
  console.log({
    missingEnglishNames: current.filter((p) => !translatedProduct(p, "en"))
      .length,
    followUpProducts: followUp.length,
  });
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Catalog update failed",
  );
  process.exitCode = 1;
});
