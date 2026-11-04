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
}: {
  locale: Locale;
  brands: {
    slug: string;
    name: string;
    ar: string;
    photo?: string;
    logo?: string;
  }[];
  models: { brand: string; slug: string; name: Text; years: number[] }[];
  products: Product[];
  vehicle?: Vehicle;
  fitments: Record<string, boolean>;
  slides: HeroSlide[];
  cardPayments: boolean;
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
      text: ar ? "قطع أصلية وماركات موثوقة" : "Original parts & trusted brands",
    },
    {
      icon: CarFront,
      text: ar ? "توافق دقيق مع عربيتك" : "Find the right fit for your car",
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
        <HeroSlideshow slides={slides} locale={locale} autoplay={false}>
          <div className="shell cyan-hero-content">
            <div className="cyan-hero-copy">
              <h1>
                <span>
                  {ar ? "قطع غيار عربيتك…" : "The right parts for your car…"}
                </span>
                <em>{ar ? "من غير تدوير." : "Without the runaround."}</em>
              </h1>
              <p>
                {ar
                  ? "اختار عربيتك، واعرف قطع الغيار المناسبة ليها، وقارن الأسعار واطلب بكل سهولة."
                  : "Choose your car, find the parts that fit, compare prices and order with confidence."}
              </p>
            </div>
            <HomeVehicleFinder
              locale={locale}
              brands={brands}
              models={models}
            />
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
              cover={media}
              locale={locale}
              vehicle={vehicle}
              confirmed={fitments[p.id]}
            />
          ))}
        </div>
      </section>
      <section className="shell">
        <div className="cyan-part-banner">
          <div className="cyan-part-banner-copy">
            <h2>
              {ar
                ? "مش لاقي القطعة اللي محتاجها؟"
                : "Can’t find the part you need?"}
            </h2>
            <div>
              <p>
                {ar
                  ? "ابعتلنا بياناتها ونساعدك تلاقي القطعة المناسبة"
                  : "Send us the details and we’ll help you find the right part."}
              </p>
              <Link
                className="button cyan-button"
                href={`/${locale}/request-part`}
              >
                {ar ? "طلب قطعة الآن" : "Request a part"}
                <Send size={22} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="shell cyan-why">
        <h2 className="cyan-section-title">
          {ar ? "لماذا تختار MOPC؟" : "Why choose MOPC?"}
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
