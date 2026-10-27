import type { MetadataRoute } from "next";
import { catalog, configured, vehicleCatalog, allRows } from "@/lib/db";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!configured()) return [];
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { brands } = await vehicleCatalog();
  const products = await catalog({ all: true });
  const [categories, pages] = await Promise.all([
    allRows<any>("categories"),
    allRows<any>("cms_pages", "slug", { published: true }),
  ]);
  const paths = [
    ...categories.map((c) => `/categories/${c.slug}`),
    ...pages.map((p) => `/${p.slug}`),
    "",
    ...brands.flatMap((b) => [
      `/brands/${b.slug}`,
      ...b.models.map((m) => `/brands/${b.slug}/${m}`),
    ]),
    ...products.filter((p) => !p.demo).map((p) => `/products/${p.slug}`),
  ];
  return [...new Set(paths)].flatMap((path) =>
    ["ar", "en"].map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: { ar: `${base}/ar${path}`, en: `${base}/en${path}` },
      },
    })),
  );
}
