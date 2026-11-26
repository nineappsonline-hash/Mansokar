import type { Product } from "./catalog";
import { readApplications } from "./product-applications";
import { eligibleProduct } from "./seo-policy";

type ModelRef = { id: string; brand: string; slug: string };
type VehicleRef = { id: string; brand: string; model: string };
type FitmentRef = { product_id: string; vehicle_config_id: string };

/** Count each eligible product at most once per model, regardless of
 * overlapping application records and individual vehicle configurations.
 * Complexity scales with saved applications and fitments, not models × products.
 */
export function sitemapFitmentCounts(input: {
  models: ModelRef[];
  vehicles: VehicleRef[];
  products: Product[];
  fitments: FitmentRef[];
}) {
  const modelById = new Map(input.models.map((model) =>
    [model.id, `${model.brand}/${model.slug}`],
  ));
  const knownModels = new Set(modelById.values());
  const vehicleModelById = new Map(input.vehicles.map((vehicle) =>
    [vehicle.id, `${vehicle.brand}/${vehicle.model}`],
  ));
  const productModels = new Map<string, Set<string>>();
  for (const fitment of input.fitments) {
    const modelKey = vehicleModelById.get(fitment.vehicle_config_id);
    if (!modelKey || !knownModels.has(modelKey)) continue;
    const linked = productModels.get(fitment.product_id) ?? new Set<string>();
    linked.add(modelKey);
    productModels.set(fitment.product_id, linked);
  }

  const modelCounts: Record<string, number> = {};
  const modelCategoryCounts: Record<string, number> = {};
  for (const product of input.products) {
    if (!eligibleProduct(product)) continue;
    const linked = new Set(productModels.get(product.id) ?? []);
    for (const application of readApplications(product.specs)) {
      const key = modelById.get(application.model_id);
      if (key) linked.add(key); // Empty year ranges mean model-wide compatibility.
    }
    for (const model of linked) {
      modelCounts[model] = (modelCounts[model] ?? 0) + 1;
      const categoryKey = `${model}/${product.category}`;
      modelCategoryCounts[categoryKey] = (modelCategoryCounts[categoryKey] ?? 0) + 1;
    }
  }
  return { modelCounts, modelCategoryCounts };
}
