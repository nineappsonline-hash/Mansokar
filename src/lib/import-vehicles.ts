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
) {
  const allModels = [...models],
    allBrands = [...brands];
  const additions: (Model & { make_name: string })[] = [];
  const normalized = rows.map((row) => {
    if (!row.spreadsheet) return row;
    const applications_input = z
      .array(
        z.object({
          make: z.string().trim().min(1).max(100),
          model: z.string().trim().min(1).max(100),
          years: z.array(z.number().int().min(1950).max(2100)).min(1).max(151),
        }),
      )
      .max(1000)
      .parse(row.applications_input || [])
      .map((input) => {
        let brand = allBrands.find((b) =>
          [b.slug, b.name, b.ar].some((n) => n && norm(n) === norm(input.make)),
        );
        if (!brand) {
          brand = { slug: code(input.make), name: input.make, ar: input.make };
          allBrands.push(brand);
        }
        let model = allModels.find(
          (m) =>
            m.brand === brand.slug &&
            [m.slug, m.name.ar, m.name.en].some(
              (n) => norm(n) === norm(input.model),
            ),
        );
        if (!model) {
          const slug = code(input.model);
          model = {
            id: `import-${createHash("sha256").update(`${brand.slug}/${slug}`).digest("hex").slice(0, 24)}`,
            brand: brand.slug,
            slug,
            name: { ar: input.model, en: input.model },
          };
          allModels.push(model);
          additions.push({ ...model, make_name: brand.name });
        }
        return { ...input, make: brand.slug, model: model.slug };
      });
    return { ...row, applications_input };
  });
  return { rows: normalized, models: allModels, additions };
}
