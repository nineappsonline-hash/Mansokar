import { readApplications } from "./product-applications";
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
  for (const m of models)
    modelCounts[`${m.brand}/${m.slug}`] = products.filter(
      (p) =>
        eligibleProduct(p) &&
        (readApplications(p.specs).some(
          (a) => a.model_id === m.id && a.years.length,
        ) ||
          fitments.some(
            (f) =>
              f.product_id === p.id &&
              vehicles.some(
                (v) =>
                  v.id === f.vehicle_config_id &&
                  v.brand === m.brand &&
                  v.model === m.slug,
              ),
          )),
    ).length;
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
    productDates: Object.fromEntries(
      products.map((p) => [p.id, p.seo_updated_at ?? undefined]),
    ),
    products: products.map((p) => publicProduct(p)),
    productImages,
    cms,
    guides: buyingGuides,
  });
});
