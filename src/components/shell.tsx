import { SearchBox } from "./search";
import { CartCount } from "./favorites";
import { Newsletter } from "./newsletter";
import cyan from "./cyan-storefront.module.css";
import { siteMedia, storefrontSettings } from "@/lib/db";
import { BrandLogo } from "./brand-logo";
import { Analytics } from "./analytics";
import Link from "next/link";
import {
  ShoppingCart,
  UserRound,
  ArrowUpRight,
  CarFront,
  Menu,
  Search,
  Heart,
  Home,
  ChevronDown,
  Tags,
} from "lucide-react";
import { Language, VehicleSync, CartSync, ClearVehicle } from "./controls";
import type { Locale, Vehicle } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import styles from "./storefront.module.css";
export async function Shell({
  locale,
  vehicle,
  children,
  home = false,
  navBrands = [],
}: {
  locale: Locale;
  vehicle?: Vehicle;
  children: React.ReactNode;
  home?: boolean;
  navBrands?: { slug: string; name: string; ar: string }[];
}) {
  const w = t(locale);
  const [settings, media] = await Promise.all([
    storefrontSettings(),
    siteMedia(["logo"]),
  ]);
  return (
    <div
      className={`${styles.store} ${cyan.theme} mopc-cyan${home ? " storefront-home" : ""}`}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <VehicleSync id={vehicle?.id} />
      <CartSync />
      <Analytics
        locale={locale}
        enabled={process.env.ANALYTICS_ENABLED === "true"}
      />
      <a href="#main" className="skip">
        {locale === "ar" ? "انتقل للمحتوى" : "Skip to content"}
      </a>
      <header className="header">
        <div className="shell header-inner">
          <Link
            href={`/${locale}`}
            className="logo"
            aria-label={
              (settings.storeName?.[locale] ??
                (locale === "ar" ? "موبِك" : "MOPC")) +
              (locale === "ar" ? " الرئيسية" : " home")
            }
          >
            <BrandLogo
              className="store-logo-image"
              src={media.logo?.url || "/images/mopc/logo-dark.png"}
              alt={locale === "ar" ? "موبِك — قطع غيار السيارات" : "MOPC"}
            />
            {locale === "ar" && (
              <span className="store-name-ar" lang="ar">
                {settings.storeName?.ar?.replace(/^موبك$/, "موبِك") || "موبِك"}
              </span>
            )}
          </Link>
          <div className="header-search-box">
            <SearchBox locale={locale} />
          </div>
          <div className="header-tools">
            <Link
              href={`/${locale}/cart`}
              className="header-tool"
              aria-label={w.cart}
            >
              <span>
                <ShoppingCart size={29} />
                <CartCount />
              </span>
              <b>{locale === "ar" ? "السلة" : "Cart"}</b>
            </Link>
            <Link
              href={`/${locale}/favorites`}
              className="header-tool"
              aria-label={locale === "ar" ? "المفضلة" : "Favorites"}
            >
              <Heart size={29} />
              <b>{locale === "ar" ? "المفضلة" : "Favorites"}</b>
            </Link>
            <Link
              href={`/${locale}/account`}
              className="header-tool"
              aria-label={w.account}
            >
              <UserRound size={29} />
              <b>{locale === "ar" ? "حسابي" : "Account"}</b>
            </Link>
            <Language locale={locale} />
            <details className="mobile-menu">
              <summary aria-label={locale === "ar" ? "القائمة" : "Menu"}>
                <Menu size={22} />
              </summary>
              <nav>
                <Link href={`/${locale}/catalog`}>{w.catalog}</Link>
                <Link href={`/${locale}/offers`}>{w.offers}</Link>
                <Link href={`/${locale}/guides`}>{w.guides}</Link>
              </nav>
            </details>
          </div>
        </div>
        <div className="cyan-subnav">
          <nav
            className="shell"
            aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
          >
            <Link className={home ? "nav-active" : ""} href={`/${locale}`}>
              <Home size={22} />
              {locale === "ar" ? "الرئيسية" : "Home"}
            </Link>
            <details className="brand-nav-menu">
              <summary>
                {locale === "ar" ? "تصفح حسب الماركة" : "Shop by make"}
                <ChevronDown size={19} />
              </summary>
              <div>
                {navBrands.map((b) => (
                  <Link key={b.slug} href={`/${locale}/brands/${b.slug}`}>
                    {locale === "ar" ? b.ar : b.name}
                  </Link>
                ))}
              </div>
            </details>
            <Link href={`/${locale}/offers`}>
              <Tags size={22} />
              {w.offers}
            </Link>
            <Link href={`/${locale}/garage`}>
              <CarFront size={22} />
              {w.garage}
            </Link>
            <Link className="cyan-nav-catalog" href={`/${locale}/catalog`}>
              {w.catalog}
            </Link>
          </nav>
        </div>
      </header>
      {vehicle && (
        <div className="vehicle-bar shell">
          <CarFront size={16} /> {w.selected}: {vehicle.name[locale]}{" "}
          <ClearVehicle locale={locale} />{" "}
          <Link href={`/${locale}#brands`}>
            {locale === "ar" ? "تغيير" : "Change"}
          </Link>
        </div>
      )}
      <main id="main">{children}</main>
      <footer className="footer">
        <div className="cyan-newsletter">
          <div className="shell cyan-newsletter-inner">
            <BrandLogo
              className="newsletter-logo"
              src={media.logo?.url || "/images/mopc/logo-dark.png"}
              alt="MOPC · موبِك"
            />
            <Newsletter locale={locale} />
          </div>
        </div>
        <div className="shell footer-grid">
          <div>
            <Link className="logo" href={`/${locale}`}>
              <BrandLogo
                className="store-logo-image"
                src={media.logo?.url || "/images/mopc/logo-dark.png"}
                alt={locale === "ar" ? "موبِك — قطع غيار السيارات" : "MOPC"}
              />
              {locale === "ar" && (
                <span className="store-name-ar" lang="ar">
                  {settings.storeName?.ar?.replace(/^موبك$/, "موبِك") ||
                    "موبِك"}
                </span>
              )}
            </Link>
            <p>{w.footer}</p>
            {settings.contact?.[locale] && (
              <p className="prose">{settings.contact[locale]}</p>
            )}
          </div>
          <div>
            <h3>{w.catalog}</h3>
            {["catalog", "compare", "garage", "request-part"].map((x, i) => (
              <Link key={x} href={`/${locale}/${x}`}>
                {[w.catalog, w.compare, w.garage, w.request][i]}
              </Link>
            ))}
          </div>
          <div>
            <h3>{locale === "ar" ? "المساعدة" : "Help & information"}</h3>
            {[
              "about",
              "contact",
              "faq",
              "site-map",
              "installments",
              "credits",
            ].map((x) => (
              <Link key={x} href={`/${locale}/${x}`}>
                {locale === "ar"
                  ? {
                      about: "من نحن",
                      contact: "تواصل معنا",
                      faq: "أسئلة شائعة",
                      "site-map": "خريطة الموقع",
                      installments: "الكروت والتقسيط",
                      credits: "مصادر الصور",
                    }[x]
                  : {
                      about: "About us",
                      contact: "Contact us",
                      faq: "FAQs",
                      "site-map": "Site map",
                      installments: "Cards & installments",
                      credits: "Image credits",
                    }[x]}
              </Link>
            ))}
          </div>
          <div>
            <h3>{locale === "ar" ? "السياسات" : "Policies"}</h3>
            {["privacy", "terms", "shipping", "returns", "warranty"].map(
              (x) => (
                <Link key={x} href={`/${locale}/policies/${x}`}>
                  {locale === "ar"
                    ? {
                        privacy: "الخصوصية",
                        terms: "الشروط",
                        shipping: "الشحن",
                        returns: "الإرجاع",
                        warranty: "الضمان",
                      }[x]
                    : x}
                </Link>
              ),
            )}
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>
            © {new Date().getFullYear()} {locale === "ar" ? "موبِك" : "MOPC"}
          </span>
          <span>OPEL　/　MG　/　CHEVROLET　/　PEUGEOT　/　CITROËN</span>
        </div>
      </footer>
    </div>
  );
}
