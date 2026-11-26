import Link from "next/link";
import type { Locale } from "@/lib/catalog";
import { searchPagesForLocale, type SearchPage } from "@/lib/seo-inventory";
export function SiteMap({
  pages,
  locale,
  page = 1,
}: {
  pages: SearchPage[];
  locale: Locale;
  page?: number;
}) {
  const visiblePages = searchPagesForLocale(pages, locale);
  const products = visiblePages.filter((p) => p.kind === "product");
  const count = Math.max(1, Math.ceil(products.length / 100));
  const current = Math.min(
    Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1),
    count,
  );
  const groups = [
    { kind: "main", ar: "صفحات المتجر", en: "Store pages" },
    { kind: "brand", ar: "ماركات العربيات", en: "Vehicle brands" },
    { kind: "model", ar: "موديلات العربيات", en: "Vehicle models" },
    { kind: "category", ar: "أقسام قطع الغيار", en: "Part categories" },
    { kind: "guide", ar: "أدلة الشراء", en: "Buying guides" },
    { kind: "policy", ar: "السياسات المنشورة", en: "Published policies" },
    { kind: "product", ar: "المنتجات المنشورة", en: "Published products" },
  ];
  return (
    <div className="shell section stack">
      <h1>{locale === "ar" ? "خريطة الموقع" : "Site map"}</h1>
      <p>
        {locale === "ar"
          ? "روابط مباشرة لماركات وموديلات العربيات وأقسام القطع والأدلة والمنتجات المنشورة."
          : "Direct links to vehicle brands, models, part categories, buying guides and published products."}
      </p>
      <a className="text-link" href="/sitemap.xml">
        XML sitemap ↗
      </a>
      {groups.map((g) => {
        const entries =
          g.kind === "product"
            ? products.slice((current - 1) * 100, current * 100)
            : visiblePages.filter((p) => p.kind === g.kind);
        return entries.length > 0 ? (
          <section className="panel stack" key={g.kind}>
            <h2>{locale === "ar" ? g.ar : g.en}</h2>
            <ul>
              {entries.map((p) => (
                <li key={p.path}>
                  <Link href={`/${locale}${p.path}`}>{p.title[locale]}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null;
      })}
      {count > 1 && (
        <nav aria-label={locale === "ar" ? "صفحات المنتجات" : "Product pages"}>
          {current > 1 && (
            <Link href={`/${locale}/site-map?page=${current - 1}`}>
              {locale === "ar" ? "السابق" : "Previous"}
            </Link>
          )}{" "}
          {current} / {count}{" "}
          {current < count && (
            <Link href={`/${locale}/site-map?page=${current + 1}`}>
              {locale === "ar" ? "التالي" : "Next"}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
