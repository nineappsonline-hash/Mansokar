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
}, ["mopc-public-seo-inventory-v1"], { revalidate: 120, tags: ["mopc-seo-inventory"] });
export const searchPages = cache(async () => sharedSearchPages());
