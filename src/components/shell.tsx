import { siteMedia, storefrontSettings } from "@/lib/db";
import { Analytics } from "./analytics";
import Link from "next/link";
import {
  ShoppingBag,
  UserRound,
  ArrowUpRight,
  CarFront,
  Menu,
  Cog,
  Search,
} from "lucide-react";
import { Language, VehicleSync, CartSync, ClearVehicle } from "./controls";
import type { Locale, Vehicle } from "@/lib/catalog";
import { t } from "@/lib/i18n";
export async function Shell({
  locale,
  vehicle,
  children,
  home = false,
}: {
  locale: Locale;
  vehicle?: Vehicle;
  children: React.ReactNode;
  home?: boolean;
}) {
  const w = t(locale);
  const [settings, media] = await Promise.all([
    storefrontSettings(),
    siteMedia(["logo"]),
  ]);
  return (
    <div
      className={home ? "storefront-home" : undefined}
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
      <div className="demo-bar">{w.demo}</div>
      <header className="header">
        <div className="shell header-inner">
          <Link
            href={`/${locale}`}
            className="logo"
            aria-label={
              (settings.storeName?.[locale] ?? "Mansokar") +
              (locale === "ar" ? " الرئيسية" : " home")
            }
          >
            {media.logo ? (
              <img
                src={media.logo.url}
                alt={media.logo.alt[locale]}
                style={{ maxWidth: 64, maxHeight: 54, objectFit: "contain" }}
              />
            ) : (
              <span className="logo-icon">
                <Cog size={43} strokeWidth={2.7} />
                <span className="logo-speedlines" />
              </span>
            )}
            {settings.storeName?.[locale] ?? (
              <>
                Drive<span>Parts</span>
              </>
            )}
            <small>MANSOKAR</small>
          </Link>
          <nav
            className="desktop-nav"
            aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
          >
            {home && (
              <Link className="nav-active" href={`/${locale}`}>
                {locale === "ar" ? "الرئيسية" : "Home"}
              </Link>
            )}
            <Link href={`/${locale}/catalog`}>
              {home ? (locale === "ar" ? "المنتجات" : "Products") : w.catalog}
            </Link>
            <Link href={`/${locale}/offers`}>{w.offers}</Link>
            <Link href={`/${locale}/guides`}>
              {home
                ? locale === "ar"
                  ? "مقالات ونصائح"
                  : "Guides & advice"
                : w.guides}
            </Link>
          </nav>
          <div className="header-tools">
            {home && (
              <a
                href="#home-search"
                className="header-search"
                aria-label={w.search}
              >
                <Search size={24} />
              </a>
            )}
            <Link href={`/${locale}/garage`} aria-label={w.garage}>
              <CarFront size={20} />
            </Link>
            <Link href={`/${locale}/account`} aria-label={w.account}>
              <UserRound size={20} />
            </Link>
            <Link href={`/${locale}/cart`} aria-label={w.cart}>
              <ShoppingBag size={22} />
              <span className="cart-indicator" aria-hidden="true" />
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
      <section className="request-strip shell">
        <div>
          <span className="eyebrow">THE EXTRA MILE</span>
          <h2>{w.request}</h2>
          <p>{w.requestCopy}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/request-part`}>
          {locale === "ar" ? "اطلب قطعة" : "Request a part"}
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <footer className="footer">
        <div className="shell footer-grid">
          <div>
            <Link className="logo" href={`/${locale}`}>
              {settings.storeName?.[locale] ?? (
                <>
                  Drive<span>Parts</span>
                </>
              )}
            </Link>
            <p>{w.footer}</p>
            {settings.contact?.[locale] && (
              <p className="prose">{settings.contact[locale]}</p>
            )}
            <p className="muted">
              Mansokar ·{" "}
              {locale === "ar"
                ? "متجر تجريبي في مصر"
                : "Demo automotive store in Egypt"}
            </p>
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
                  : x}
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
          <span>© {new Date().getFullYear()} Mansokar</span>
          <span>OPEL　/　MG　/　CHEVROLET　/　PEUGEOT　/　CITROËN</span>
        </div>
      </footer>
    </div>
  );
}
