import { policyContent } from "./policy-content";
import { eligibleProduct, translatedProduct } from "./seo-policy";
import type { Product, Text } from "./catalog";
import { isRemoteImageUrl } from "./image-links";
export type SearchPage = {
  path: string;
  title: Text;
  images?: string[];
  locales?: ("ar" | "en")[];
  lastModified?: string;
  kind:
    "main" | "brand" | "model" | "category" | "guide" | "policy" | "product";
};
/** Use identical locale eligibility for CMS sitemap entries and page metadata. */
export function cmsTranslatedLocales(title: Text): ("ar" | "en")[] {
  return (["ar", "en"] as const).filter((locale) =>
    translatedProduct({ name: title }, locale),
  );
}

/** A vehicle landing page uses the translated make AND model together.
 * Numeric/short-code models (MG 5, Peugeot 2008, C3, HS) are legitimate.
 * Bare model names should not be rejected merely for lacking letters.
 */
export function vehicleLandingLocales(
  make: { ar: string; en: string },
  model: Text,
): ("ar" | "en")[] {
  return (["ar", "en"] as const).filter((locale) =>
    translatedProduct({ name: {
      ar: `${make.ar} ${model.ar}`,
      en: `${make.en} ${model.en}`,
    } }, locale),
  );
}

export function publicCmsPath(slug: string) {
  return (
    /^(about|contact|faq|guides)$/.test(slug) ||
    /^guides\/[a-z0-9-]+$/.test(slug) ||
    /^policies\/(privacy|terms|shipping|returns|warranty)$/.test(slug)
  );
}
/** Avoid duplicate indexable landing pages when a model has inventory in
 * exactly one category.  When published product counts match, the model page
 * already represents the complete category inventory.
 *
 * Missing counts are never treated as proof of duplicate content.
 */
export function duplicateModelCategory(
  make: string,
  model: string,
  category: string,
  modelCounts?: Record<string, number>,
  categoryCounts?: Record<string, number>,
) {
  const total = modelCounts?.[`${make}/${model}`];
  const matching = categoryCounts?.[`${make}/${model}/${category}`];
  return typeof total === "number" &&
    total > 0 &&
    typeof matching === "number" &&
    matching === total;
}

export function collectSearchPages(input: {
  brands: { slug: string; name: string; ar: string; models: string[] }[];
  modelNames: { brand: string; slug: string; name: Text }[];
  categories: { slug: string; name: Text }[];
  cms: {
    slug: string;
    title: Text;
    published: boolean;
    seo_updated_at?: string | null;
  }[];
  guides: { slug: string; title: Text }[];
  products: Product[];
  modelCounts?: Record<string, number>;
  modelCategoryCounts?: Record<string, number>;
  productDates?: Record<string, string | undefined>;
  productImages?: { id: string; product_id: string; path: string }[];
}): SearchPage[] {
  // One eligibility pass powers both category and product URL generation.
  // Index images by product once, rather than scanning the entire media table
  // for every product when Google requests a large XML sitemap.
  const publishedProducts = input.products.filter((product) => eligibleProduct(product));
  const publishedCategories = new Set(publishedProducts.map((product) => product.category));
  const imagesByProduct = new Map<string, string[]>();
  for (const image of input.productImages ?? []) {
    const images = imagesByProduct.get(image.product_id) ?? [];
    images.push(
      isRemoteImageUrl(image.path) ? image.path : `/product-media/${image.id}`,
    );
    imagesByProduct.set(image.product_id, images);
  }
  const pages: SearchPage[] = [
    { path: "", title: { ar: "الرئيسية", en: "Home" }, kind: "main" },
    {
      path: "/site-map",
      title: { ar: "خريطة الموقع", en: "Site map" },
      kind: "main",
    },
    {
      path: "/contact",
      title: { ar: "تواصل معنا", en: "Contact us" },
      kind: "main",
    },
    {
      path: "/faq",
      title: { ar: "أسئلة شراء قطع الغيار", en: "Spare-parts questions" },
      kind: "main",
    },
    {
      path: "/guides",
      title: { ar: "أدلة شراء قطع الغيار", en: "Buying guides" },
      kind: "main",
    },
    {
      path: "/installments",
      title: { ar: "دليل الكروت والتقسيط", en: "Cards and installments" },
      kind: "main",
    },
    ...input.categories
      .filter((c) => publishedCategories.has(c.slug))
      .map((c) => ({
        path: `/categories/${c.slug}`,
        title: c.name,
        locales: (["ar", "en"] as const).filter((locale) => translatedProduct({ name: c.name }, locale)),
        kind: "category" as const,
      })),
    ...input.guides.map((g) => ({
      path: `/guides/${g.slug}`,
      title: g.title,
      kind: "guide" as const,
    })),
    ...Object.entries(policyContent).map(([slug, policy]) => ({
      path: `/policies/${slug}`,
      title: policy.title,
      kind: "policy" as const,
    })),
    ...input.cms
      .filter((p) => p.published && publicCmsPath(p.slug))
      .map((p) => ({
        path: `/${p.slug}`,
        title: p.title,
        locales: cmsTranslatedLocales(p.title),
        lastModified: p.seo_updated_at || undefined,
        kind: (p.slug.startsWith("policies/")
          ? "policy"
          : p.slug.startsWith("guides/")
            ? "guide"
            : "main") as SearchPage["kind"],
      })),
    ...input.brands.filter((brand) =>
      input.modelCounts === undefined ||
      brand.models.some((model) => (input.modelCounts?.[`${brand.slug}/${model}`] ?? 0) > 0),
    ).flatMap((b) => [
      {
        path: `/brands/${b.slug}`,
        title: { ar: `قطع غيار ${b.ar}`, en: `${b.name} parts` },
        kind: "brand" as const,
      },
      ...b.models
        .filter(
          (m) =>
            input.modelCounts === undefined ||
            (input.modelCounts[`${b.slug}/${m}`] ?? 0) > 0,
        )
        .map((m) => {
          const name = input.modelNames.find(
            (n) => n.brand === b.slug && n.slug === m,
          )?.name;
          return {
            path: `/brands/${b.slug}/${m}`,
            locales: vehicleLandingLocales(
              { ar: b.ar, en: b.name },
              name ?? { ar: m, en: m },
            ),
            title: {
              ar: `${b.ar} ${name?.ar ?? m}`,
              en: `${b.name} ${name?.en ?? m}`,
            },
            kind: "model" as const,
          };
        }),
      ...b.models.flatMap((model) =>
        input.categories
          .filter((category) =>
            (input.modelCategoryCounts?.[`${b.slug}/${model}/${category.slug}`] ?? 0) > 0 &&
            !duplicateModelCategory(
              b.slug,
              model,
              category.slug,
              input.modelCounts,
              input.modelCategoryCounts,
            ),
          )
          .map((category) => ({
            path: `/brands/${b.slug}/${model}/${category.slug}`,
            locales: vehicleLandingLocales(
              { ar: b.ar, en: b.name },
              input.modelNames.find((item) => item.brand === b.slug && item.slug === model)?.name ??
                { ar: model, en: model },
            ).filter((locale) =>
              translatedProduct({ name: category.name }, locale),
            ),
            title: {
              ar: `${category.name.ar} ${b.ar} ${input.modelNames.find((item) => item.brand === b.slug && item.slug === model)?.name.ar ?? model}`,
              en: `${b.name} ${input.modelNames.find((item) => item.brand === b.slug && item.slug === model)?.name.en ?? model} ${category.name.en}`,
            },
            kind: "model" as const,
          })),
      ),
    ]),
    ...publishedProducts.map((p) => ({
        path: `/products/${p.slug}`,
        title: p.name,
        locales: (["ar", "en"] as const).filter((locale) =>
          translatedProduct(p, locale),
        ),
        lastModified: input.productDates?.[p.id],
        images: input.productImages ? imagesByProduct.get(p.id) ?? [] : undefined,
        kind: "product" as const,
      })),
  ];
  return [...new Map(pages.map((p) => [p.path, p])).values()];
}
/** The HTML site map must never link to language URLs omitted from XML. */
export function searchPagesForLocale(pages: SearchPage[], locale: "ar" | "en") {
  return pages.filter((page) =>
    !page.locales || page.locales.includes(locale),
  );
}

export function sitemapEntries(pages: SearchPage[], base: string) {
  const origin = new URL(base).origin;
  return pages.flatMap((p) =>
    (p.locales ?? ["ar", "en"]).map((locale) => ({
      url: `${origin}/${locale}${p.path}`,
      ...(p.lastModified && Number.isFinite(Date.parse(p.lastModified))
        ? { lastModified: p.lastModified }
        : {}),
      ...(p.images?.length
        ? { images: p.images.map((image) => new URL(image, origin).href) }
        : {}),
      alternates: {
        languages: Object.fromEntries(
          (p.locales ?? ["ar", "en"]).map((locale) => [
            `${locale}-EG`,
            `${origin}/${locale}${p.path}`,
          ]),
        ),
      },
    })),
  );
}
