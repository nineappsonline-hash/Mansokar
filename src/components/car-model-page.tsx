import { siteOrigin } from "@/lib/site-url";
import Image from "next/image";
import Link from "next/link";
import { CarFront } from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
import { ModelYearCards } from "./model-year-cards";
import styles from "./car-model-page.module.css";

export function CarModelPage({
  locale,
  brand,
  models,
  query,
  sort,
  logo,
}: {
  locale: Locale;
  brand: { slug: string; name: string; ar: string };
  models: { slug: string; name: Text; photo?: string; years: number[] }[];
  query?: string;
  sort?: string;
  logo?: string;
}) {
  const ar = locale === "ar";
  const known = ["opel", "mg", "chevrolet", "peugeot", "citroen"].includes(
    brand.slug,
  );
  const brandLogo =
    logo ||
    (known
      ? brand.slug === "chevrolet"
        ? "/images/brands/chevrolet.png"
        : brand.slug === "citroen"
          ? "/images/brands/citroen-2022.svg"
          : `/images/brands/${brand.slug}.svg`
      : undefined);
  return (
    <div className={`vehicle-showcase ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { name: ar ? "الرئيسية" : "Home", path: `/${locale}` },
              {
                name: ar ? "الماركات" : "Car makes",
                path: `/${locale}/#brands`,
              },
              {
                name: ar ? brand.ar : brand.name,
                path: `/${locale}/brands/${brand.slug}`,
              },
            ].map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              item: new URL(
                c.path,
                siteOrigin(),
              ).href,
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className={styles.hero}>
        <Image
          src={
            known
              ? `/images/vehicles/showcase/banner-${brand.slug}.webp`
              : "/images/cyan/hero-blue.webp"
          }
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={`shell ${styles.heroInner}`}>
          <div className={styles.emblem}>
            {brandLogo ? (
              <img src={brandLogo} alt={brand.name} />
            ) : (
              <CarFront size={80} />
            )}
            <span>{brand.name.toUpperCase()}</span>
          </div>
          <div className={styles.heroCopy}>
            <nav
              aria-label={ar ? "مسار الصفحة" : "Breadcrumb"}
              className={styles.breadcrumb}
            >
              <Link href={`/${locale}`}>{ar ? "الرئيسية" : "Home"}</Link>
              <span aria-hidden="true">‹</span>
              <Link href={`/${locale}/#brands`}>
                {ar ? "الماركات" : "Car makes"}
              </Link>
              <span aria-hidden="true">‹</span>
              <span aria-current="page">{ar ? brand.ar : brand.name}</span>
            </nav>
            <h1>
              {ar ? (
                <>
                  قطع غيار {brand.ar} الأصلية و
                  <span className={styles.aftermarket} dir="ltr">
                    After Market
                  </span>
                </>
              ) : (
                `${brand.name} Original & After Market parts`
              )}
            </h1>
            <p>
              {ar
                ? "اختر موديل سيارتك وسنة الصنع لعرض قطع الغيار المناسبة."
                : "Choose your model and year to find the right spare parts."}
            </p>
          </div>
        </div>
      </section>
      <div className={`shell ${styles.content}`}>
        <ModelYearCards
          locale={locale}
          brand={brand}
          models={models}
          initialQuery={query}
          initialSort={sort}
        />
      </div>
    </div>
  );
}
