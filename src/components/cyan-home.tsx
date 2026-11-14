import { productImages } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  CarFront,
  Coins,
  Truck,
  CreditCard,
  Headset,
  Send,
  Search,
} from "lucide-react";
import type { Locale, Product, Text, Vehicle } from "@/lib/catalog";
import { ProductCard } from "./product-card";
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
  ].slice(0, 5);

  const benefits = [
    {
      icon: ShieldCheck,
      text: ar ? "قطع غيار أصلية بضمان" : "Genuine parts with warranty",
    },
    {
      icon: CarFront,
      text: ar ? "قطع مناسبة لعربيتك" : "Find the right fit for your car",
    },
    { icon: Coins, text: ar ? "أسعار واضحة" : "Clear, straightforward prices" },
    {
      icon: CreditCard,
      text: ar
        ? cardPayments
          ? "كروت وطرق دفع مرنة"
          : "إنستاباي ومحافظ إلكترونية"
        : cardPayments
          ? "Cards & flexible payments"
          : "InstaPay & mobile wallets",
    },
    { icon: Truck, text: ar ? "شحن لكل محافظات مصر" : "Delivery across Egypt" },
  ];
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
                    <span>
                      {ar
                        ? "قطع غيار أصلية لعربيتك…"
                        : "Genuine parts for your car…"}
                    </span>
                    <em>
                      {ar ? "بضمان وراحة بال." : "Warranty. Peace of mind."}
                    </em>
                  </>
                )}
              </h1>
              <div className="cyan-hero-actions">
                <a className="button cyan-hero-primary" href="#vehicle-finder">{ar ? "اختار عربيتك" : "Find your car"} <CarFront size={20} /></a>
                <Link className="cyan-hero-secondary" href={`/${locale}/catalog`}>{ar ? "ابحث عن قطعة غيار" : "Search parts"} <Search size={19} /></Link>
              </div>
            </div>
            <div id="vehicle-finder" className="cyan-finder-region"><HomeVehicleFinder
              locale={locale}
              brands={brands}
              models={models}
            /></div>
          </div>
        </HeroSlideshow>
      </section>
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
      <div className="shell">
        <div className="cyan-trust-strip">
          {benefits.map(({ icon: Icon, text }) => (
            <div key={text}>
              <Icon size={32} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      {campaigns}
      {cardPayments && (
        <section className="shell cyan-payments-banner home-promo-compact" aria-label={ar ? "طرق الدفع والتقسيط" : "Payment and installment options"}>
          <Link href={`/${locale}/installments`} aria-label={ar ? "اعرف المزيد عن طرق الدفع والتقسيط" : "Learn more about payment and installment options"}>
            <img
              src="/images/Futuristic%20Neon%20Payment%20Options.webp"
              alt={ar ? "طرق الدفع والتقسيط المتاحة: فاليو، أمان، سهولة، كونتاكت، Apple Pay، Vodafone Cash، Visa، وInstaPay" : "Available payment and installment options: valU, Aman, Souhoola, Contact, Apple Pay, Vodafone Cash, Visa and InstaPay"}
              loading="lazy"
              decoding="async"
              style={{ display: "block", width: "100%", height: "auto", borderRadius: "18px" }}
            />
          </Link>
        </section>
      )}
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
      <section className="shell cyan-request-image-banner home-promo-compact" aria-label={ar ? "اطلب قطعة غيار" : "Request an auto part"}>
        <Link href={`/${locale}/request-part`} aria-label={ar ? "اطلب قطعة غيار الآن" : "Request an auto part now"}>
          <img
            src="/images/Arabic%20Auto%20Parts%20Promo%20Banner.png"
            alt={ar ? "مش لاقي القطعة اللي محتاجها؟ ابعتلنا بياناتها وهنساعدك تلاقي القطعة المناسبة" : "Can't find the part you need? Send us the details and we'll help."}
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", height: "auto", borderRadius: "18px" }}
          />
        </Link>
      </section>
      <section className="shell cyan-why">
        <h2 className="cyan-section-title">
          {ar ? "ليه تختار موبِك؟" : "Why choose MOPC?"}
        </h2>
        <div className="cyan-benefits">
          {[
            ...benefits,
            {
              icon: Headset,
              text: ar
                ? "دعم ومتابعة بعد البيع"
                : "Support before and after your order",
            },
          ].map(({ icon: Icon, text }, i) => (
            <div className={i === 3 ? "cyan-benefit-accent" : ""} key={text}>
              <Icon size={42} strokeWidth={1.7} />
              <h3>{text}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
