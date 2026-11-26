import { cache } from "react";
import { unstable_cache } from "next/cache";
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { demoProducts, demoFits, type Product } from "./catalog";
import { publicProductId } from "./public-product";
import { isRemoteImageUrl } from "./image-links";
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function authClient() {
  if (!configured()) throw Error("Database not configured");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot update cookies; proxy refreshes session. */
          }
        },
      },
    },
  );
}
export function service() {
  if (!configured() || !process.env.SUPABASE_SECRET_KEY)
    throw Error("Server database credentials are not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export const publicProductFields =
  "id,sku,slug,name,description,manufacturer,category,family,type,price,sale,partNumber,partNumbers,synonyms,seo,policy_refs,condition,demo,orderable,status,specs,warranty,editorial" +
  (process.env.SEO_CONTENT_TIMESTAMPS_ENABLED === "true"
    ? ",seo_updated_at"
    : "");

export async function allRows<T = Record<string, unknown>>(
  table: string,
  fields = "*",
  filters: Record<string, unknown> = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = service()
      .from(table)
      .select(fields)
      .order(
        {
          products: "id",
          categories: "slug",
          cms_pages: "slug",
          manufacturers: "name",
          vehicle_brands: "slug",
          vehicle_model_years: "model_id",
          site_settings: "key",
          coupons: "code",
          profiles: "user_id",
          member_carts: "user_id",
          product_fitments: "product_id",
          product_relations: "product_id",
          site_media: "slot",
        }[table] ?? "id",
      );
    if (table === "product_relations")
      query = query.order("related_id").order("kind");
    if (table === "vehicle_model_years") query = query.order("year");
    if (table === "product_fitments") query = query.order("vehicle_config_id");
    query = query.range(offset, offset + 499);
    for (const [key, value] of Object.entries(filters))
      query = query.eq(key, value);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data as unknown as T[]));
    if (data.length < 500) break;
  }
  return rows;
}
export async function catalog(
  options: {
    ids?: string[];
    slug?: string;
    family?: string;
    limit?: number;
    all?: boolean;
  } = {},
): Promise<Product[]> {
  if (!configured())
    return demoProducts
      .filter(
        (p) =>
          (!options.ids || options.ids.includes(p.id)) &&
          (!options.slug ||
            p.slug === options.slug ||
            p.id === publicProductId(options.slug)) &&
          (!options.family || p.family === options.family),
      )
      .slice(0, options.limit ?? Infinity);
  if (options.all)
    return allRows<Product>("products", publicProductFields, {
      status: "published",
    });
  let query = service()
    .from("products")
    .select(publicProductFields)
    .eq("status", "published");
  if (options.ids) {
    if (!options.ids.length) return [];
    query = query.in("id", options.ids.slice(0, 40));
  }
  if (options.slug) {
    const id = publicProductId(options.slug);
    query = id ? query.eq("id", id) : query.eq("slug", options.slug);
  }
  if (options.family) query = query.eq("family", options.family);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 48);
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}
/** Share one published SKU lookup between generateMetadata and the product page. */
export const catalogBySlug = cache((slug: string) => catalog({ slug }));
export async function fitmentFlags(
  ids: string[],
  vehicleId?: string,
): Promise<Record<string, boolean>> {
  if (!vehicleId) return Object.fromEntries(ids.map((id) => [id, false]));
  if (!configured())
    return Object.fromEntries(ids.map((id) => [id, demoFits(id, vehicleId)]));
  const { data, error } = await service()
    .from("product_fitments")
    .select("product_id")
    .in("product_id", ids)
    .eq("vehicle_config_id", vehicleId);
  if (error) throw error;
  const fitted = new Set(data.map((r) => r.product_id));
  return Object.fromEntries(ids.map((id) => [id, fitted.has(id)]));
}
export async function fitment(productId: string, vehicleId?: string) {
  if (!vehicleId) return false;
  if (!configured()) return demoFits(productId, vehicleId);
  const { data, error } = await service()
    .from("product_fitments")
    .select("product_id")
    .eq("product_id", productId)
    .eq("vehicle_config_id", vehicleId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function currentUser() {
  if (!configured()) return null;
  const {
    data: { user },
  } = await (await authClient()).auth.getUser();
  return user;
}
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) throw Error("Unauthorized");
  const db = service();
  let { data, error } = await db
    .from("admins")
    .select("user_id,enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw Error("Forbidden");
  const owner = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (
    !data &&
    owner &&
    user.email_confirmed_at &&
    user.email?.toLowerCase() === owner
  ) {
    const { error: insertError } = await db
      .from("admins")
      .upsert(
        { user_id: user.id, enabled: true },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    if (insertError) throw Error("Forbidden");
    ({ data, error } = await db
      .from("admins")
      .select("user_id,enabled")
      .eq("user_id", user.id)
      .maybeSingle());
  }
  if (error || !data?.enabled) throw Error("Forbidden");
  return user;
}
const sharedVehicleCatalog = unstable_cache(async function loadPublicVehicleCatalog() {
  const { brands: baseBrands, vehicles: baseVehicles } =
    await import("./catalog");
  if (!configured())
    return {
      brands: baseBrands,
      vehicles: baseVehicles,
      models: baseBrands.flatMap((b) =>
        b.models.map((m) => ({
          id: `${b.slug}-${m}`,
          brand: b.slug,
          slug: m,
          name: { ar: m.toUpperCase(), en: m.toUpperCase() },
          image: null as string | null,
        })),
      ),
    };
  const [modelRows, configs, brandRows] = await Promise.all([
    allRows<any>("vehicle_models"),
    allRows<any>("vehicle_configs", "*,vehicle_generations(name)"),
    allRows<any>("vehicle_brands"),
  ]);
  const catalogBrands = brandRows.map((b) => ({
    ...b,
    ar: baseBrands.find((base) => base.slug === b.slug)?.ar || b.name,
  }));
  return {
    models: modelRows,
    brands: catalogBrands.map((b) => ({
      ...b,
      models: modelRows.filter((m) => m.brand === b.slug).map((m) => m.slug),
    })),
    vehicles: (configs ?? []).map((c) => {
      const m = modelRows.find((m) => m.id === c.model_id);
      const b = catalogBrands.find((b) => b.slug === m?.brand);
      return {
        id: c.id,
        brand: b?.slug ?? "",
        model: m?.slug ?? "",
        year: c.year,
        engine: c.engine,
        generation: c.vehicle_generations?.name,
        engineCode: c.engine_code,
        engineCapacity: c.engine_capacity,
        body: c.body,
        trim: c.trim,
        fuelType: c.fuel_type,
        forcedInduction: c.forced_induction,
        transmission: c.transmission,
        name: {
          ar: `${b?.ar} ${m?.name.ar} ${c.year} · ${[c.engine, c.engine_code, c.vehicle_generations?.name, c.fuel_type, c.forced_induction, c.transmission, c.body, c.trim].filter(Boolean).join(" · ")}`,
          en: `${b?.name} ${m?.name.en} ${c.year} · ${[c.engine, c.engine_code, c.vehicle_generations?.name, c.fuel_type, c.forced_induction, c.transmission, c.body, c.trim].filter(Boolean).join(" · ")}`,
        },
      };
    }),
  };
}, ["mopc-public-vehicle-catalog-v1"], { revalidate: 60, tags: ["mopc-public-vehicles"] });
export const vehicleCatalog = cache(async () => sharedVehicleCatalog());
export const storefrontSettings = cache(
  async (): Promise<{
    storeName?: { ar: string; en: string };
    heroTitle?: { ar: string; en: string };
    heroIntro?: { ar: string; en: string };
    heroImage?: string;
    contact?: { ar: string; en: string };
  }> => {
    if (!configured()) return { storeName: { ar: "موبِك", en: "MOPC" } };
    const { data, error } = await service()
      .from("site_settings")
      .select("value")
      .eq("key", "storefront")
      .maybeSingle();
    if (error) throw error;
    return { storeName: { ar: "موبِك", en: "MOPC" }, ...data?.value };
  },
);
export const productImages = cache(async function loadProductImages(productId: string) {
  if (!configured()) return [];
  const { data, error } = await service()
    .from("product_images")
    .select("id,path,alt,position")
    .eq("product_id", productId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    url: isRemoteImageUrl(row.path) ? row.path : `/product-media/${row.id}`,
    alt: row.alt as { ar: string; en: string },
  }));
});
/** Fetch the first recorded photo for each requested product in bounded batches.
 * Featured cards can reuse these results rather than opening one query per SKU.
 */
export async function firstProductImages(productIds: string[]) {
  const ids = [...new Set(productIds)].filter(Boolean);
  const result: Record<string, { url: string; alt: { ar: string; en: string } }> = {};
  if (!configured() || !ids.length) return result;
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await service()
      .from("product_images")
      .select("id,product_id,path,alt,position")
      .in("product_id", ids.slice(offset, offset + 100))
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    for (const row of data ?? []) {
      if (result[row.product_id]) continue;
      result[row.product_id] = {
        url: isRemoteImageUrl(row.path) ? row.path : `/product-media/${row.id}`,
        alt: row.alt as { ar: string; en: string },
      };
    }
  }
  return result;
}
export type CategoryRecord = {
  slug: string;
  name: { ar: string; en: string };
  parent_slug: string | null;
  sort_order: number;
  description: { ar?: string; en?: string };
  seo?: unknown;
};
const sharedCategoryCatalog = unstable_cache(async function loadPublicCategoryCatalog(): Promise<CategoryRecord[]> {
  if (!configured())
    return (await import("./catalog")).categories.map((c, i) => ({
      ...c,
      parent_slug: null,
      sort_order: i,
      description: {},
    }));
  return (await allRows<CategoryRecord>("categories")).sort(
    (a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug),
  );
}, ["mopc-public-category-catalog-v1"], { revalidate: 60, tags: ["mopc-public-categories"] });
export const categoryCatalog = cache(async () => sharedCategoryCatalog());
export type CategoryImage = { path: string; alt: { ar: string; en: string } };
export function categoryImageFromSeo(seo: unknown): CategoryImage | null {
  if (!seo || typeof seo !== "object") return null;
  const image = (seo as Record<string, unknown>).image;
  if (!image || typeof image !== "object") return null;
  const { path, alt } = image as { path?: unknown; alt?: unknown };
  if (typeof path !== "string" || !/^[a-f0-9-]+\.jpg$/.test(path)) return null;
  if (!alt || typeof alt !== "object") return null;
  const localized = alt as Record<string, unknown>;
  if (typeof localized.ar !== "string" || typeof localized.en !== "string")
    return null;
  return { path, alt: { ar: localized.ar, en: localized.en } };
}
export async function categoryImageUrls(categories: CategoryRecord[]) {
  const entries = categories.flatMap((category) => {
    const image = categoryImageFromSeo(category.seo);
    return image ? [{ slug: category.slug, ...image }] : [];
  });
  if (!configured() || !entries.length)
    return {} as Record<
      string,
      { url: string; alt: { ar: string; en: string } }
    >;
  const result: Record<
    string,
    { url: string; alt: { ar: string; en: string } }
  > = {};
  for (let offset = 0; offset < entries.length; offset += 100) {
    const batch = entries.slice(offset, offset + 100);
    const signed = await service()
      .storage.from("catalog-images")
      .createSignedUrls(
        batch.map((item) => item.path),
        600,
      );
    if (signed.error) continue;
    batch.forEach((item, index) => {
      const url = signed.data[index]?.signedUrl;
      if (url) result[item.slug] = { url, alt: item.alt };
    });
  }
  return result;
}
const cachedPublicSiteMedia = unstable_cache(async (
  slots: string[],
): Promise<Record<string, { url: string; alt: { ar: string; en: string } }>> => {
  if (!configured() || !slots.length) return {};
  const unique = [...new Set(slots)];
  const result: Record<
    string,
    { url: string; alt: { ar: string; en: string } }
  > = {};
  for (let offset = 0; offset < unique.length; offset += 100) {
    const { data, error } = await service()
      .from("site_media")
      .select("slot,path,alt")
      .in("slot", unique.slice(offset, offset + 100));
    if (error) throw error;
    if (!data.length) continue;
    const signed = await service()
      .storage.from("catalog-images")
      .createSignedUrls([...new Set(data.map((row) => row.path))], 600);
    if (signed.error) continue;
    const urls = new Map(
      signed.data
        .filter((r) => !r.error && r.path && r.signedUrl)
        .map((r) => [r.path, r.signedUrl]),
    );
    for (const row of data) {
      const url = urls.get(row.path);
      if (url) result[row.slot] = { url, alt: row.alt };
    }
  }
  return result;
}, ["mopc-public-site-media-v1"], { revalidate: 120, tags: ["mopc-public-site-media"] });
/** Signed media URLs expire after 600s; the public cache refreshes after 120s. */
export async function siteMedia(slots: string[]) {
  if (!slots.length) return {};
  return cachedPublicSiteMedia([...new Set(slots)].sort());
}
export async function searchCatalog(filters: {
  make?: string;
  model?: string;
  year?: number;
  query?: string;
  vehicle?: string;
  category?: string;
  manufacturer?: string;
  type?: string;
  min?: number;
  max?: number;
  offers?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}): Promise<{ total: number; products: Product[] }> {
  const carFilter = Boolean(
    filters.make || filters.model || filters.year !== undefined,
  );
  const { data, error } = await service().rpc(
    carFilter ? "search_products_by_car" : "search_products",
    {
      ...(carFilter
        ? {
            p_make: filters.make || null,
            p_model: filters.model || null,
            p_year: filters.year ?? null,
          }
        : {}),
      p_query: filters.query?.slice(0, 100) || "",
      p_vehicle: filters.vehicle || null,
      p_category: filters.category || null,
      p_manufacturer: filters.manufacturer || null,
      p_type: filters.type || null,
      p_min: filters.min ?? null,
      p_max: filters.max ?? null,
      p_offers: filters.offers ?? false,
      p_sort: filters.sort || "",
      p_page: Math.max(1, Math.min(10000, Math.floor(filters.page || 1))),
      p_size: filters.size ?? 12,
    },
  );
  if (error) throw error;
  return data;
}

export async function memberActiveVehicle() {
  const user = await currentUser();
  if (!user) return undefined;
  const { data } = await service()
    .from("garage_vehicles")
    .select("vehicle_config_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  return data?.vehicle_config_id;
}
export async function relatedProducts(
  id: string,
  kind: "alternative" | "together",
  vehicle?: string,
) {
  if (!configured()) return [];
  const { data, error } = await service()
    .from("product_relations")
    .select("related_id")
    .eq("product_id", id)
    .eq("kind", kind);
  if (error) throw error;
  const products = await catalog({ ids: data.map((r) => r.related_id) });
  if (kind === "together") {
    if (!vehicle) return [];
    const flags = await fitmentFlags(
      products.map((p) => p.id),
      vehicle,
    );
    return products.filter((p) => flags[p.id]);
  }
  return products;
}
/** Published CMS copy is public, but remains fresh per request after edits.
 * Both metadata and content share this read on the same render.
 */
const sharedPublishedCmsPage = unstable_cache(async (slug: string) => {
  if (!configured()) return null;
  const { data, error } = await service()
    .from("cms_pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}, ["mopc-public-cms-page-v1"], { revalidate: 60, tags: ["mopc-public-cms"] });
export const publishedCmsPage = cache(async (slug: string) => sharedPublishedCmsPage(slug));
export async function policyPages(slugs: string[]) {
  if (!configured() || !slugs.length) return [];
  const { data, error } = await service()
    .from("cms_pages")
    .select("slug,title,body")
    .in("slug", slugs)
    .eq("published", true);
  if (error) throw error;
  return data ?? [];
}

export async function deliveryAreas() {
  if (!configured()) return [];
  const now = new Date().toISOString();
  const { data, error } = await service()
    .from("shipping_areas")
    .select(
      "id,name,governorate,amount,service_type,delivery_min_hours,delivery_max_hours,business_days",
    )
    .eq("enabled", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);
  if (error) throw error;
  return data ?? [];
}

const sharedHeroSlideshow = unstable_cache(async function loadPublicHeroSlideshow(fallbackUrl: string) {
  const fallback = {
    slides: [
      {
        id: "hero-fallback",
        url: fallbackUrl,
        alt: { ar: "صورة الصفحة الرئيسية", en: "Homepage image" },
      },
    ],
    intervalSeconds: 6,
    autoplay: true,
  };
  if (!configured()) return fallback;
  let rowsError: { message?: string } | null = null;
  let settingsError: { message?: string } | null = null;
  try {
    const [{ data: rows, error }, { data: settings, error: sError }] =
      await Promise.all([
        service()
          .from("hero_slides")
          .select("id,path,alt")
          .eq("enabled", true)
          .order("position")
          .order("id")
          .limit(10),
        service()
          .from("site_settings")
          .select("value")
          .eq("key", "hero_slideshow")
          .maybeSingle(),
      ]);
    rowsError = error;
    settingsError = sError;
    if (rowsError || settingsError) {
      return {
        ...fallback,
        intervalSeconds: 6,
        autoplay: true,
        _error:
          rowsError?.message ??
          settingsError?.message ??
          "heroSlideshow query failed",
      };
    }
    const interval = Number(settings?.value?.intervalSeconds);
    const intervalSeconds = Number.isFinite(interval)
      ? Math.min(30, Math.max(3, interval))
      : 6;
    const autoplay = settings?.value?.autoplay !== false;
    if (!rows?.length) return { ...fallback, intervalSeconds, autoplay };
    const signed = await service()
      .storage.from("catalog-images")
      .createSignedUrls(
        rows.map((r) => r.path),
        600,
      );
    if (signed.error) return { ...fallback, intervalSeconds, autoplay };
    const urls = new Map(
      signed.data
        .filter((r) => r.path && r.signedUrl && !r.error)
        .map((r) => [r.path, r.signedUrl!]),
    );
    const slides = rows
      .filter((r) => urls.has(r.path))
      .map((r) => ({
        id: r.id,
        url: urls.get(r.path)!,
        alt: r.alt as { ar: string; en: string },
      }));
    return {
      slides: slides.length ? slides : fallback.slides,
      intervalSeconds,
      autoplay,
    };
  } finally {
    /* Kept for diagnostic parity in case we add structured logging later. */
    void rowsError;
    void settingsError;
  }
}, ["mopc-public-hero-slideshow-v1"], { revalidate: 120, tags: ["mopc-public-hero"] });
export async function heroSlideshow(fallbackUrl: string) {
  return sharedHeroSlideshow(fallbackUrl);
}

/** Public model-year options for homepage; never include a user's saved car. */
const cachedPublicModelYears = unstable_cache(
  async () => configured()
    ? allRows<{ model_id: string; year: number }>("vehicle_model_years", "model_id,year")
    : [],
  ["mopc-public-model-years-v1"],
  { revalidate: 60, tags: ["mopc-public-model-years"] },
);
export const publicModelYears = cache(async () => cachedPublicModelYears());
