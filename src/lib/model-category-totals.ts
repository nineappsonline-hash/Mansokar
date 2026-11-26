import "server-only";
import { unstable_cache } from "next/cache";
import { searchCatalog } from "./db";

/** Public navigation counts only, cached briefly so each request does not
 * repeat one search RPC per category. Never cache user filters or vehicle cookies.
 * A short TTL lets newly published inventory become discoverable promptly.
 */
export const cachedModelCategoryTotals = unstable_cache(
  async (make: string, model: string, categorySlugs: string[]) => {
    const base = { make, model, size: 1 };
    const [modelInventory, ...categories] = await Promise.all([
      searchCatalog(base),
      ...categorySlugs.map((category) => searchCatalog({ ...base, category })),
    ]);
    return {
      modelTotal: modelInventory.total,
      categoryTotals: Object.fromEntries(
        categorySlugs.map((category, i) => [category, categories[i].total]),
      ) as Record<string, number>,
    };
  },
  ["mopc-public-model-category-totals-v1"],
  { revalidate: 60 },
);
