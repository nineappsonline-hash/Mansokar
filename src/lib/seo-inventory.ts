import type { Product, Text } from "./catalog";
import { isRemoteImageUrl } from "./image-links";
export type SearchPage = {
  path: string;
  title: Text;
  images?: string[];
  kind:
    "main" | "brand" | "model" | "category" | "guide" | "policy" | "product";
};
export function publicCmsPath(slug: string) {
  return (
    /^(about|contact|faq|guides)$/.test(slug) ||
    /^guides\/[a-z0-9-]+$/.test(slug) ||
    /^policies\/(privacy|terms|shipping|returns|warranty)$/.test(slug)
  );
}
export function collectSearchPages(input: {
  brands: { slug: string; name: string; ar: string; models: string[] }[];
  modelNames: { brand: string; slug: string; name: Text }[];
  categories: { slug: string; name: Text }[];
  cms: { slug: string; title: Text; published: boolean }[];
  guides: { slug: string; title: Text }[];
  products: Product[];
  productImages?: { id: string; product_id: string; path: string }[];
}): SearchPage[] {
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
    ...input.categories.map((c) => ({
      path: `/categories/${c.slug}`,
      title: c.name,
      kind: "category" as const,
    })),
    ...input.guides.map((g) => ({
      path: `/guides/${g.slug}`,
      title: g.title,
      kind: "guide" as const,
    })),
    ...input.cms
      .filter((p) => p.published && publicCmsPath(p.slug))
      .map((p) => ({
        path: `/${p.slug}`,
        title: p.title,
        kind: (p.slug.startsWith("policies/")
          ? "policy"
          : p.slug.startsWith("guides/")
            ? "guide"
            : "main") as SearchPage["kind"],
      })),
    ...input.brands.flatMap((b) => [
      {
        path: `/brands/${b.slug}`,
        title: { ar: `قطع غيار ${b.ar}`, en: `${b.name} parts` },
        kind: "brand" as const,
      },
      ...b.models.map((m) => {
        const name = input.modelNames.find(
          (n) => n.brand === b.slug && n.slug === m,
        )?.name;
        return {
          path: `/brands/${b.slug}/${m}`,
          title: {
            ar: `${b.ar} ${name?.ar ?? m}`,
            en: `${b.name} ${name?.en ?? m}`,
          },
          kind: "model" as const,
        };
      }),
    ]),
    ...input.products
      .filter((p) => !p.demo && p.status === "published")
      .map((p) => ({
        path: `/products/${p.slug}`,
        title: p.name,
        images: input.productImages
          ?.filter((image) => image.product_id === p.id)
          .map((image) =>
            isRemoteImageUrl(image.path)
              ? image.path
              : `/product-media/${image.id}`,
          ),
        kind: "product" as const,
      })),
  ];
  return [...new Map(pages.map((p) => [p.path, p])).values()];
}
export function sitemapEntries(pages: SearchPage[], base: string) {
  const origin = new URL(base).origin;
  return pages.flatMap((p) =>
    ["ar", "en"].map((locale) => ({
      url: `${origin}/${locale}${p.path}`,
      ...(p.images?.length
        ? { images: p.images.map((image) => new URL(image, origin).href) }
        : {}),
      alternates: {
        languages: { ar: `${origin}/ar${p.path}`, en: `${origin}/en${p.path}` },
      },
    })),
  );
}
