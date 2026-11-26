import { siteOrigin } from "@/lib/site-url";
import { brandModelBuyingNotes } from "@/lib/vehicle-coverage";
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
  const buyingNotes = brandModelBuyingNotes(brand.slug, models);
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
              item: new URL(c.path, siteOrigin()).href,
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
              {ar ? `قطع غيار ${brand.ar} حسب الموديل` : `${brand.name} spare parts by model`}
            </h1>
            <p>
              {ar
                ? "اختار موديل عربيتك وسنة الصنع لعرض قطع الغيار المناسبة."
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
        {buyingNotes.length > 0 && (
          <section className="panel stack" aria-labelledby="model-buying-notes-heading">
            <h2 id="model-buying-notes-heading">
              {ar
                ? `إرشادات اختيار قطع غيار ${brand.ar} حسب الموديل`
                : `Choosing ${brand.name} parts by model`}
            </h2>
            <p>
              {ar
                ? "ملاحظات خاصة بكل موديل مسجل في كتالوجنا. راجع رقم القطعة وسنة الصنع ومواصفات العربية قبل الشراء؛ الاسم وحده مش دليل على التوافق."
                : "Model-specific guidance for registered cars. Verify the part number, model year and vehicle specifications before ordering; the model name alone does not prove fitment."}
            </p>
            <ul>
              {buyingNotes.map((model) => (
                <li key={model.slug}>
                  <Link href={`/${locale}/brands/${brand.slug}/${model.slug}`}>
                    {ar ? brand.ar : brand.name} {model.name[locale]}
                  </Link>
                  <p>{model.note[locale]}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
