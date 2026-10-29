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
    { brands: storedBrands, models },
    categories,
    products,
    cms,
    productImages,
  ] = await Promise.all([
    vehicleCatalog(),
    categoryCatalog(),
    catalog({ all: true }),
    configured()
      ? allRows<any>("cms_pages", "slug,title,published", { published: true })
      : Promise.resolve([]),
    configured()
      ? allRows<{ id: string; product_id: string }>(
          "product_images",
          "id,product_id",
        )
      : Promise.resolve([]),
  ]);
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
    products: products.map((p) => publicProduct(p)),
    productImages,
    cms,
    guides: buyingGuides,
  });
});
