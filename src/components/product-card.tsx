import Link from "next/link";
import { ArrowUpRight, Globe2, Package } from "lucide-react";
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
  publicProduct,
  productContextHref,
  type CarContext,
} from "@/lib/public-product";
import { OriginalBadge } from "./original-badge";
export async function ProductCard({
  product: raw,
  locale,
  vehicle,
  confirmed,
  context,
  contextMatched = false,
}: {
  product: Product;
  locale: Locale;
  vehicle?: Vehicle;
  confirmed?: boolean;
  context?: CarContext;
  contextMatched?: boolean;
}) {
  const p = publicProduct(raw, context, contextMatched || confirmed);
  const origin = p.specs.country_of_origin;
  const href = productContextHref(
    locale,
    p.slug,
    context && p.name.en !== raw.name.en ? context : undefined,
  );
  let media;
  try {
    media = (await productImages(p.id))?.[0] ?? undefined;
  } catch {
    /* A missing photo does not conceal the product. */
  }
  const w = t(locale);
  return (
    <article className="product-card product-card-animate" aria-label={p.name[locale]}>
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
          <div className="offer-image-placeholder">
            <Package size={70} aria-hidden="true" />
            <span>
              {locale === "ar"
                ? "صورة المنتج غير متاحة"
                : "Product photo unavailable"}
            </span>
          </div>
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
      <div className="product-info">
        {p.type === "oem" && <OriginalBadge locale={locale} />}
        <div className="product-meta">
          <strong className="product-brand">{p.manufacturer}</strong>
          {origin && (
            <span className="product-origin" dir="auto">
              <Globe2 size={14} aria-hidden="true" />
              {origin}
            </span>
          )}
        </div>
        {p.type !== "oem" && (
          <span className="eyebrow muted">
            {locale === "ar" ? "بديل" : "After Market"}
          </span>
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
        <span className="small muted" dir="ltr">
          {p.partNumber}
        </span>
        <p className="small muted">
          {fitmentLabel(vehicle, !!confirmed, locale)}
        </p>
        <div className="product-price">
          <span>{money(p.sale ?? p.price, locale)}</span>
          {p.sale !== null && <del>{money(p.price, locale)}</del>}
        </div>
        <PurchaseButtons
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
