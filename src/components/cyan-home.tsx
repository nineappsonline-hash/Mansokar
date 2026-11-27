import "./mopc-home-2026.css";
import { Suspense } from "react";
import { firstProductImages } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CarFront, Search } from "lucide-react";
import type { Locale, Product, Text, Vehicle } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { BenefitsBanner, PaymentBanner } from "./storefront-banners";
import { HomeVehicleFinder } from "./home-vehicle-finder";
import { HeroSlideshow, type HeroSlide } from "./hero-slideshow";

export function CyanHome({
  locale,
  brands,
  models,
  products,
  vehicle,
  fitments,
  slides,
  cardPayments,
  heroTitle,
  heroIntro,
  intervalSeconds,
  autoplay,
  campaigns,
}: {
  locale: Locale;
  brands: {
    slug: string;
    name: string;
    ar: string;
    photo?: string;
    logo?: string;
  }[];
  models: {
    id: string;
    brand: string;
    slug: string;
    name: Text;
    years: number[];
  }[];
  products: Product[];
  vehicle?: Vehicle;
  fitments: Record<string, boolean>;
  slides: HeroSlide[];
  cardPayments: boolean;
  heroTitle?: string;
  heroIntro?: string;
  intervalSeconds?: number;
  autoplay?: boolean;
  campaigns?: React.ReactNode;
}) {
  const ar = locale === "ar";
  const order = ["opel", "peugeot", "citroen", "mg", "chevrolet"];
  const orderedBrands = [...brands].sort(
    (a, b) =>
      (order.includes(a.slug) ? order.indexOf(a.slug) : 99) -
      (order.includes(b.slug) ? order.indexOf(b.slug) : 99),
  );
  return (
    <div className="cyan-home">
      {/* Loaded only for the homepage, not products/catalog/checkout/admin. */}
      <link rel="stylesheet" href="/styles/home-legacy-theme.css" precedence="default" />
      <section className="cyan-hero">
        <HeroSlideshow
          slides={slides}
          locale={locale}
          intervalSeconds={intervalSeconds}
          autoplay={autoplay}
        >
          <div className="shell cyan-hero-content">
            <div className="cyan-hero-copy">
              <h1>
                {heroTitle?.trim() ? (
                  heroTitle
                    .split("\n")
                    .map((line, i) =>
                      i === 0 ? (
                        <span key={i}>{line}</span>
                      ) : (
                        <em key={i}>{line}</em>
                      ),
                    )
                ) : (
                  <>
                    <span>{ar ? "القطعة الصح." : "The right part."}</span>
                    <em>{ar ? "من أول مرة." : "From the first time."}</em>
                  </>
                )}
              </h1>
              {!ar && (
                <p className="mopc-v2-hero-description">
                  {heroIntro?.trim() ||
                    "Parts for your car, with clear details and a simpler choice. Search by part number or select your vehicle."}
                </p>
              )}
              <div className="cyan-hero-actions">
                <a className="button cyan-hero-primary" href="#vehicle-finder">
                  {ar ? "اختار عربيتك" : "Find your car"} <CarFront size={20} />
                </a>
                <Link
                  className="cyan-hero-secondary"
                  href={`/${locale}/catalog`}
                >
                  {ar ? "ابحث عن قطعة غيار" : "Search parts"}{" "}
                  <Search size={19} />
                </Link>
              </div>
            </div>
            <div id="vehicle-finder" className="cyan-finder-region">
              <HomeVehicleFinder
                locale={locale}
                brands={brands.map((brand) => ({
                  slug: brand.slug,
                  label: ar ? brand.ar : brand.name,
                }))}
                models={models.map((model) => ({
                  brand: model.brand,
                  slug: model.slug,
                  label: model.name[locale],
                  years: model.years,
                }))}
              />
            </div>
          </div>
        </HeroSlideshow>
      </section>
      <BenefitsBanner locale={locale} cardPayments={cardPayments} />
      <section className="shell cyan-brands" id="brands">
        <h2 className="cyan-section-title">
          {ar ? "تصفح حسب الماركة" : "Shop by car make"}
        </h2>
        <div className="cyan-brand-grid">
          {orderedBrands.map((b, index) => (
            <Link
              className={`cyan-brand-tile cyan-brand-${b.slug}`}
              href={`/${locale}/brands/${b.slug}`}
              prefetch={false}
              key={b.slug}
            >
              <Image
                src={
                  b.photo ||
                  (order.includes(b.slug)
                    ? `/images/cyan/${b.slug}.webp`
                    : "/images/cyan/hero-blue.webp")
                }
                alt=""
                fill
                // Two-column mobile grid; only the final tile spans both columns.
                sizes={index === orderedBrands.length - 1
                  ? "(max-width:640px) 100vw, (max-width:1180px) 33vw, 20vw"
                  : "(max-width:640px) 50vw, (max-width:1180px) 33vw, 20vw"}
              />
              <span className="cyan-brand-logo">
                {b.logo || order.includes(b.slug) ? (
                  <Image
                    src={
                      b.logo ||
                      (b.slug === "chevrolet"
                        ? "/images/brands/chevrolet.png"
                        : b.slug === "citroen"
                          ? "/images/brands/citroen-2022.svg"
                          : `/images/brands/${b.slug}.svg`)
                    }
                    alt={b.name}
                    width={160}
                    height={72}
                    sizes="(max-width:640px) 120px, 160px"
                    loading="lazy"
                    // The uploaded merchant logo may use an unconfigured host.
                    unoptimized={Boolean(b.logo)}
                  />
                ) : (
                  <CarFront size={48} aria-hidden="true" />
                )}
                <b>{b.name.toUpperCase()}</b>
              </span>
              <span className="cyan-brand-cta">
                {ar ? "تصفح القطع" : "Shop parts"}
                <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      {campaigns}
      <Suspense fallback={<FeaturedProductsSkeleton locale={locale} />}>
        <FeaturedProducts
          locale={locale}
          products={products}
          brands={brands}
          models={models}
          vehicle={vehicle}
          fitments={fitments}
        />
      </Suspense>
      {cardPayments && <PaymentBanner locale={locale} />}
      <section
        className="shell showroom-request"
        aria-labelledby="request-heading"
      >
        <div className="showroom-request-art" aria-hidden="true">
          <Search size={64} strokeWidth={1} />
        </div>
        <div>
          <span className="showroom-eyebrow">
            {ar ? "مساعدة في اختيار القطعة" : "Expert assistance"}
          </span>
          <h2 id="request-heading">
            {ar
              ? "مش لاقي القطعة اللي محتاجها؟"
              : "Looking for a specific part?"}
          </h2>
          <p>
            {ar
              ? "ابعت بيانات عربيتك ورقم القطعة أو صورتها، وهنساعدك تلاقي الاختيار المناسب."
              : "Send your vehicle details and a part number or photo. We’ll help you find the right option."}
          </p>
        </div>
        <Link
          href={`/${locale}/request-part`}
          className="button showroom-request-button"
        >
          {ar ? "اطلب مساعدة" : "Find my part"}
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

/**
 * Product thumbnail lookup is independent of the visible hero. Keeping it
 * inside its own Suspense boundary lets React stream the hero + vehicle
 * selector before the below-fold product-media query completes.
 */
async function FeaturedProducts({
  locale, products, brands, models, vehicle, fitments,
}: {
  locale: Locale;
  products: Product[];
  brands: {slug:string;name:string;ar:string;photo?:string;logo?:string}[];
  models: {id:string;brand:string;slug:string;name:Text;years:number[]}[];
  vehicle?: Vehicle;
  fitments: Record<string, boolean>;
}) {
  const covers = await firstProductImages(products.map((product) => product.id)).catch(
    () => ({} as Awaited<ReturnType<typeof firstProductImages>>),
  );
  const candidates = products.map((product) => ({product, media: covers[product.id]}));
  const featured = [...candidates.filter((p) => p.media), ...candidates.filter((p) => !p.media)].slice(0, 4);
  const ar = locale === "ar";
  return (
    <section className="cyan-featured shell">
      <div className="section-heading">
        <h2 className="cyan-section-title">{ar ? "منتجات مميزة" : "Featured products"}</h2>
        <Link className="cyan-all-products" href={`/${locale}/catalog`}>
          {ar ? "عرض كل المنتجات" : "View all products"} <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="product-grid">
        {featured.map(({product:p,media}) => (
          <ProductCard
            key={p.id} product={p} carCatalog={{brands,models}} cover={media}
            mediaResolved locale={locale} vehicle={vehicle} confirmed={fitments[p.id]}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedProductsSkeleton({locale}: {locale: Locale}) {
  return (
    <section className="cyan-featured shell" aria-busy="true">
      <div className="section-heading">
        <h2 className="cyan-section-title">{locale === "ar" ? "منتجات مميزة" : "Featured products"}</h2>
      </div>
      <div className="product-grid" style={{minHeight:300}} />
    </section>
  );
}
