import "server-only";
import { allRows } from "./db";
import { seoHealthRows } from "./seo-health";
import { siteOrigin } from "./site-url";
import type { Product } from "./catalog";
export async function seoHealthData() {
  const [products, images, fitments, models] = await Promise.all([
    allRows<Product>("products"),
    allRows<{ product_id: string }>("product_images", "product_id"),
    allRows<{ product_id: string }>("product_fitments", "product_id"),
    allRows<{ id: string }>("vehicle_models", "id"),
  ]);
  return seoHealthRows(
    products,
    images,
    fitments,
    models.map((m) => m.id),
    siteOrigin(),
  );
}
