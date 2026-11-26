// Only storefront routes need the storefront overrides; preserve cascade order.
import "./mopc-premium-v2.css";
import "./mopc-showroom.css";
import { MobileNavigation } from "./mobile-navigation";
import responsive from "./shell-responsive.module.css";
import { SearchBox } from "./search";
import { CartCount } from "./cart-count";
import { Newsletter } from "./newsletter";
import { LazyChatWidget } from "./lazy-chat-widget";
import cyan from "./cyan-storefront.module.css";
import { configured, siteMedia, storefrontSettings } from "@/lib/db";
import { BrandLogo } from "./brand-logo";
import { Analytics } from "./analytics";
import Link from "next/link";
import {
  ShoppingCart,
  UserRound,
  ArrowUpRight,
  CarFront,
  Heart,
  Home,
  ChevronDown,
  Tags,
} from "lucide-react";
import { Language, VehicleSync, CartSync, ClearVehicle } from "./shell-client-controls";
import type { Locale, Vehicle } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import styles from "./storefront.module.css";
export async function Shell({
  locale,
  vehicle,
  children,
  home = false,
  navBrands = [],
  shellData,
}: {
  locale: Locale;
  vehicle?: Vehicle;
  children: React.ReactNode;
  home?: boolean;
  navBrands?: { slug: string; name: string; ar: string }[];
  shellData?: Promise<[
    Awaited<ReturnType<typeof storefrontSettings>>,
    Awaited<ReturnType<typeof siteMedia>>,
  ]>;
}) {
  const w = t(locale);
  // Reuse the request started by the route so the shared header and footer
  // don't introduce a fresh database/storage waterfall after page rendering.
  const [settings, media] = await (shellData ?? Promise.all([
    storefrontSettings(),
    siteMedia(["logo"]),
  ]));
  return (
    <div
      className={`${styles.store} ${cyan.theme} mopc-cyan${home ? " storefront-home" : ""}`}
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <VehicleSync id={vehicle?.id} />
      <CartSync />
      {process.env.ANALYTICS_ENABLED === "true" && (
        <Analytics locale={locale} enabled />
      )}
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
                (locale === "ar" ? "MOPC" : "MOPC")) +
              (locale === "ar" ? " الرئيسية" : " home")
            }
          >
            <BrandLogo
              className="store-logo-image"
              src={media.logo?.url || "/images/mopc/logo-dark.png"}
              alt={locale === "ar" ? "MOPC — قطع غيار العربيات" : "MOPC"}
            />
            {locale === "ar" && (
              <span className="store-name-ar" lang="ar">
                {"موبِك"}
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
            <MobileNavigation locale={locale} brands={navBrands} />
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
      <footer className={`footer ${responsive.footer}`}>
        <div className="cyan-newsletter">
          <div className="shell cyan-newsletter-inner">
            <BrandLogo
              className="newsletter-logo"
              src={media.logo?.url || "/images/mopc/logo-dark.png"}
              alt="MOPC"
            />
            <Newsletter locale={locale} />
          </div>
        </div>
        <div className="shell footer-grid">
          <div className={responsive.branding}>
            <Link className="logo" href={`/${locale}`}>
              <BrandLogo
                className="store-logo-image"
                src={media.logo?.url || "/images/mopc/logo-dark.png"}
                alt={locale === "ar" ? "MOPC — قطع غيار العربيات" : "MOPC"}
              />
              {locale === "ar" && (
                <span className="store-name-ar" lang="ar">
                  {"موبِك"}
                </span>
              )}
            </Link>
            <p>{w.footer}</p>
            {settings.contact?.[locale] && (
              <p className="prose">{settings.contact[locale]}</p>
            )}
          </div>
          <FooterGroup
            title={w.catalog}
            links={[
              [w.catalog, `/${locale}/catalog`],
              [w.compare, `/${locale}/compare`],
              [w.garage, `/${locale}/garage`],
              [w.request, `/${locale}/request-part`],
            ]}
          />
          <FooterGroup
            title={locale === "ar" ? "المساعدة" : "Help & information"}
            links={[
              [locale === "ar" ? "من نحن" : "About us", `/${locale}/about`],
              [
                locale === "ar" ? "تواصل معنا" : "Contact us",
                `/${locale}/contact`,
              ],
              [locale === "ar" ? "أسئلة شائعة" : "FAQs", `/${locale}/faq`],
              [locale === "ar" ? "أدلة شراء قطع الغيار" : "Buying guides", `/${locale}/guides`],
              [
                locale === "ar" ? "خريطة الموقع" : "Site map",
                `/${locale}/site-map`,
              ],
              [
                locale === "ar" ? "الكروت والتقسيط" : "Cards & installments",
                `/${locale}/installments`,
              ],
              [
                locale === "ar" ? "مصادر الصور" : "Image credits",
                `/${locale}/credits`,
              ],
            ]}
          />
          <FooterGroup
            title={locale === "ar" ? "السياسات" : "Policies"}
            links={[
              [
                locale === "ar" ? "الخصوصية" : "Privacy",
                `/${locale}/policies/privacy`,
              ],
              [
                locale === "ar" ? "الشروط" : "Terms",
                `/${locale}/policies/terms`,
              ],
              [
                locale === "ar" ? "الشحن" : "Shipping",
                `/${locale}/policies/shipping`,
              ],
              [
                locale === "ar" ? "الإرجاع" : "Returns",
                `/${locale}/policies/returns`,
              ],
              [
                locale === "ar" ? "الضمان" : "Warranty",
                `/${locale}/policies/warranty`,
              ],
            ]}
          />
        </div>
        <div className="shell footer-bottom">
          <span>
            © {new Date().getFullYear()} {locale === "ar" ? "MOPC" : "MOPC"}
          </span>
          <span>OPEL　/　MG　/　CHEVROLET　/　PEUGEOT　/　CITROËN</span>
        </div>
      </footer>
      <LazyChatWidget locale={locale} enabled={configured()} />
    </div>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  const content = links.map(([label, href]) => (
    <Link key={href} href={href}>
      {label}
    </Link>
  ));
  return (
    <>
      <div className={responsive.desktopGroup}>
        <h3>{title}</h3>
        {content}
      </div>
      <details className={responsive.mobileGroup}>
        <summary>
          {title}
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div>{content}</div>
      </details>
    </>
  );
}
