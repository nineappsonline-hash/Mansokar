import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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
import { sitemapFitmentCounts } from "./seo-fitment-counts";
import { publicProduct } from "./public-product";
import { readApplications } from "./product-applications";
// This is public inventory only: never include user cookies, cart, or order data.
// Bound shared caching prevents a full catalog/fitment/image crawl for every
// paginated HTML site-map visit while refreshing published inventory regularly.
const sharedSearchPages = unstable_cache(async () => {
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
  const { modelCounts, modelCategoryCounts } = sitemapFitmentCounts({
    models,
    vehicles,
    products,
    fitments,
  });
  const brands = coveredBrands(storedBrands);
  const modelNames = brands.flatMap((b) =>
    b.models.map((slug) => ({
      brand: b.slug,
      slug,
      name: models.find((m) => m.brand === b.slug && m.slug === slug)?.name ??
        targetModel(b.slug, slug)?.name ?? { ar: slug, en: slug },
    })),
  );
  // Use only model applications and recorded fitments. Build this lookup
  // once for the whole sitemap; projected publicProduct strips car_years keys.
  const modelById = new Map(models.map((model) => [model.id, model]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const compatibleIds = new Map<string, Set<string>>();
  for (const product of products) {
    const ids = new Set(readApplications(product.specs).map((application) => application.model_id));
    compatibleIds.set(product.id, ids);
  }
  for (const fitment of fitments) {
    const vehicle = vehicleById.get(fitment.vehicle_config_id);
    if (!vehicle) continue;
    const model = models.find((item) =>
      item.brand === vehicle.brand && item.slug === vehicle.model
    );
    if (!model) continue;
    const ids = compatibleIds.get(fitment.product_id) ?? new Set<string>();
    ids.add(model.id);
    compatibleIds.set(fitment.product_id, ids);
  }
  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const productVehicleLabels = Object.fromEntries(products.map((product) => [
    product.id,
    [...(compatibleIds.get(product.id) ?? [])]
      .map((id) => {
        const model = modelById.get(id);
        const brand = model && brandBySlug.get(model.brand);
        return model && brand
          ? {
              ar: `${brand.ar} ${model.name.ar}`,
              en: `${brand.name} ${model.name.en}`,
            }
          : null;
      })
      .filter((label): label is { ar: string; en: string } => Boolean(label))
      .sort((left, right) => left.en.localeCompare(right.en)),
  ]));
  return collectSearchPages({
    brands,
    modelNames,
    categories,
    modelCounts,
    modelCategoryCounts,
    productVehicleLabels,
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
}, ["mopc-public-seo-inventory-v1"], { revalidate: 120, tags: ["mopc-seo-inventory"] });
export const searchPages = cache(async () => sharedSearchPages());
