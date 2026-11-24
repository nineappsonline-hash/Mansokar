import { createHash } from "node:crypto";
import { z } from "zod";
type Model = {
  id: string;
  brand: string;
  slug: string;
  name: { ar: string; en: string };
};
const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase();
const code = (s: string) =>
  norm(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") ||
  `car-${createHash("sha256").update(norm(s)).digest("hex").slice(0, 16)}`;
export function planImportVehicles(
  rows: any[],
  models: Model[],
  brands: { slug: string; name: string; ar?: string }[],
  modelYears: { model_id: string; year: number }[] = [],
) {
  const savedModels = [...models],
    savedBrands = [...brands],
    allModels = [...models],
    allBrands = [...brands];
  const additions: (Model & { make_name: string })[] = [];
  const skippedModels = new Set<string>();
  const normalized = rows.map((row) => {
    if (!row.spreadsheet) return row;
    const applications_input = z
      .array(
        z.object({
          make: z.string().trim().min(1).max(100),
          model: z.string().trim().min(1).max(100),
          years: z.union([
            z.literal("all"),
            z.array(z.number().int().min(1950).max(2100)).min(1).max(151),
          ]),
        }),
      )
      .max(1000)
      .parse(row.applications_input || [])
      .flatMap((input) => {
        const isAll = (value: string) => value.toLowerCase() === "all";
        const matchingBrands = isAll(input.make)
          ? savedBrands.filter((brand) =>
              savedModels.some((model) => model.brand === brand.slug),
            )
          : [
              allBrands.find((brand) =>
                [brand.slug, brand.name, brand.ar].some(
                  (name) => name && norm(name) === norm(input.make),
                ),
              ),
            ].filter(Boolean);
        if (isAll(input.make) && !matchingBrands.length)
          throw Error("All car makes has no saved models to match");
        if (!matchingBrands.length) {
          const brand = {
            slug: code(input.make),
            name: input.make,
            ar: input.make,
          };
          allBrands.push(brand);
          matchingBrands.push(brand);
        }
        const expanded: { make: string; model: string; years: number[] }[] = [];
        for (const brand of matchingBrands) {
          if (!brand) continue;
          const candidates = isAll(input.model)
            ? savedModels.filter((model) => model.brand === brand.slug)
            : allModels.filter(
                (model) =>
                  model.brand === brand.slug &&
                  [model.slug, model.name.ar, model.name.en].some(
                    (name) => norm(name) === norm(input.model),
                  ),
              );
          if (isAll(input.model) && !candidates.length)
            throw Error(`All car models has no saved models for ${brand.slug}`);
          if (!candidates.length && isAll(input.make)) continue;
          if (!candidates.length) {
            const slug = code(input.model);
            const model = {
              id: `import-${createHash("sha256").update(`${brand.slug}/${slug}`).digest("hex").slice(0, 24)}`,
              brand: brand.slug,
              slug,
              name: { ar: input.model, en: input.model },
            };
            allModels.push(model);
            additions.push({ ...model, make_name: brand.name });
            candidates.push(model);
          }
          for (const model of candidates) {
            const savedYears = [
              ...new Set(
                modelYears
                  .filter((entry) => entry.model_id === model.id)
                  .map((entry) => entry.year),
              ),
            ].sort((a, b) => a - b);
            const wildcard = isAll(input.make) || isAll(input.model);
            const years =
              input.years === "all"
                ? savedYears
                : wildcard
                  ? input.years.filter((year) => savedYears.includes(year))
                  : input.years;
            if (!years.length) {
              if (wildcard || input.years === "all") {
                skippedModels.add(`${brand.slug}/${model.slug}`);
                continue;
              }
              throw Error(
                `All car years has no saved years for ${brand.slug}/${model.slug}`,
              );
            }
            expanded.push({ make: brand.slug, model: model.slug, years });
          }
        }
        if (!expanded.length && input.years !== "all")
          throw Error(`No saved car models match ${input.make}/${input.model}`);
        if (expanded.length > 1000)
          throw Error(
            "All matches too many car models; choose a make or model",
          );
        return expanded;
      });
    if (applications_input.length > 1000)
      throw Error("All matches too many car models; choose a make or model");
    return { ...row, applications_input };
  });
  return {
    rows: normalized,
    models: allModels,
    additions,
    skippedModels: [...skippedModels],
  };
}
