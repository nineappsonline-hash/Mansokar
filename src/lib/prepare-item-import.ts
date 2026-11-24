import { automaticProduct } from "./product-automation";
import { applicationSpecs } from "./product-applications";
import { z } from "zod";
export function prepareItemRows(
  rows: any[],
  models: {
    id: string;
    brand: string;
    slug: string;
    name: { ar: string; en: string };
  }[],
  existing: any[],
) {
  return rows.map((row, index) => {
    if (!row.spreadsheet) return row;
    const old =
      existing.find((p) => p.sku === row.sku) ||
      (row.sku_automatic
        ? existing.find((p) => p.sku === row.item_key)
        : undefined);
    const grouped = new Map<string, number[]>();
    const inputs = z
      .array(
        z.object({
          make: z.string().min(1).max(100),
          model: z.string().min(1).max(100),
          years: z.array(z.number().int().min(1950).max(2100)).max(151),
        }),
      )
      .max(1000)
      .parse(row.applications_input || []);
    for (const input of inputs) {
      const model = models.find(
        (m) =>
          m.brand === String(input.make).toLowerCase() &&
          m.slug === String(input.model).toLowerCase(),
      );
      if (!model)
        throw Error(
          `Row ${index + 1}: unknown car make/model ${input.make}/${input.model}. Use Car models sheet codes.`,
        );
      grouped.set(model.id, [
        ...new Set([...(grouped.get(model.id) || []), ...input.years]),
      ] as number[]);
    }
    const applications = [...grouped].map(([model_id, years]) => ({
      model_id,
      years,
    }));
    const sku = old?.sku || row.sku;
    const auto = automaticProduct({
      name: row.name,
      manufacturer: row.manufacturer,
      partNumber: row.partNumber,
      sku,
      slug: old?.slug || undefined,
      months: row.specs.warranty_months
        ? Number(row.specs.warranty_months)
        : null,
      vehicles: applications.flatMap((a) => {
        const m = models.find((m) => m.id === a.model_id)!;
        if (!a.years.length) return [{name: {ar: `${m.brand} ${m.name.ar}`, en: `${m.brand} ${m.name.en}`}}];
        return [...a.years]
          .sort((a, b) => a - b)
          .map((year) => ({
            name: {
              ar: `${m.brand} ${m.name.ar} ${year}`,
              en: `${m.brand} ${m.name.en} ${year}`,
            },
          }));
      }),
    });
    return {
      ...old,
      ...row,
      ...auto,
      warranty: row.specs.warranty_months
        ? auto.warranty
        : (row.warranty ?? old?.warranty ?? null),
      category: row.category || old?.category || "spare-parts",
      family: old?.family || row.family,
      specs: applicationSpecs({ ...old?.specs, ...row.specs }, applications),
    };
  });
}
