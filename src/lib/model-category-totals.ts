import "server-only";
import { unstable_cache } from "next/cache";
import { service } from "./db";

/** Public navigation counts only, cached briefly so each request does not
 * repeat one aggregate RPC per visit. Never cache user filters or vehicle cookies.
 * A short TTL lets newly published inventory become discoverable promptly.
 */
export const cachedModelCategoryTotals = unstable_cache(
  async (make: string, model: string, categorySlugs: string[]) => {
    // Single scoped aggregate replaces one search RPC per category.
    // This counts only published products with recorded model applications
    // and includes parent-category totals, just like search_products_by_car.
    const { data, error } = await service().rpc("model_category_inventory_counts", {
      p_make: make,
      p_model: model,
    });
    if (error) throw error;
    const result = data as {
      modelTotal?: number;
      categoryTotals?: Record<string, number>;
    } | null;
    return {
      modelTotal: result?.modelTotal ?? 0,
      categoryTotals: Object.fromEntries(
        categorySlugs.map((slug) => [slug, result?.categoryTotals?.[slug] ?? 0]),
      ) as Record<string, number>,
    };
  },
  ["mopc-public-model-category-totals-v2"],
  { revalidate: 60 },
);
