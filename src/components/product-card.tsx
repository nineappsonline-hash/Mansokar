import {
  productCardVehicles,
  type CardCarCatalog,
} from "@/lib/product-card-vehicles";
import styles from "./product-card.module.css";
import { FavoriteButton } from "./favorite-button";
import Link from "next/link";
import { BadgeCheck, CarFront } from "lucide-react";
import { vehicleBrandLogo } from "@/lib/vehicle-brand-logo";
import { productImages } from "@/lib/db";
import { partArt } from "@/lib/visuals";
import {
  fitmentLabel,
  money,
  type Locale,
  type Product,
  type Vehicle,
} from "@/lib/catalog";
import { PurchaseButtons } from "./purchase-buttons";
import { t } from "@/lib/i18n";
import {
  carContext,
  publicProduct,
  productContextHref,
  type CarContext,
} from "@/lib/public-product";
export async function ProductCard({
  product: raw,
  locale,
  vehicle,
  confirmed,
  context,
  contextMatched = false,
  cover,
  mediaResolved = false,
  carCatalog,
  headingLevel = 3,
}: {
  product: Product;
  carCatalog: CardCarCatalog;
  locale: Locale;
  vehicle?: Vehicle;
  confirmed?: boolean;
  context?: CarContext;
  contextMatched?: boolean;
  cover?: { url: string; alt: { ar: string; en: string } };
  mediaResolved?: boolean;
  headingLevel?: 2 | 3;
}) {
  const p = publicProduct(raw, context, contextMatched || confirmed);
  const origin = p.specs.country_of_origin;
  const vehicleContext =
    context ??
    (vehicle
      ? carContext(
          { make: vehicle.brand, model: vehicle.model, year: vehicle.year },
          carCatalog.models,
          carCatalog.brands,
        )
      : undefined);
  const vehicleRows = productCardVehicles(
    raw,
    carCatalog,
    locale,
    vehicleContext,
    contextMatched || !!confirmed,
  );
  const href = productContextHref(
    locale,
    p.slug,
    context && p.name.en !== raw.name.en ? context : undefined,
  );
  let media;
  try {
    media = mediaResolved ? cover : (cover ?? (await productImages(p.id))?.[0] ?? undefined);
  } catch {
    /* A missing photo does not conceal the product. */
  }
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const w = t(locale);
  const fitment = vehicle ? fitmentLabel(vehicle, !!confirmed, locale) : "";
  const photo =
    media?.url ??
    (p.demo ? partArt(p.category) : "/images/part-placeholder.svg");
  const photoAlt =
    media?.alt[locale] ??
    (p.demo
      ? locale === "ar"
        ? "رسم توضيحي لمنتج تجريبي"
        : "Demo product illustration"
      : locale === "ar"
        ? "صورة توضيحية عامة؛ صورة المنتج غير متاحة"
        : "Generic placeholder; product photo unavailable");
  return (
    <article
      className={`product-card premium-product-card ${styles.card}`}
      aria-label={p.name[locale]}
    >
      <FavoriteButton id={p.id} locale={locale} />
      <Link
        href={href}
        className={`product-art ${styles.photo}`}
        data-analytics="select_item"
        data-productid={p.id}
      >
        <img
          src={photo}
          alt={photoAlt}
          loading="lazy"
          decoding="async"
          width={320}
          height={240}
          className="product-card-image"
        />
        {p.demo && <span className={styles.demo}>{w.demoProduct}</span>}
        {p.sale !== null && p.price > 0 && (
          <b className={styles.discount}>
            −
            {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en", {
              style: "percent",
              maximumFractionDigits: 0,
            }).format((p.price - p.sale) / p.price)}
          </b>
        )}
      </Link>
      <div className={styles.details}>
        <div className={styles.identity}>
          <strong dir="auto">{p.manufacturer}</strong>
          {p.type === "oem" ? (
            <span className={styles.original}>
              <BadgeCheck size={13} aria-hidden="true" />
              {locale === "ar" ? "أصلي" : "Original"}
            </span>
          ) : (
            <span>{locale === "ar" ? "بديل" : "Aftermarket"}</span>
          )}
          {origin && (
            <span className={styles.origin} dir="auto">
              {origin}
            </span>
          )}
        </div>
        <Heading className={styles.title}>
          <Link href={href} data-analytics="select_item" data-productid={p.id}>
            {p.name[locale]}
          </Link>
        </Heading>
        <div className={styles.partNumber}>
          <span>{locale === "ar" ? "رقم القطعة" : "Part no."}</span>
          <bdi dir="ltr">{p.partNumber}</bdi>
        </div>
        {vehicleRows.length > 0 ? (
          <div
            className={styles.vehicles}
            aria-label={
              locale === "ar" ? "العربيات المتوافقة" : "Vehicle applications"
            }
          >
            <div className={styles.vehicleApplications}>
              {vehicleRows.slice(0, 1).map((row) => {
                const model = carCatalog.models.find(
                  (item) => item.id === row.id,
                );
                const make = carCatalog.brands.find(
                  (item) => item.slug === model?.brand,
                );
                const logo = vehicleBrandLogo(make?.slug);
                return (
                  <div key={row.id} className={styles.vehicleApplication}>
                    <span className={styles.vehicleMark} aria-hidden="true">
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                          width={26}
                          height={26}
                          loading="lazy"
                        />
                      ) : (
                        <CarFront size={23} />
                      )}
                    </span>
                    <div className={styles.vehicleName}>
                      {make && (
                        <span>{locale === "ar" ? make.ar : make.name}</span>
                      )}
                      <strong>{model?.name[locale] ?? row.name}</strong>
                    </div>
                    {row.years && (
                      <bdi className={styles.vehicleYears} dir="ltr">
                        {row.years}
                      </bdi>
                    )}
                  </div>
                );
              })}
              {vehicleRows.length > 1 && (
                <Link className={styles.more} href={href}>
                  {locale === "ar"
                    ? `+${vehicleRows.length - 1} موديلات أخرى`
                    : `+${vehicleRows.length - 1} more models`}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <p className={styles.unlisted}>
            {locale === "ar"
              ? "راجع توافق القطعة قبل الطلب"
              : "Check vehicle compatibility before ordering"}
          </p>
        )}
        {fitment && <p className={styles.fitment}>{fitment}</p>}
      </div>
      <div className={styles.footer}>
        <div className={styles.price}>
          <span>{money(p.sale ?? p.price, locale)}</span>
          {p.sale !== null && <del>{money(p.price, locale)}</del>}
        </div>
        <PurchaseButtons
          product={{ id: p.id, orderable: p.orderable }}
          label={p.name[locale]}
          locale={locale}
          vehicle={
            vehicle
              ? {
                  make: vehicle.brand,
                  model: vehicle.model,
                  year: vehicle.year,
                }
              : context
                ? {
                    make: context.make,
                    model: context.model,
                    year: context.year,
                  }
                : undefined
          }
        />
      </div>
    </article>
  );
}
