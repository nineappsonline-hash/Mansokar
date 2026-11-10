import type { Product, Vehicle } from "./catalog";
export type ProductExportFilter = {
  make?: string;
  model?: string;
  year?: number;
  photo?: "yes" | "no";
  status?: "published" | "draft";
  brand?: string;
};
type Model = { id: string; brand: string; slug: string };
const text = (params: URLSearchParams, key: string) =>
  params.get(key)?.trim() || undefined;
export function parseProductExportFilter(
  params: URLSearchParams,
): ProductExportFilter {
  const yearText = text(params, "year"),
    year = yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : undefined,
    photo = text(params, "photo"),
    status = text(params, "status");
  return {
    make: text(params, "make")?.toLowerCase(),
    model: text(params, "model")?.toLowerCase(),
    year: year && year >= 1950 && year <= 2100 ? year : undefined,
    photo: photo === "yes" || photo === "no" ? photo : undefined,
    status: status === "published" || status === "draft" ? status : undefined,
    brand: text(params, "brand")?.toLowerCase(),
  };
}
export function matchesProductExportFilter(
  product: Pick<Product, "manufacturer" | "status" | "specs">,
  context: { fitmentIds?: string[]; imageCount?: number },
  catalog: { vehicles: Vehicle[]; models: Model[] },
  filter: ProductExportFilter,
) {
  if (filter.status && product.status !== filter.status) return false;
  if (
    filter.brand &&
    product.manufacturer.trim().toLowerCase() !== filter.brand
  )
    return false;
  if (filter.photo) {
    const hasPhoto = (context.imageCount ?? 0) > 0;
    if (filter.photo === "yes" && !hasPhoto) return false;
    if (filter.photo === "no" && hasPhoto) return false;
  }
  if (!filter.make && !filter.model && !filter.year) return true;
  const applications: { brand: string; model: string; years: number[] }[] = [];
  for (const [key, value] of Object.entries(product.specs || {})) {
    if (!key.startsWith("car_years:")) continue;
    const model = catalog.models.find((m) => m.id === key.slice(10));
    if (!model) continue;
    applications.push({
      brand: model.brand.toLowerCase(),
      model: model.slug.toLowerCase(),
      years: value
        .split(",")
        .map(Number)
        .filter(
          (year) => Number.isInteger(year) && year >= 1950 && year <= 2100,
        ),
    });
  }
  for (const id of context.fitmentIds || []) {
    const vehicle = catalog.vehicles.find((v) => v.id === id);
    if (!vehicle) continue;
    applications.push({
      brand: vehicle.brand.toLowerCase(),
      model: vehicle.model.toLowerCase(),
      years: [vehicle.year],
    });
  }
  return applications.some(
    (application) =>
      (!filter.make || application.brand === filter.make) &&
      (!filter.model || application.model === filter.model) &&
      (!filter.year || application.years.includes(filter.year)),
  );
}
