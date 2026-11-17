import {
  productCardVehicles,
  type CardCarCatalog,
} from "@/lib/product-card-vehicles";
import styles from "./product-card.module.css";
import { FavoriteButton } from "./favorites";
import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
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
import { OriginalBadge } from "./original-badge";
import { VehicleBadge } from "./vehicle-badge";
export async function ProductCard({
  product: raw,
  locale,
  vehicle,
  confirmed,
  context,
  contextMatched = false,
  cover,
  carCatalog,
}: {
  product: Product;
  carCatalog: CardCarCatalog;
  locale: Locale;
  vehicle?: Vehicle;
  confirmed?: boolean;
  context?: CarContext;
  contextMatched?: boolean;
  cover?: { url: string; alt: { ar: string; en: string } };
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
    media = cover ?? (await productImages(p.id))?.[0] ?? undefined;
  } catch {
    /* A missing photo does not conceal the product. */
  }
  const w = t(locale);
  return (
    <article
      className={`product-card product-card-animate premium-product-card ${styles.card} ${styles.referenceCard}`}
      aria-label={p.name[locale]}
    >
      <FavoriteButton id={p.id} locale={locale} />
      <Link
        href={href}
        className="product-art"
        data-analytics="select_item"
        data-productid={p.id}
      >
        {media ? (
          <img
            src={media.url}
            alt={media.alt[locale]}
            loading="lazy"
            className="product-card-image"
          />
        ) : p.demo ? (
          <img
            src={partArt(p.category)}
            alt={
              locale === "ar"
                ? "رسم توضيحي لمنتج تجريبي"
                : "Demo product illustration"
            }
            loading="lazy"
            className="product-card-image"
          />
        ) : (
          <img
            src="/images/part-placeholder.svg"
            alt={
              locale === "ar"
                ? "صورة توضيحية عامة؛ صورة المنتج غير متاحة"
                : "Generic placeholder; product photo unavailable"
            }
            loading="lazy"
            className="product-card-image"
          />
        )}
        {p.demo && <span>{w.demoProduct}</span>}
        {p.sale !== null && p.price > 0 && (
          <b>
            −
            {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en", {
              style: "percent",
              maximumFractionDigits: 0,
            }).format((p.price - p.sale) / p.price)}
          </b>
        )}
      </Link>
      <div className={`product-card-part-below-image ${styles.partNumber}`}>
        <span>{locale === "ar" ? "رقم القطعة" : "Part number"}</span>
        <bdi dir="ltr">{p.partNumber}</bdi>
      </div>
      <div className="product-info">
        <div className="product-card-badge-row">
          {p.type === "oem" && <OriginalBadge locale={locale} />}
          <div className="product-meta">
            <strong
              className="product-brand"
              dir="auto"
              aria-label={`${locale === "ar" ? "الماركة" : "Brand"}: ${p.manufacturer}`}
            >
              {p.manufacturer}
            </strong>
            {origin && (
              <span className="product-origin" dir="auto">
                <Globe2 size={14} aria-hidden="true" />
                {origin}
              </span>
            )}
          </div>
        </div>
        {p.type !== "oem" && (
          <span className="eyebrow muted">After Market</span>
        )}
        <h3>
          <Link
            className="card-navigation-link"
            data-analytics="select_item"
            data-productid={p.id}
            href={href}
          >
            {p.name[locale]}
          </Link>
        </h3>
        {vehicleRows.length > 0 ? (
          <div
            className={styles.vehicles}
            aria-label={
              locale === "ar" ? "العربيات المتوافقة" : "Vehicle applications"
            }
          >
            {vehicleRows.slice(0, 2).map((row) => {
              const model = carCatalog.models.find((m) => m.id === row.id);
              const brand = carCatalog.brands.find(
                (b) => b.slug === model?.brand,
              );
              return (
                <VehicleBadge
                  key={row.id}
                  locale={locale}
                  make={
                    brand
                      ? locale === "ar"
                        ? brand.ar
                        : brand.name
                      : undefined
                  }
                  model={model?.name[locale] ?? row.name}
                  years={row.years}
                  brand={brand?.slug}
                />
              );
            })}
            {vehicleRows.length > 2 && (
              <Link className={styles.more} href={href}>
                {locale === "ar"
                  ? `+ ${vehicleRows.length - 2} موديلات أخرى`
                  : `+ ${vehicleRows.length - 2} more models`}
              </Link>
            )}
          </div>
        ) : (
          <div className="product-card-fitment-unlisted">
            {locale === "ar"
              ? "لم يتم تحديد الماركة والموديل والسنوات لهذا المنتج بعد"
              : "Make, model and years have not been specified for this product"}
          </div>
        )}

        <p className="small muted">
          {fitmentLabel(vehicle, !!confirmed, locale)}
        </p>
        <div className="product-price">
          <span>{money(p.sale ?? p.price, locale)}</span>
          {p.sale !== null && <del>{money(p.price, locale)}</del>}
        </div>
        <PurchaseButtons
          compact
          product={{ id: p.id, name: p.name, orderable: p.orderable }}
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
        <Link className="product-details-link" href={href}>
          {w.view}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
