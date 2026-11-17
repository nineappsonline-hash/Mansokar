import "./mopc-home-2026.css";
import { productImages } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CarFront, Search } from "lucide-react";
import type { Locale, Product, Text, Vehicle } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { BenefitsBanner, PaymentBanner } from "./storefront-banners";
import { HomeVehicleFinder } from "./home-vehicle-finder";
import { HeroSlideshow, type HeroSlide } from "./hero-slideshow";

export async function CyanHome({
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
  const candidates = await Promise.all(
    products.map(async (product) => ({
      product,
      media: (await productImages(product.id).catch(() => []))[0],
    })),
  );
  const featured = [
    ...candidates.filter((p) => p.media),
    ...candidates.filter((p) => !p.media),
  ].slice(0, 4);

  return (
    <div className="cyan-home">
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
              <p className="mopc-v2-hero-description">
                {heroIntro?.trim() ||
                  (ar
                    ? "قطع غيار لعربيتك، بتفاصيل واضحة واختيار أسهل. ابحث برقم القطعة أو اختار عربيتك."
                    : "Parts for your car, with clear details and a simpler choice. Search by part number or select your vehicle.")}
              </p>
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
                brands={brands}
                models={models}
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
          {orderedBrands.map((b) => (
            <Link
              className={`cyan-brand-tile cyan-brand-${b.slug}`}
              href={`/${locale}/brands/${b.slug}`}
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
                sizes="(max-width:640px) 80vw, 20vw"
              />
              <span className="cyan-brand-logo">
                {b.logo || order.includes(b.slug) ? (
                  <img
                    src={
                      b.logo ||
                      (b.slug === "chevrolet"
                        ? "/images/brands/chevrolet.png"
                        : b.slug === "citroen"
                          ? "/images/brands/citroen-2022.svg"
                          : `/images/brands/${b.slug}.svg`)
                    }
                    alt={b.name}
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
      <section className="cyan-featured shell">
        <div className="section-heading">
          <h2 className="cyan-section-title">
            {ar ? "منتجات مميزة" : "Featured products"}
          </h2>
          <Link className="cyan-all-products" href={`/${locale}/catalog`}>
            {ar ? "عرض كل المنتجات" : "View all products"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {featured.map(({ product: p, media }) => (
            <ProductCard
              key={p.id}
              product={p}
              carCatalog={{ brands, models }}
              cover={media}
              locale={locale}
              vehicle={vehicle}
              confirmed={fitments[p.id]}
            />
          ))}
        </div>
      </section>
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
