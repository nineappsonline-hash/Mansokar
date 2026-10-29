import { PurchaseButtons } from "./purchase-buttons";
import Link from "next/link";
import { ArrowUpRight, Tag, Package, CarFront } from "lucide-react";
import {
  fitmentLabel,
  money,
  type Locale,
  type Product,
  type Vehicle,
} from "@/lib/catalog";
import { partArt } from "@/lib/visuals";
import { t } from "@/lib/i18n";
import { productImages } from "@/lib/db";
import { Reveal } from "./motion-primitives";

export async function SpecialOffers({
  products,
  locale,
  vehicle,
  fitments,
}: {
  products: Product[];
  locale: Locale;
  vehicle?: Vehicle;
  fitments: Record<string, boolean>;
}) {
  const w = t(locale);
  const offers = products
    .filter(
      (p) =>
        p.status === "published" &&
        p.orderable &&
        p.price > 0 &&
        p.sale !== null &&
        p.sale >= 0 &&
        p.sale < p.price &&
        (!vehicle || fitments[p.id]),
    )
    .slice(0, 4);
  const offerCards = await Promise.all(
    offers.map(async (product) => {
      let media;
      try {
        media = (await productImages(product.id))?.[0] ?? undefined;
      } catch {
        /* Unavailable media must not hide the offer. */
      }
      return { product, media };
    }),
  );
  const offersHref = `/${locale}/offers${vehicle ? `?vehicle=${encodeURIComponent(vehicle.id)}` : ""}`;
  return (
    <section
      id="special-offers"
      className="shell section special-offers"
      aria-labelledby="special-offers-heading"
    >
      <Reveal>
        <div className="special-offers-heading">
          <div>
            <span className="eyebrow">
              <Tag size={16} aria-hidden="true" />
              {w.offersEyebrow}
            </span>
            <h2 id="special-offers-heading">{w.specialOffers}</h2>
            <p>{w.offersIntro}</p>
          </div>
          <Link href={offersHref} className="button secondary">
            {w.viewAllOffers}
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
      {offers.length ? (
        <div
          className={`offer-grid${offers.length === 1 ? " offer-grid-single" : ""}`}
        >
          {offerCards.map(({ product, media }, index) => {
            const sale = product.sale!;
            const saving = product.price - sale;
            const percentage = new Intl.NumberFormat(
              locale === "ar" ? "ar-EG" : "en",
              { style: "percent", maximumFractionDigits: 0 },
            ).format(saving / product.price);
            return (
              <Reveal key={product.id} delay={index * 0.08}>
                <article className="offer-card">
                  <Link
                    className="offer-media"
                    href={`/${locale}/products/${product.slug}`}
                    aria-label={`${w.view}: ${product.name[locale]}`}
                    data-analytics="select_item"
                    data-productid={product.id}
                  >
                    {media ? (
                      <img
                        src={media.url}
                        alt={media.alt[locale]}
                        loading="lazy"
                      />
                    ) : product.demo ? (
                      <img
                        src={partArt(product.category)}
                        alt={
                          locale === "ar"
                            ? "رسم توضيحي لمنتج تجريبي"
                            : "Demo product illustration"
                        }
                        loading="lazy"
                      />
                    ) : (
                      <div className="offer-image-placeholder">
                        <Package size={80} strokeWidth={1} />
                        <span>{w.view}</span>
                      </div>
                    )}
                    <span className="offer-percentage">
                      <bdi>−{percentage}</bdi>
                    </span>
                    {product.demo && (
                      <span className="offer-demo-label">{w.demoProduct}</span>
                    )}
                  </Link>
                  <div className="offer-details">
                    <span className="eyebrow muted">
                      {product.manufacturer} ·{" "}
                      {product.type === "oem" ? "Original" : "After Market"}
                    </span>
                    <h3>
                      <Link href={`/${locale}/products/${product.slug}`}>
                        {product.name[locale]}
                      </Link>
                    </h3>
                    <p className="offer-fitment">
                      <CarFront size={18} aria-hidden="true" />
                      {fitmentLabel(vehicle, !!fitments[product.id], locale)}
                    </p>
                    <div className="offer-prices">
                      <strong>{money(sale, locale)}</strong>
                      <del>{money(product.price, locale)}</del>
                    </div>
                    <p className="offer-saving">
                      <Tag size={16} aria-hidden="true" />
                      {w.save} <strong>{money(saving, locale)}</strong>
                    </p>
                    <PurchaseButtons
                      product={{
                        id: product.id,
                        name: product.name,
                        orderable: product.orderable,
                      }}
                      locale={locale}
                    />
                    <Link
                      className="product-details-link"
                      href={`/${locale}/products/${product.slug}`}
                    >
                      {w.view}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="offers-empty">
          <Tag size={30} aria-hidden="true" />
          <p>{vehicle ? w.noVehicleOffers : w.noSpecialOffers}</p>
          <Link
            className="text-link"
            href={vehicle ? `/${locale}#brands` : `/${locale}/catalog`}
          >
            {vehicle ? w.explore : w.catalog}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
