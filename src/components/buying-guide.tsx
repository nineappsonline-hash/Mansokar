import Link from "next/link";
import type { Locale } from "@/lib/catalog";
import { buyingGuides } from "@/lib/buying-guides";
export function BuyingGuide({
  guide,
  locale,
}: {
  guide: (typeof buyingGuides)[number];
  locale: Locale;
}) {
  return (
    <article className="shell section narrow stack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title[locale],
            description: guide.description[locale],
            inLanguage: locale === "ar" ? "ar-EG" : "en-EG",
            mainEntityOfPage: new URL(
              `/${locale}/guides/${guide.slug}`,
              process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
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
