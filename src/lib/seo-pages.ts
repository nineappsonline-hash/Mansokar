import { hasModelApplication } from "./seo-policy";
import { eligibleProduct } from "./seo-policy";
import "server-only";
import { cache } from "react";
import {
  allRows,
  catalog,
  categoryCatalog,
  configured,
  vehicleCatalog,
} from "./db";
import { buyingGuides } from "./buying-guides";
import { coveredBrands, targetModel } from "./vehicle-coverage";
import { collectSearchPages } from "./seo-inventory";
import { publicProduct } from "./public-product";
export const searchPages = cache(async () => {
  const [
    { brands: storedBrands, models, vehicles },
    categories,
    products,
    cms,
    productImages,
  ] = await Promise.all([
    vehicleCatalog(),
    categoryCatalog(),
    catalog({ all: true }),
    configured()
      ? allRows<any>("cms_pages", "*", { published: true })
      : Promise.resolve([]),
    configured()
      ? allRows<{ id: string; product_id: string; path: string }>(
          "product_images",
          "id,product_id,path",
        )
      : Promise.resolve([]),
  ]);
  const fitments = configured()
    ? await allRows<{ product_id: string; vehicle_config_id: string }>(
        "product_fitments",
      )
    : [];
  const modelCounts: Record<string, number> = {};
  const modelCategoryCounts: Record<string, number> = {};
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const fitmentsByProduct = new Map<string, Set<string>>();
  for (const fitment of fitments) {
    const linked = fitmentsByProduct.get(fitment.product_id) ?? new Set<string>();
    const vehicle = vehicleById.get(fitment.vehicle_config_id);
    if (vehicle) linked.add(`${vehicle.brand}/${vehicle.model}`);
    fitmentsByProduct.set(fitment.product_id, linked);
  }
  for (const model of models) {
    const key = `${model.brand}/${model.slug}`;
    for (const product of products) {
      if (!eligibleProduct(product)) continue;
      if (!hasModelApplication(product.specs, model.id) &&
          !fitmentsByProduct.get(product.id)?.has(key)) continue;
      modelCounts[key] = (modelCounts[key] ?? 0) + 1;
      const categoryKey = `${key}/${product.category}`;
      modelCategoryCounts[categoryKey] = (modelCategoryCounts[categoryKey] ?? 0) + 1;
    }
  }
  const brands = coveredBrands(storedBrands);
  const modelNames = brands.flatMap((b) =>
    b.models.map((slug) => ({
      brand: b.slug,
      slug,
      name: models.find((m) => m.brand === b.slug && m.slug === slug)?.name ??
        targetModel(b.slug, slug)?.name ?? { ar: slug, en: slug },
    })),
  );
  return collectSearchPages({
    brands,
    modelNames,
    categories,
    modelCounts,
    modelCategoryCounts,
    productDates: Object.fromEntries(
      products.map((p) => [p.id, p.seo_updated_at ?? undefined]),
    ),
    products: products.map((p) =>
      publicProduct(p, undefined, false, { brands, models }),
    ),
    productImages,
    cms,
    guides: buyingGuides,
  });
});
