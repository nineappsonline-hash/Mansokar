import { siteOrigin } from "@/lib/site-url";
import Link from "next/link";
import type { Locale } from "@/lib/catalog";
import { buyingGuides } from "@/lib/buying-guides";
import { catalog, vehicleCatalog } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { eligibleProduct } from "@/lib/seo-policy";
import { publicProduct } from "@/lib/public-product";
import { readApplications } from "@/lib/product-applications";
// Guides show at most four SKU links and eight model links. Avoid scanning
// the complete inventory on every article request; refresh published candidates
// regularly so links remain representative of the live catalog.
const guideProductCandidates = unstable_cache(
  async () => catalog({ limit: 96 }),
  ["mopc-public-guide-candidates-v1"],
  { revalidate: 120, tags: ["mopc-public-guide-candidates"] },
);
export async function BuyingGuide({
  guide,
  locale,
}: {
  guide: (typeof buyingGuides)[number];
  locale: Locale;
}) {
  const [products, { models, brands }] = await Promise.all([
    guideProductCandidates(),
    vehicleCatalog(),
  ]);
  const eligible = products.filter((p) => eligibleProduct(p, locale));
  const modelIdsWithYears = new Set(
    eligible.flatMap((p) =>
      readApplications(p.specs)
        .filter((application) => application.years.length > 0)
        .map((application) => application.model_id),
    ),
  );
  const related = models.filter((model) => modelIdsWithYears.has(model.id));
  return (
    <article className="shell section narrow stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title[locale],
            author: {
              "@type": "Organization",
              "@id": siteOrigin() + "/#organization",
              name: "MOPC",
            },
            publisher: { "@id": siteOrigin() + "/#organization" },
            description: guide.description[locale],
            inLanguage: locale === "ar" ? "ar-EG" : "en-EG",
            mainEntityOfPage: new URL(
              `/${locale}/guides/${guide.slug}`,
              siteOrigin(),
            ).href,
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Link href={`/${locale}/guides`}>
        {locale === "ar" ? "أدلة شراء قطع الغيار" : "Spare-parts buying guides"}{" "}
        ↗
      </Link>
      <h1>{guide.title[locale]}</h1>
      <p className="lead">{guide.description[locale]}</p>
      {guide.sections.map((section, i) => (
        <section key={i} className="stack">
          <h2>{section.heading[locale]}</h2>
          <p className="prose">{section.body[locale]}</p>
        </section>
      ))}
      {guide.slug === "genuine-parts-and-warranty" && (
        <nav
          className="admin-nav"
          aria-label={
            locale === "ar" ? "السياسات المرتبطة" : "Related policies"
          }
        >
          <Link href={`/${locale}/policies/warranty`}>
            {locale === "ar" ? "سياسة الضمان" : "Warranty policy"}
          </Link>
          <Link href={`/${locale}/policies/returns`}>
            {locale === "ar" ? "الاسترجاع والاستبدال" : "Returns and exchanges"}
          </Link>
          <Link href={`/${locale}/guides/check-part-compatibility`}>
            {locale === "ar" ? "دليل التوافق" : "Fitment guide"}
          </Link>
        </nav>
      )}
      <section className="stack">
        <h2>
          {locale === "ar"
            ? "ابدأ بالموديل أو رقم القطعة المسجل"
            : "Start with a saved model or recorded part number"}
        </h2>
        <p>
          {locale === "ar"
            ? "الروابط التالية من الكتالوج الحالي. وجود القطعة في الكتالوج لا يؤكد المخزون أو التوافق مع كل محرك؛ راجع البيانات قبل الطلب."
            : "These links come from the current catalog. A listing does not confirm stock or compatibility with every engine; check the details before ordering."}
        </p>
        <nav
          className="admin-nav"
          aria-label={locale === "ar" ? "موديلات مسجلة" : "Saved models"}
        >
          {related.slice(0, 8).map((m) => (
            <Link key={m.id} href={`/${locale}/brands/${m.brand}/${m.slug}`}>
              {brands.find((b) => b.slug === m.brand)?.name} {m.name[locale]}
            </Link>
          ))}
        </nav>
        <nav
          className="admin-nav"
          aria-label={
            locale === "ar" ? "أرقام قطع مسجلة" : "Recorded part numbers"
          }
        >
          {eligible.slice(0, 4).map((raw) => {
            const p = publicProduct(raw);
            return (
              <Link key={p.id} href={`/${locale}/products/${p.slug}`}>
                {p.name[locale]} · {p.partNumber}
              </Link>
            );
          })}
        </nav>
      </section>
      <nav
        className="stack"
        aria-label={
          locale === "ar" ? "خطوات الشراء والمساعدة" : "Shopping and help"
        }
      >
        <Link href={`/${locale}/catalog`}>
          {locale === "ar" ? "تصفح القطع والأسعار" : "Browse parts and prices"}{" "}
          ↗
        </Link>
        <Link href={`/${locale}/request-part`}>
          {locale === "ar"
            ? "اطلب مساعدة لتحديد القطعة"
            : "Request help identifying a part"}{" "}
          ↗
        </Link>
        <Link href={`/${locale}/installments`}>
          {locale === "ar"
            ? "دليل الكروت والتقسيط"
            : "Cards and installments guide"}{" "}
          ↗
        </Link>
        {buyingGuides
          .filter((g) => g.slug !== guide.slug)
          .map((g) => (
            <Link key={g.slug} href={`/${locale}/guides/${g.slug}`}>
              {g.title[locale]} ↗
            </Link>
          ))}
      </nav>
    </article>
  );
}
