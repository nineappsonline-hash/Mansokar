import { ProductText } from "@/components/product-text";
import { productSpecifications } from "@/lib/product-specifications";
import { ModelYearCards } from "@/components/model-year-cards";
import { SiteMap } from "@/components/site-map";
import { publicProduct, carContext } from "@/lib/public-product";
import { CatalogCarFilters } from "@/components/catalog-car-filters";
import { readApplications } from "@/lib/product-applications";
import { StoreQuestions } from "@/components/store-questions";
import { searchPages } from "@/lib/seo-pages";
import { ContactForm } from "@/components/contact-form";
import { coveredBrands, targetModel } from "@/lib/vehicle-coverage";
import { buyingGuides } from "@/lib/buying-guides";
import { BuyingGuide } from "@/components/buying-guide";
import { ProductAnswers } from "@/components/product-answers";
import { InstallmentsGuide } from "@/components/installments-guide";
import { productSearchCopy, productStructuredData } from "@/lib/product-seo";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { Campaigns } from "@/components/campaigns";
import { ShippingEstimate } from "@/components/shipping-estimate";
import { ProductCard as Card } from "@/components/product-card";
import { PurchaseButtons } from "@/components/purchase-buttons";
import { SpecialOffers } from "@/components/special-offers";
import { BrandCard } from "@/components/brand-card";
import { Reveal } from "@/components/motion-primitives";
import { SearchBox } from "@/components/search";
import Image from "next/image";
import { modelPhoto, partArt } from "@/lib/visuals";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  Search,
  ShieldCheck,
  Route,
  CarFront,
  SlidersHorizontal,
} from "lucide-react";
import {
  normalize,
  demoFits,
  money,
  fitmentLabel,
  type Locale,
  type Product,
  type Vehicle,
} from "@/lib/catalog";
import {
  deliveryAreas,
  allRows,
  siteMedia,
  heroSlideshow,
  catalog,
  fitment,
  fitmentFlags,
  memberActiveVehicle,
  relatedProducts,
  policyPages,
  currentUser,
  configured,
  service,
  vehicleCatalog,
  storefrontSettings,
  productImages,
  categoryCatalog,
  searchCatalog,
} from "@/lib/db";
import { t, statusLabel } from "@/lib/i18n";
import { availablePayments } from "@/lib/payments";
import { Shell } from "@/components/shell";
import {
  ProductActions,
  Cart,
  Compare,
  Gallery,
  CopyPart,
  MobileBuyBar,
} from "@/components/controls";
import { AuthForm, RequestForm, Checkout, ApiForm } from "@/components/forms";
import { PaymentStatus } from "@/components/payment-status";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ locale: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, path = [] } = await params;
  const slug = path.join("/");
  const filters = await searchParams;
  const accountPage =
    /^(cart|checkout|account|garage|compare|track-order|order)(\/|$)/.test(
      slug,
    );
  const privatePage =
    accountPage ||
    slug === "catalog" ||
    Object.keys(filters).some((k) =>
      [
        "q",
        "vehicle",
        "category",
        "manufacturer",
        "type",
        "min",
        "max",
        "sort",
        "page",
        "make",
        "model",
        "year",
      ].includes(k),
    );
  const rawProductMeta =
    path[0] === "products" && path.length === 2
      ? ((await catalog({ slug: path[1] }))[0] ?? null)
      : null;
  let productMeta = rawProductMeta ? publicProduct(rawProductMeta) : null;
  let yearKeywords: string[] = [];
  if (rawProductMeta && filters.make && filters.model) {
    const { models, brands } = await vehicleCatalog();
    const context = carContext(
      { make: filters.make, model: filters.model, year: filters.year },
      models,
      brands,
    );
    if (context) {
      const matching = configured()
        ? await searchCatalog({
            query: rawProductMeta.partNumber,
            make: context.make,
            model: context.model,
            year: context.year,
            size: 48,
          })
        : null;
      productMeta = publicProduct(
        rawProductMeta,
        context,
        matching?.products.some((p) => p.id === rawProductMeta.id),
      );
      const application = readApplications(rawProductMeta.specs).find(
        (a) => a.model_id === context.modelId,
      );
      if (
        application &&
        (!context.year || application.years.includes(context.year))
      ) {
        yearKeywords = context.year
          ? [context.name[locale === "ar" ? "ar" : "en"]]
          : application.years.map(
              (year) =>
                `${context.name[locale === "ar" ? "ar" : "en"]} ${year}`,
            );
      }
    }
  }
  const productCopy = productMeta
    ? productSearchCopy(productMeta, locale === "ar" ? "ar" : "en")
    : null;
  const productMedia =
    productMeta && !productMeta.demo
      ? await productImages(productMeta.id).catch(() => [])
      : [];
  let pageMeta: {
    title?: Record<string, string>;
    description?: Record<string, string>;
  } | null = null;
  if (configured() && !productMeta) {
    if (path[0] === "categories" && path[1]) {
      const { data } = await service()
        .from("categories")
        .select("name,description,seo")
        .eq("slug", path[1])
        .maybeSingle();
      if (data)
        pageMeta = {
          title: {
            ar: data.seo?.title?.ar || data.name.ar,
            en: data.seo?.title?.en || data.name.en,
          },
          description: data.seo?.description ?? data.description,
        };
    } else if (!privatePage) {
      const { data } = await service()
        .from("cms_pages")
        .select("title,seo")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data)
        pageMeta = {
          title: {
            ar: data.seo?.title?.ar || data.title.ar,
            en: data.seo?.title?.en || data.title.en,
          },
          description: data.seo?.description,
        };
    }
  }
  if (path[0] === "brands" && path[1] && !pageMeta) {
    const { brands: storedBrands, models } = await vehicleCatalog();
    const brands = coveredBrands(storedBrands);
    const brand = brands.find((b) => b.slug === path[1]);
    const model = models.find((m) => m.brand === path[1] && m.slug === path[2]);
    if (brand && (!path[2] || model)) {
      const target = targetModel(brand.slug, path[2]);
      const nameAr =
        brand.ar +
        (path[2] ? " " + (model?.name.ar ?? target?.name.ar ?? path[2]) : "");
      const nameEn =
        brand.name +
        (path[2] ? " " + (model?.name.en ?? target?.name.en ?? path[2]) : "");
      pageMeta = {
        title: {
          ar: "قطع غيار " + nameAr + " في مصر",
          en: nameEn + " spare parts in Egypt",
        },
        description: {
          ar:
            "استعرض قطع غيار " +
            nameAr +
            " وحدد سنة السيارة والمحرك للتحقق من التوافق.",
          en:
            "Browse " +
            nameEn +
            " parts and select your year and engine to check compatibility.",
        },
      };
    }
  }
  const guide =
    path[0] === "guides" && path.length === 2
      ? buyingGuides.find((g) => g.slug === path[1])
      : undefined;
  if (!pageMeta && guide)
    pageMeta = { title: guide.title, description: guide.description };
  if (!pageMeta && slug === "site-map")
    pageMeta = {
      title: {
        ar: "خريطة الموقع: السيارات والمنتجات وأدلة الشراء",
        en: "Site map: vehicles, products and buying guides",
      },
      description: {
        ar: "تصفح روابط صفحات الماركات والموديلات وقطع الغيار والأدلة المنشورة بالعربية والإنجليزية.",
        en: "Browse direct links to vehicle brands, models, spare parts and published buying guides in Arabic and English.",
      },
    };
  if (!pageMeta && slug === "faq")
    pageMeta = {
      title: {
        ar: "أسئلة عن شراء قطع الغيار والشحن والضمان",
        en: "Spare-parts buying, shipping and warranty questions",
      },
      description: {
        ar: "إجابات عن توافق قطع الغيار والأسعار بالجنيه والشحن العادي والسريع والضمان وطلب التواصل.",
        en: "Answers about parts compatibility, EGP prices, normal and express delivery, warranty and callback requests.",
      },
    };
  if (!pageMeta && slug === "contact")
    pageMeta = {
      title: {
        ar: "تواصل معنا للشحن والاسترجاع والضمان",
        en: "Contact us about shipping, returns and warranty",
      },
      description: {
        ar: "سيب رقم موبايلك واستفسارك عن الشحن أو الاسترجاع أو ضمان قطع الغيار، وسيتواصل معك فريق المتجر.",
        en: "Leave your mobile number and inquiry about delivery, returns or spare-part warranty for the store team to contact you.",
      },
    };
  if (!pageMeta && slug === "guides")
    pageMeta = {
      title: {
        ar: "أدلة شراء قطع غيار السيارات في مصر",
        en: "Car spare-parts buying guides in Egypt",
      },
      description: {
        ar: "اعرف إزاي تطابق رقم القطعة وتراجع التوافق وماركة القطعة وبلد المنشأ وتقارن الأسعار قبل الشراء.",
        en: "Learn how to check part numbers, compatibility, item brand and country of origin, and compare prices before buying.",
      },
    };
  const l: Locale = locale === "ar" ? "ar" : "en";
  const labels = t(l);
  const routeTitles: Record<string, string> = {
    installments:
      l === "ar"
        ? "تقسيط قطع غيار السيارات في مصر: الكروت وشركات التمويل"
        : "Car parts installments in Egypt: cards and finance companies",
    catalog: labels.catalog,
    offers: labels.offers,
    cart: labels.cart,
    checkout: labels.checkout,
    account: labels.account,
    garage: labels.garage,
    compare: labels.compare,
    "request-part": labels.request,
    guides: labels.guides,
    faq: l === "ar" ? "أسئلة شائعة" : "Frequently asked questions",
    about: l === "ar" ? "عن المتجر" : "About",
    contact: l === "ar" ? "تواصل معنا" : "Contact",
    "track-order": l === "ar" ? "تتبع الطلب" : "Track your order",
  };
  const settings = await storefrontSettings();
  return {
    keywords: productMeta
      ? [
          productMeta.name[l],
          productMeta.manufacturer,
          productMeta.partNumber,
          ...yearKeywords,
        ]
      : undefined,
    description:
      productCopy?.description ??
      (slug === "installments"
        ? l === "ar"
          ? "دليل تقسيط قطع الغيار في مصر بالكريدت كارد وشركات التمويل، وشروط الأهلية والتكلفة وتوافر الدفع في المتجر."
          : "A guide to credit cards, spare-parts installments in Egypt, eligibility, total costs and store payment availability."
        : undefined) ??
      pageMeta?.description?.[locale] ??
      (!slug ? settings.heroIntro?.[l] : undefined),
    title:
      productCopy?.title ??
      pageMeta?.title?.[locale] ??
      (slug
        ? (routeTitles[slug] ?? slug.split("/").at(-1)?.replaceAll("-", " "))
        : (settings.storeName?.[l] ??
          (l === "ar" ? "موبِك · لكل رحلة" : "MOPC · The road ahead"))),
    ...(productMeta && productCopy
      ? {
          openGraph: {
            type: "website",
            title: productCopy.title,
            description: productCopy.description,
            url: `/${l}/products/${productMeta.slug}`,
            locale: l === "ar" ? "ar_EG" : "en_EG",
            images: productMedia.map((m) => ({ url: m.url, alt: m.alt[l] })),
          },
          twitter: {
            card: productMedia.length ? "summary_large_image" : "summary",
            title: productCopy.title,
            description: productCopy.description,
            images: productMedia.map((m) => m.url),
          },
        }
      : {}),
    alternates: {
      canonical: productMeta
        ? `/${locale}/products/${productMeta.slug}`
        : slug
          ? `/${locale}/${slug}`
          : `/${locale}`,
      languages: {
        ar: productMeta
          ? `/ar/products/${productMeta.slug}`
          : slug
            ? `/ar/${slug}`
            : "/ar",
        en: productMeta
          ? `/en/products/${productMeta.slug}`
          : slug
            ? `/en/${slug}`
            : "/en",
      },
    },
    robots: {
      index:
        process.env.STORE_LAUNCH_APPROVED === "true" &&
        !privatePage &&
        configured() &&
        !productMeta?.demo &&
        (!["about", "contact", "faq", "guides", "policies"].includes(path[0]) ||
          Boolean(pageMeta)),
      follow: !accountPage,
    },
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { locale: raw, path = [] } = await params;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = raw as Locale,
    w = t(locale),
    q = { ...(await searchParams) },
    route = path.join("/");
  const {
    brands: storedBrands,
    vehicles,
    models: vehicleModels,
  } = await vehicleCatalog();
  const brands = coveredBrands(storedBrands);
  const modelListing = path[0] === "brands" && path.length === 3;
  const listingBrand = modelListing
    ? brands.find((b) => b.slug === path[1])
    : undefined;
  const listingModel = modelListing
    ? vehicleModels.find((m) => m.brand === path[1] && m.slug === path[2])
    : undefined;
  if (modelListing) {
    if (!listingBrand || !listingModel) notFound();
    q.make = listingBrand.slug;
    q.model = listingModel.slug;
  }
  const settings = await storefrontSettings();
  const mediaSlots = [
    "hero",
    ...brands.flatMap((b) => [`brand-${b.slug}-photo`, `brand-${b.slug}-logo`]),
    ...(path[0] === "brands" && path[1]
      ? (brands
          .find((b) => b.slug === path[1])
          ?.models.map((m) => `model-${path[1]}-${m}`) ?? [])
      : []),
  ];
  const branding = await siteMedia(mediaSlots);
  const categories = await categoryCatalog();
  const selectedId =
    q.vehicle ??
    (["make", "model", "year"].some((key) => Object.hasOwn(q, key))
      ? undefined
      : ((await cookies()).get("vehicle")?.value ??
        (await memberActiveVehicle())));
  const vehicle = vehicles.find((v) => v.id === selectedId);
  const isCatalog =
    modelListing ||
    route === "catalog" ||
    route === "offers" ||
    path[0] === "categories";
  const serverResults =
    configured() && isCatalog
      ? await searchCatalog({
          query: q.q,
          make: q.make,
          model: q.model,
          year: q.year ? Number(q.year) || 0 : undefined,
          vehicle: vehicle?.id,
          category: path[0] === "categories" ? path[1] : undefined,
          manufacturer: q.manufacturer,
          type: q.type,
          offers: route === "offers",
          sort: q.sort,
          page: Number(q.page),
        })
      : null;
  const primary =
    path[0] === "products" ? await catalog({ slug: path[1] }) : [];
  const family = primary[0]
    ? await catalog({ family: primary[0].family, limit: 12 })
    : [];
  const homeOffers = !route
    ? configured()
      ? (await searchCatalog({ offers: true, vehicle: vehicle?.id, size: 4 }))
          .products
      : (await catalog()).filter((p) => p.sale !== null)
    : [];
  const products =
    serverResults?.products ??
    (primary.length
      ? [...new Map([...primary, ...family].map((p) => [p.id, p])).values()]
      : !route
        ? [
            ...new Map(
              [...(await catalog({ limit: 4 })), ...homeOffers].map((p) => [
                p.id,
                p,
              ]),
            ).values(),
          ]
        : isCatalog
          ? await catalog()
          : []);
  const flags = await fitmentFlags(
    products.map((p) => p.id),
    vehicle?.id,
  );
  const browsingContext = carContext(
    {
      make: q.make ?? vehicle?.brand,
      model: q.model ?? vehicle?.model,
      year: q.year ?? vehicle?.year,
    },
    vehicleModels,
    brands,
  );
  const cards = (items: Product[]) => (
    <div className="product-grid">
      {items.map((p, i) => (
        <Reveal key={p.id} delay={(i % 4) * 0.06}>
          <Card
            product={p}
            locale={locale}
            vehicle={vehicle}
            confirmed={flags[p.id]}
            context={browsingContext}
            contextMatched={Boolean(serverResults && q.make && q.model)}
          />
        </Reveal>
      ))}
    </div>
  );
  let content: React.ReactNode;
  if (!route) {
    const faq = (await policyPages(["faq"]))[0];
    const slideshow = await heroSlideshow(
      branding.hero?.url ??
        settings.heroImage ??
        "/images/cinematic/hero-road-v2.webp",
    );
    content = (
      <>
        <div className="cinematic-intro">
          <HeroSlideshow {...slideshow} locale={locale}>
            <section className="hero">
              <div className="shell hero-content">
                <Reveal>
                  <p className="eyebrow hero-eyebrow">
                    {locale === "ar"
                      ? "قطع صح. عمر أطول."
                      : "Right Parts. More Miles."}
                  </p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h1 className="cinematic-headline">
                    {settings.heroTitle?.[locale] ? (
                      settings.heroTitle[locale]
                    ) : (
                      <>
                        <span>
                          {locale === "ar" ? "اختيار أدق." : "A better fit."}
                        </span>
                        <span className="brush-highlight">
                          {locale === "ar"
                            ? "لرحلة أفضل."
                            : "For the road ahead."}
                        </span>
                      </>
                    )}
                  </h1>
                </Reveal>
                <Reveal delay={0.18}>
                  <p className="hero-copy">
                    {settings.heroIntro?.[locale] ??
                      (locale === "ar"
                        ? "القطعة المناسبة لسيارتك، لكل طريق ورحلة."
                        : "The right parts for your car. For every road ahead.")}
                  </p>
                </Reveal>
                <Reveal delay={0.26}>
                  <SearchBox locale={locale} />
                </Reveal>
                <div className="hero-actions">
                  <Link className="hero-browse" href={`/${locale}/catalog`}>
                    {locale === "ar"
                      ? "اكتشف قطع الغيار"
                      : "Explore the collection"}
                    <ArrowUpRight size={17} />
                  </Link>
                  <a className="text-link" href="#brands">
                    {w.explore}
                    <span>↓</span>
                  </a>
                </div>
              </div>
              <div className="hero-caption">
                {locale === "ar" ? "موبِك" : "MOPC"}{" "}
                <span>PARTS FOR YOUR JOURNEY</span>
              </div>
            </section>
          </HeroSlideshow>
          <section
            id="brands"
            className="shell section brand-deck"
            aria-label={
              locale === "ar" ? "اختر علامة سيارتك" : "Choose your car brand"
            }
          >
            <Reveal>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {locale === "ar" ? "ابدأ بسيارتك" : "START WITH YOUR CAR"}
                  </span>
                  <h2>{w.brands}</h2>
                </div>
                <p>{w.brandIntro}</p>
              </div>
            </Reveal>
            <div className="brand-grid">
              {brands.map((b, i) => (
                <Reveal key={b.slug} delay={i * 0.08}>
                  <BrandCard
                    brand={b}
                    locale={locale}
                    photo={branding[`brand-${b.slug}-photo`]?.url}
                    logo={branding[`brand-${b.slug}-logo`]?.url}
                  />
                </Reveal>
              ))}
            </div>
          </section>
        </div>
        <div className="trust-strip">
          <Reveal>
            <div className="shell trust-grid">
              <div>
                <CarFront />
                <span>
                  {locale === "ar"
                    ? "التوافق يبدأ بسيارتك"
                    : "Fit starts with your car"}
                </span>
              </div>
              <div>
                <Route />
                <span>
                  {locale === "ar"
                    ? "التوصيل حسب المنطقة"
                    : "Delivery by configured area"}
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  {locale === "ar"
                    ? "أسعار واضحة. اختيار مدروس."
                    : "Clear prices. Considered choices."}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
        <Campaigns locale={locale} />
        <SpecialOffers
          products={homeOffers}
          locale={locale}
          vehicle={vehicle}
          fitments={flags}
        />
        <section className="shell section home-featured">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {products.every((p) => p.demo)
                    ? "THE PARTS EDIT / DEMO COLLECTION"
                    : "THE PARTS EDIT"}
                </span>
                <h2>{w.popular}</h2>
              </div>
              <Link className="text-link" href={`/${locale}/catalog`}>
                {w.catalog}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </Reveal>
          {cards(products.slice(0, 4))}
        </section>
        <section className="shell process section">
          <span className="eyebrow">A BETTER WAY TO FIND YOUR PART</span>
          <h2>
            {locale === "ar"
              ? "من سيارتك، إلى الطريق."
              : "From your car, to the road."}
          </h2>
          <div className="three-col">
            {(locale === "ar"
              ? ["اختر سيارتك", "تحقق من التوافق", "اطلب القطعة المناسبة"]
              : ["Choose your car", "Check your fit", "Order your part"]
            ).map((s, i) => (
              <Reveal key={s} delay={i * 0.1}>
                <span className="step">0{i + 1}</span>
                <h3>{s}</h3>
                <p className="muted">
                  {
                    [
                      w.explore,
                      locale === "ar"
                        ? "السنة والمحرك يحدثان الفرق."
                        : "Year and engine make the difference.",
                      locale === "ar"
                        ? "الأسعار والتوصيل يتم تأكيدهما عند الطلب."
                        : "Prices and delivery are validated at checkout.",
                    ][i]
                  }
                </p>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="shell section narrow home-faq">
          <Reveal>
            <h2>
              {faq?.title?.[locale] ??
                (locale === "ar"
                  ? "أسئلة شائعة"
                  : "Frequently asked questions")}
            </h2>
          </Reveal>
          {faq ? (
            <p className="preserve">{faq.body[locale]}</p>
          ) : (
            <>
              <details className="accordion">
                <summary>
                  {locale === "ar"
                    ? "كيف أختار القطعة المناسبة؟"
                    : "How do I choose a compatible part?"}
                </summary>
                <p>
                  {locale === "ar"
                    ? "اختر الموديل والسنة والمحرك ثم ابحث عن علامة التوافق المؤكد. تواصل معنا إذا لم تجد تكوين سيارتك."
                    : "Choose your model, year and engine, then look for confirmed fitment. Contact us if your configuration is missing."}
                </p>
              </details>
              <details className="accordion">
                <summary>
                  {locale === "ar"
                    ? "متى تظهر تكلفة التوصيل؟"
                    : "When can I see delivery costs?"}
                </summary>
                <p>
                  {locale === "ar"
                    ? "تظهر التكلفة حسب المنطقة المعتمدة في مراجعة الطلب قبل التأكيد."
                    : "Approved delivery costs appear in your order review before confirmation."}
                </p>
              </details>
            </>
          )}
          <Link href={`/${locale}/faq`}>
            {locale === "ar" ? "كل الأسئلة" : "All questions"} ↗
          </Link>
        </section>
      </>
    );
  } else if (path[0] === "brands" && path.length <= 2) {
    const brand = brands.find((b) => b.slug === path[1]);
    if (!brand) notFound();
    if (path.length === 2) {
      const models = brand.models.filter(
        (m) => !q.q || normalize(m).includes(normalize(q.q)),
      );
      const modelYears = configured()
        ? await allRows<{ model_id: string; year: number }>(
            "vehicle_model_years",
            "model_id,year,vehicle_models!inner(brand)",
            { "vehicle_models.brand": brand.slug },
          )
        : [];
      content = (
        <div className="shell section">
          <Breadcrumb
            locale={locale}
            items={[
              { label: brand.name, href: `/${locale}/brands/${brand.slug}` },
            ]}
          />
          <span className="eyebrow">
            {brand.name.toUpperCase()} / MODEL SELECT
          </span>
          <h1>
            {locale === "ar"
              ? `قطع غيار ${brand.ar} في مصر`
              : `${brand.name} spare parts in Egypt`}
          </h1>
          <p className="lead">
            {locale === "ar"
              ? "اضغط على موديل سيارتك واختار السنة لعرض قطع الغيار المناسبة."
              : "Click your model, then choose the year to see matching spare parts."}
          </p>
          <form className="search-form">
            <input
              name="q"
              placeholder={locale === "ar" ? "بحث الموديلات" : "Search models"}
              defaultValue={q.q}
            />
            <button className="button">
              <Search size={18} />
            </button>
          </form>
          <ModelYearCards
            locale={locale}
            brand={brand}
            models={models.map((slug) => {
              const model = vehicleModels.find(
                (m) => m.brand === brand.slug && m.slug === slug,
              );
              return {
                slug,
                name: model?.name ??
                  targetModel(brand.slug, slug)?.name ?? { ar: slug, en: slug },
                photo:
                  branding[`model-${brand.slug}-${slug}`]?.url ??
                  model?.image ??
                  modelPhoto(`${brand.slug}-${slug}`),
                years: [
                  ...new Set([
                    ...modelYears
                      .filter((y) => y.model_id === model?.id)
                      .map((y) => y.year),
                    ...vehicles
                      .filter((v) => v.brand === brand.slug && v.model === slug)
                      .map((v) => v.year),
                  ]),
                ],
              };
            })}
          />
        </div>
      );
    }
  } else if (isCatalog) {
    if (path[0] === "categories" && !categories.some((c) => c.slug === path[1]))
      notFound();
    const category = path[0] === "categories" ? path[1] : undefined;
    const currentCategory =
      path[0] === "categories"
        ? categories.find((c) => c.slug === category)
        : undefined;
    let filtered = products.filter(
      (p) =>
        (!category || Boolean(serverResults) || p.category === category) &&
        (Boolean(serverResults) ||
          (!q.make && !q.model && !q.year) ||
          readApplications(p.specs).some((a) => {
            const m = vehicleModels.find((m) => m.id === a.model_id);
            return (
              m &&
              (!q.make || m.brand === q.make) &&
              (!q.model || m.slug === q.model) &&
              (!q.year || a.years.includes(Number(q.year)))
            );
          }) ||
          vehicles.some(
            (v) =>
              (!q.make || v.brand === q.make) &&
              (!q.model || v.model === q.model) &&
              (!q.year || v.year === Number(q.year)) &&
              demoFits(p.id, v.id),
          )) &&
        (!q.manufacturer || p.manufacturer === q.manufacturer) &&
        (!q.type || p.type === q.type) &&
        (!q.q ||
          normalize(
            `${p.name.en} ${p.name.ar} ${p.partNumber} ${p.sku}`,
          ).includes(normalize(q.q))) &&
        (route !== "offers" || p.sale !== null) &&
        (!vehicle || flags[p.id]),
    );
    if (q.sort === "newest" && !serverResults) filtered.reverse();
    if (q.sort === "price-asc")
      filtered.sort((a, b) => (a.sale ?? a.price) - (b.sale ?? b.price));
    if (q.sort === "price-desc")
      filtered.sort((a, b) => (b.sale ?? b.price) - (a.sale ?? a.price));
    if (q.q)
      filtered.sort(
        (a, b) =>
          Number(normalize(b.partNumber) === normalize(q.q!)) -
          Number(normalize(a.partNumber) === normalize(q.q!)),
      );
    const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
    content = (
      <div className="shell section">
        <Breadcrumb
          locale={locale}
          items={
            listingBrand && listingModel
              ? [
                  {
                    label: listingBrand[locale === "ar" ? "ar" : "name"],
                    href: `/${locale}/brands/${listingBrand.slug}`,
                  },
                  {
                    label: listingModel.name[locale],
                    href: `/${locale}/${route}`,
                  },
                ]
              : currentCategory
                ? [
                    ...(currentCategory.parent_slug
                      ? [
                          {
                            label:
                              categories.find(
                                (c) => c.slug === currentCategory.parent_slug,
                              )?.name[locale] ?? currentCategory.parent_slug,
                            href: `/${locale}/categories/${currentCategory.parent_slug}`,
                          },
                        ]
                      : []),
                    {
                      label: currentCategory.name[locale],
                      href: `/${locale}/categories/${currentCategory.slug}`,
                    },
                  ]
                : [
                    {
                      label: route === "offers" ? w.offers : w.catalog,
                      href: `/${locale}/${route}`,
                    },
                  ]
          }
        />
        <span className="eyebrow">PRECISION / SELECTION</span>
        <h1>
          {listingBrand && listingModel
            ? locale === "ar"
              ? `قطع غيار ${listingBrand.ar} ${listingModel.name.ar}`
              : `${listingBrand.name} ${listingModel.name.en} parts`
            : (currentCategory?.name[locale] ??
              (route === "offers" ? w.offers : w.catalog))}
        </h1>
        {currentCategory && (
          <>
            <p className="lead">{currentCategory.description?.[locale]}</p>
            <nav
              className="admin-nav"
              aria-label={locale === "ar" ? "الفئات الفرعية" : "Subcategories"}
            >
              {currentCategory.parent_slug && (
                <Link
                  href={`/${locale}/categories/${currentCategory.parent_slug}`}
                >
                  {
                    categories.find(
                      (c) => c.slug === currentCategory.parent_slug,
                    )?.name[locale]
                  }{" "}
                  ↑
                </Link>
              )}
              {categories
                .filter((c) => c.parent_slug === currentCategory.slug)
                .map((c) => (
                  <Link key={c.slug} href={`/${locale}/categories/${c.slug}`}>
                    {c.name[locale]} ↗
                  </Link>
                ))}
            </nav>
          </>
        )}
        <details
          open={!modelListing}
          className={modelListing ? "model-product-filters" : undefined}
        >
          <summary hidden={!modelListing}>
            {locale === "ar"
              ? "بحث وتصفية المنتجات"
              : "Search & filter products"}
          </summary>
          <form
            className="catalog-filters panel"
            action={modelListing ? `/${locale}/catalog` : undefined}
          >
            <CatalogCarFilters
              key={`${q.make ?? vehicle?.brand ?? ""}/${q.model ?? vehicle?.model ?? ""}/${q.year ?? vehicle?.year ?? ""}`}
              locale={locale}
              brands={brands}
              models={vehicleModels}
              initial={{
                make: q.make ?? vehicle?.brand,
                model: q.model ?? vehicle?.model,
                year: q.year ?? (vehicle ? String(vehicle.year) : undefined),
              }}
            />
            <label className="search-label">
              <Search size={18} />
              <input
                name="q"
                aria-label={w.search}
                defaultValue={q.q}
                placeholder={w.search}
                maxLength={100}
              />
            </label>
            <label>
              {w.manufacturer}
              <select name="manufacturer" defaultValue={q.manufacturer}>
                <option value="">{w.all}</option>
                {[...new Set(products.map((p) => p.manufacturer))].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              {locale === "ar" ? "النوع" : "Type"}
              <select name="type" defaultValue={q.type}>
                <option value="">{w.all}</option>
                <option value="oem">Original</option>
                <option value="aftermarket">After Market</option>
              </select>
            </label>
            <label>
              {locale === "ar" ? "الترتيب" : "Sort"}
              <select name="sort" defaultValue={q.sort}>
                <option value="">
                  {locale === "ar" ? "الصلة" : "Relevance"}
                </option>
                <option value="newest">
                  {locale === "ar" ? "الأحدث" : "Newest"}
                </option>
                <option value="price-asc">
                  {locale === "ar" ? "السعر من الأقل" : "Price: low to high"}
                </option>
                <option value="price-desc">
                  {locale === "ar" ? "السعر من الأعلى" : "Price: high to low"}
                </option>
              </select>
            </label>
            <button className="button">
              <SlidersHorizontal size={18} />
              {locale === "ar" ? "تطبيق" : "Apply"}
            </button>
            <Link
              href={`/${locale}/${modelListing ? "catalog" : route}?make=`}
              className="text-link"
            >
              {locale === "ar" ? "مسح الفلاتر" : "Reset filters"}
            </Link>
          </form>
        </details>
        <div className="results-heading">
          <p>
            {serverResults?.total ?? filtered.length}{" "}
            {locale === "ar" ? "نتيجة" : "results"} ·{" "}
            {vehicle
              ? vehicle.name[locale]
              : [
                  brands.find((b) => b.slug === q.make)?.[
                    locale === "ar" ? "ar" : "name"
                  ],
                  vehicleModels.find(
                    (m) => m.brand === q.make && m.slug === q.model,
                  )?.name[locale],
                  q.year,
                ]
                  .filter(Boolean)
                  .join(" · ") || w.none}
          </p>
          <Link href={`/${locale}/compare`}>{w.compare} ↗</Link>
        </div>
        {filtered.length ? (
          cards(
            serverResults
              ? filtered
              : filtered.slice((page - 1) * 12, page * 12),
          )
        ) : (
          <div className="panel">
            <h2>{w.empty}</h2>
            <p>
              {locale === "ar"
                ? "لا توجد بيانات توافق مؤكدة لهذه السيارة ضمن النتائج الحالية."
                : "No confirmed fitment data for this vehicle in the current results."}
            </p>
            <Link href={`/${locale}/request-part`}>{w.request}</Link>
          </div>
        )}
        {(serverResults?.total ?? filtered.length) > 12 && (
          <div className="pagination">
            {Array.from(
              {
                length: Math.ceil(
                  (serverResults?.total ?? filtered.length) / 12,
                ),
              },
              (_, i) => (
                <a
                  key={i}
                  aria-current={page === i + 1 ? "page" : undefined}
                  href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string")), page: String(i + 1) })}`}
                >
                  {i + 1}
                </a>
              ),
            )}
          </div>
        )}
      </div>
    );
  } else if (path[0] === "products" && path.length === 2) {
    const raw = primary[0];
    if (!raw) notFound();
    const matching =
      browsingContext && q.make && q.model && configured()
        ? await searchCatalog({
            query: raw.partNumber,
            make: browsingContext.make,
            model: browsingContext.model,
            year: browsingContext.year,
            size: 48,
          })
        : null;
    const p = publicProduct(
      raw,
      browsingContext,
      Boolean(flags[raw.id] || matching?.products.some((p) => p.id === raw.id)),
    );
    const confirmed = flags[p.id];

    function vehicleForItem(
      vehicle: Vehicle | undefined,
      locale: Locale,
    ): string {
      if (!vehicle) {
        return locale === "ar"
          ? "لم يتم اختيار سيارة"
          : "No vehicle selected";
      }
      return locale === "ar"
        ? `${vehicle.name.ar}`
        : `${vehicle.name.en}`;
    }

    let media: {
      url: string;
      alt: { ar: string; en: string };
    }[] = [];
    try {
      media = await productImages(p.id);
    } catch {
      /* A missing photo does not conceal the product. */
    }
    const areas = await deliveryAreas();
    const policies = await policyPages(
      p.policy_refs?.length
        ? p.policy_refs
        : ["policies/shipping", "policies/returns", "policies/warranty"],
    );
    const together = await relatedProducts(p.id, "together", vehicle?.id);
    const curatedAlternatives = await relatedProducts(
      p.id,
      "alternative",
      vehicle?.id,
    );
    const alternatives = (
      curatedAlternatives.length ? curatedAlternatives : products
    ).filter(
      (x) =>
        x.id !== p.id &&
        x.family === p.family &&
        x.manufacturer !== p.manufacturer,
    );
    content = (
      <div className="shell section product-detail">
        <MobileBuyBar product={p} locale={locale} />
        {!p.demo && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                productStructuredData(
                  p,
                  locale,
                  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
                  media.map((m) => m.url),
                ),
              ).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <Breadcrumb
          locale={locale}
          items={[
            ...(vehicle
              ? [
                  {
                    label: vehicle.brand.toUpperCase(),
                    href: `/${locale}/brands/${vehicle.brand}`,
                  },
                  {
                    label: vehicle.model.toUpperCase(),
                    href: `/${locale}/brands/${vehicle.brand}/${vehicle.model}`,
                  },
                ]
              : []),
            {
              label:
                categories.find((c) => c.slug === p.category)?.name[locale] ??
                p.category,
              href: `/${locale}/categories/${p.category}`,
            },
            { label: p.name[locale], href: `/${locale}/products/${p.slug}` },
          ]}
        />
        <div className="product-layout">
          <div>
            <Gallery
              locale={locale}
              media={media}
              category={p.category}
              demo={p.demo}
            />
            <p className="image-caption">
              {(media.length ?? 0)
                ? locale === "ar"
                  ? "صور المنتج المقدمة من التاجر"
                  : "Merchant-supplied product images"
                : p.demo
                  ? locale === "ar"
                    ? "رسم توضيحي عام. لا يمثل صورة هذا المنتج."
                    : "Generic demo illustration. Does not depict this SKU."
                  : locale === "ar"
                    ? "صورة المنتج غير متاحة بعد."
                    : "Product photo is not available yet."}
            </p>
            <div className="editorial">
              <span className="eyebrow">01 / THE DETAILS</span>
              <h2>
                {locale === "ar"
                  ? "التفاصيل تصنع الفرق."
                  : "The difference is in the details."}
              </h2>
              <p className="lead">
                <ProductText text={p.description[locale]} locale={locale} />
              </p>
              {policies.map((page) => (
                <details className="accordion" key={page.slug}>
                  <summary>{page.title[locale]}</summary>
                  <p>{page.body[locale]}</p>
                </details>
              ))}
              {p.editorial?.why && (
                <p className="lead">{p.editorial.why[locale]}</p>
              )}
              <div className="spec-grid">
                {productSpecifications(p, locale).map(
                  ({ key, label, value }) => (
                    <div key={key}>
                      <span className="muted small">{label}</span>
                      <p>
                        <bdi dir="auto">{value}</bdi>
                      </p>
                    </div>
                  ),
                )}
              </div>
              {p.editorial?.installation && (
                <details className="accordion">
                  <summary>
                    {locale === "ar"
                      ? "ملاحظات الشركة المصنعة"
                      : "Manufacturer installation notes"}
                  </summary>
                  <p>{p.editorial.installation[locale]}</p>
                </details>
              )}
              {p.warranty && <p>{p.warranty[locale]}</p>}
              <details className="accordion">
                <summary>
                  {locale === "ar"
                    ? "الشحن والإرجاع والضمان"
                    : "Shipping, returns & warranty"}
                </summary>
                <p>
                  {locale === "ar"
                    ? "تتحدد رسوم التوصيل حسب المنطقة. راجع السياسات المنشورة وشروط ضمان المنتج قبل الطلب."
                    : "Delivery fees depend on your area. Review the published policies and product warranty terms before ordering."}
                </p>
                <nav
                  className="product-policy-links"
                  aria-label={
                    locale === "ar"
                      ? "سياسات الشحن والاسترجاع والضمان"
                      : "Shipping, returns and warranty policies"
                  }
                >
                  <Link href={`/${locale}/policies/returns`}>
                    {locale === "ar" ? "سياسة الاسترجاع" : "Return policy"}
                  </Link>
                  <Link href={`/${locale}/policies/shipping`}>
                    {locale === "ar" ? "سياسة الشحن" : "Shipping policy"}
                  </Link>
                  <Link href={`/${locale}/policies/warranty`}>
                    {locale === "ar" ? "سياسة الضمان" : "Warranty policy"}
                  </Link>
                </nav>
              </details>
            </div>
          </div>
          <aside className="purchase-panel">
            <span className="eyebrow">
              {p.category.toUpperCase()} / {p.sku}
            </span>
            <h1>{p.name[locale]}</h1>
            <div className="badges">
              <span>{p.manufacturer}</span>
              <span>{p.type === "oem" ? "Original" : "After Market"}</span>
              {p.demo && <span>{w.demoProduct}</span>}
            </div>
            <CopyPart value={p.partNumber} locale={locale} />
            <div className="detail-price">
              <span className="price">{money(p.sale ?? p.price, locale)}</span>
              {p.sale !== null && <del>{money(p.price, locale)}</del>}
            </div>
            <div className={`fit-card ${confirmed ? "confirmed" : ""}`}>
              <span className="eyebrow">
                <span className="status-dot" />
                {w.fit}
              </span>
              <p>{vehicleForItem(vehicle, locale)}</p>
            </div>
            <ProductActions product={p} locale={locale} />
            <Link className="small muted" href={`/${locale}/checkout`}>
              {locale === "ar"
                ? "تحقق من منطقة التوصيل عند الطلب"
                : "Check delivery area at checkout"}{" "}
              ↗
            </Link>
            <p className="small muted">
              {p.demo
                ? locale === "ar"
                  ? "منتج تجريبي خيالي للاختبار."
                  : "Fictional demonstration product for testing."
                : locale === "ar"
                  ? "يؤكد التاجر إمكانية تنفيذ الطلب."
                  : "Fulfillment is confirmed by the merchant."}
            </p>
          </aside>
        </div>
        <ProductAnswers product={p} locale={locale} />
        <ShippingEstimate locale={locale} areas={areas} />
        {together.length > 0 && (
          <section className="section">
            <h2>
              {locale === "ar"
                ? "قطع مكملة لسيارتك"
                : "Often purchased together for your car"}
            </h2>
            {
              <div className="product-grid">
                {together.map((item) => (
                  <Card
                    key={item.id}
                    product={item}
                    locale={locale}
                    vehicle={vehicle}
                    confirmed={true}
                  />
                ))}
              </div>
            }
          </section>
        )}
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                SAME FAMILY / DISTINCT MANUFACTURERS
              </span>
              <h2>
                {locale === "ar"
                  ? "بدائل من شركات أخرى"
                  : "Other manufacturers for this part"}
              </h2>
            </div>
            <Link href={`/${locale}/compare`}>{w.compare} ↗</Link>
          </div>
          {cards(alternatives)}
        </section>
      </div>
    );
  } else if (route === "site-map")
    content = (
      <SiteMap
        pages={await searchPages()}
        locale={locale}
        page={Number(q.page) || 1}
      />
    );
  else if (route === "installments")
    content = <InstallmentsGuide locale={locale} />;
  else if (route === "cart")
    content = (
      <div className="shell section">
        <h1>{w.cart}</h1>
        <Cart products={products} locale={locale} />
      </div>
    );
  else if (route === "compare")
    content = (
      <div className="shell section">
        <h1>{w.compare}</h1>
        <Compare
          products={products}
          locale={locale}
          fit={Object.fromEntries(
            products.map((p) => [
              p.id,
              fitmentLabel(vehicle, flags[p.id], locale),
            ]),
          )}
        />
      </div>
    );
  else if (route === "checkout") {
    let areas = [];
    if (configured()) {
      const { data } = await service()
        .from("shipping_areas")
        .select("*")
        .eq("enabled", true)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
      areas = data ?? [];
    }
    const user = await currentUser();
    const addresses = user
      ? ((
          await service()
            .from("saved_addresses")
            .select("id,name,phone,details,area_id")
            .eq("user_id", user.id)
        ).data ?? [])
      : [];
    content = (
      <div className="shell section">
        <h1>{w.checkout}</h1>
        <Checkout
          locale={locale}
          addresses={addresses}
          areas={areas}
          methods={availablePayments()}
          vehicle={vehicle?.id}
        />
      </div>
    );
  } else if (route === "account" || route === "garage") {
    const user = await currentUser();
    let profile: { name?: string; phone?: string } | null = null;
    let addresses: {
      id: string;
      name: string;
      phone: string;
      details: string;
    }[] = [];
    let garage: { id: string; vehicle_config_id: string; nickname?: string }[] =
      [];
    let memberOrders: {
      public_token: string;
      status: string;
      total: number;
    }[] = [];
    if (user && configured()) {
      const { data } = await service()
        .from("garage_vehicles")
        .select("id,vehicle_config_id,nickname")
        .eq("user_id", user.id);
      garage = data ?? [];
      if (route === "account") {
        const [{ data: p }, { data: a }] = await Promise.all([
          service()
            .from("profiles")
            .select("name,phone")
            .eq("user_id", user.id)
            .maybeSingle(),
          service()
            .from("saved_addresses")
            .select("id,name,phone,details")
            .eq("user_id", user.id),
        ]);
        profile = p;
        addresses = a ?? [];
        const { data: orders } = await service()
          .from("orders")
          .select("public_token,status,total")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        memberOrders = orders ?? [];
      }
    }
    content = (
      <div className="shell section">
        <h1>{route === "garage" ? w.garage : w.account}</h1>
        {!user ? (
          <AuthForm locale={locale} configured={configured()} />
        ) : (
          <div className="stack">
            <p>{user.email}</p>
            <div className="admin-nav">
              <a className="button secondary" href="/api/account-export">
                {locale === "ar" ? "تنزيل بياناتي" : "Export my data"}
              </a>
              <ApiForm
                action="privacy-request"
                label={
                  locale === "ar" ? "طلب حذف البيانات" : "Request data deletion"
                }
              />
            </div>
            {route === "account" && (
              <section className="stack">
                <div className="two-col">
                  <div className="panel">
                    <h2>{locale === "ar" ? "بياناتي" : "My profile"}</h2>
                    <ApiForm
                      action="profile"
                      label={locale === "ar" ? "حفظ" : "Save"}
                      extra={{ locale }}
                    >
                      <label>
                        {locale === "ar" ? "الاسم" : "Name"}
                        <input
                          name="name"
                          required
                          minLength={2}
                          maxLength={100}
                          defaultValue={profile?.name}
                        />
                      </label>
                      <label>
                        {locale === "ar" ? "الموبايل" : "Phone"}
                        <input
                          name="phone"
                          required
                          pattern="01[0125][0-9]{8}"
                          defaultValue={profile?.phone}
                        />
                      </label>
                    </ApiForm>
                  </div>
                  <div className="panel">
                    <h2>
                      {locale === "ar" ? "عنوان جديد" : "Save an address"}
                    </h2>
                    <ApiForm
                      action="address"
                      label={locale === "ar" ? "حفظ العنوان" : "Save address"}
                    >
                      <label>
                        {locale === "ar" ? "الاسم" : "Name"}
                        <input
                          name="name"
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </label>
                      <label>
                        {locale === "ar" ? "الموبايل" : "Phone"}
                        <input
                          name="phone"
                          required
                          pattern="01[0125][0-9]{8}"
                        />
                      </label>
                      <label>
                        {locale === "ar" ? "العنوان" : "Address"}
                        <textarea
                          name="details"
                          required
                          minLength={10}
                          maxLength={500}
                        />
                      </label>
                    </ApiForm>
                  </div>
                </div>
                {addresses.map((a) => (
                  <article className="panel" key={a.id}>
                    <h3>{a.name}</h3>
                    <p>{a.details}</p>
                    <details>
                      <summary>
                        {locale === "ar" ? "تعديل العنوان" : "Edit address"}
                      </summary>
                      <ApiForm
                        action="address"
                        extra={{ id: a.id }}
                        label={locale === "ar" ? "حفظ" : "Save"}
                      >
                        <label>
                          {locale === "ar" ? "الاسم" : "Name"}
                          <input
                            name="name"
                            required
                            minLength={2}
                            maxLength={100}
                            defaultValue={a.name}
                          />
                        </label>
                        <label>
                          {locale === "ar" ? "الموبايل" : "Phone"}
                          <input
                            name="phone"
                            required
                            pattern="01[0125][0-9]{8}"
                            defaultValue={a.phone}
                          />
                        </label>
                        <label>
                          {locale === "ar" ? "العنوان" : "Address"}
                          <textarea
                            name="details"
                            required
                            minLength={10}
                            maxLength={500}
                            defaultValue={a.details}
                          />
                        </label>
                      </ApiForm>
                    </details>
                    <ApiForm
                      action="address-delete"
                      extra={{ id: a.id }}
                      label={locale === "ar" ? "حذف العنوان" : "Delete address"}
                    />
                  </article>
                ))}
                <h2>{locale === "ar" ? "طلباتي" : "My orders"}</h2>
                {memberOrders.length ? (
                  memberOrders.map((o) => (
                    <Link
                      key={o.public_token}
                      className="panel"
                      href={`/${locale}/order/confirmation/${o.public_token}`}
                    >
                      {statusLabel(o.status, locale)} · {money(o.total, locale)}
                    </Link>
                  ))
                ) : (
                  <p>{w.empty}</p>
                )}
              </section>
            )}
            <ApiForm
              action="logout"
              label={locale === "ar" ? "خروج" : "Sign out"}
            />
            {route === "garage" && (
              <>
                <ApiForm
                  action="garage"
                  label={locale === "ar" ? "حفظ السيارة" : "Save vehicle"}
                >
                  <label>
                    {w.selected}
                    <select name="vehicle" defaultValue={vehicle?.id}>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name[locale]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {locale === "ar"
                      ? "اسم اختياري للسيارة"
                      : "Vehicle nickname (optional)"}
                    <input name="nickname" maxLength={70} />
                  </label>
                </ApiForm>
                {garage.map((g) => (
                  <article className="panel" key={g.id}>
                    <h3>{g.nickname}</h3>
                    <p>
                      {
                        vehicles.find((v) => v.id === g.vehicle_config_id)
                          ?.name[locale]
                      }
                    </p>
                    <Link
                      href={`/${locale}/catalog?vehicle=${g.vehicle_config_id}`}
                    >
                      {w.parts} ↗
                    </Link>
                    <ApiForm
                      action="garage-active"
                      extra={{ vehicle: g.vehicle_config_id }}
                      label={
                        locale === "ar"
                          ? "استخدام هذه السيارة"
                          : "Use this vehicle"
                      }
                    />
                    <ApiForm
                      action="garage"
                      extra={{ id: g.id, vehicle: g.vehicle_config_id }}
                      label={locale === "ar" ? "حفظ الاسم" : "Save nickname"}
                    >
                      <label>
                        {locale === "ar" ? "اسم السيارة" : "Vehicle nickname"}
                        <input
                          name="nickname"
                          defaultValue={g.nickname}
                          maxLength={70}
                        />
                      </label>
                    </ApiForm>
                    <ApiForm
                      action="garage-delete"
                      extra={{ id: g.id }}
                      label={locale === "ar" ? "حذف" : "Delete"}
                    />
                  </article>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  } else if (route === "request-part")
    content = (
      <div className="shell section">
        <h1>{w.request}</h1>
        <RequestForm locale={locale} vehicles={vehicles} />
      </div>
    );
  else if (
    path[0] === "order" &&
    path[1] === "confirmation" &&
    path.length === 3
  ) {
    if (!/^[a-f0-9]{64}$/.test(path[2])) notFound();
    if (!configured()) notFound();
    const { data } = await service()
      .from("orders")
      .select(
        "id,order_number,status,payment_status,payment_method,total,subtotal,discount,shipping_amount,demo,carrier,tracking_number",
      )
      .eq("public_token", path[2])
      .maybeSingle();
    if (!data) notFound();
    const { data: orderItems } = await service()
      .from("order_items")
      .select("snapshot,quantity")
      .eq("order_id", data.id);
    content = (
      <div className="shell section narrow">
        <span className="eyebrow">ORDER RECEIVED</span>
        <h1>{locale === "ar" ? "حالة طلبك" : "Your order status"}</h1>
        <h2>{data.order_number}</h2>
        {orderItems?.map((item, i) => (
          <p key={i}>
            {item.snapshot.name[locale]} × {item.quantity} ·{" "}
            {money(item.snapshot.price * item.quantity, locale)}
          </p>
        ))}
        <p>
          {locale === "ar" ? "التوصيل" : "Delivery"}:{" "}
          {money(data.shipping_amount, locale)} ·{" "}
          {locale === "ar" ? "الخصم" : "Discount"}:{" "}
          {money(data.discount, locale)}
        </p>
        {data.tracking_number && (
          <p>
            {data.carrier} · {data.tracking_number}
          </p>
        )}
        {data.demo && <p className="notice">DEMO ORDER / طلب تجريبي</p>}
        <PaymentStatus
          token={path[2]}
          locale={locale}
          initialStatus={data.status}
          initialPaymentStatus={data.payment_status}
          method={data.payment_method}
        />
        <p className="price">{money(data.total, locale)}</p>
        <p>
          {locale === "ar"
            ? "احتفظ بهذا الرابط الخاص لمتابعة حالة الطلب. لا تشاركه مع الآخرين."
            : "Keep this private link to check your order status. Do not share it."}
        </p>
      </div>
    );
  } else if (route === "track-order")
    content = (
      <div className="shell section narrow">
        <h1>{locale === "ar" ? "تتبع الطلب" : "Track your order"}</h1>
        <p>
          {locale === "ar"
            ? "استخدم رابط التأكيد الخاص الذي ظهر بعد الطلب. التتبع برقم الطلب غير متاح حتى تفعيل التحقق الآمن."
            : "Use the private confirmation link shown after checkout. Order-number tracking is unavailable until secure contact verification is configured."}
        </p>
      </div>
    );
  else if (route === "credits") {
    const credits = (await import("@/lib/asset-credits.json")).default;
    content = (
      <div className="shell section narrow">
        <h1>{locale === "ar" ? "مصادر الصور" : "Image credits"}</h1>
        <p>
          {locale === "ar"
            ? "خلفية الطريق وبطاقات العلامات في الصفحة الرئيسية رسوم مولدة بالذكاء الاصطناعي. ليست صوراً لإثبات الموديل أو السنة أو توافق القطع."
            : "The homepage road scene and four automotive brand-card backgrounds are AI-generated illustrations. They are not evidence of model year or part compatibility."}
        </p>
        <p>
          {locale === "ar"
            ? "الصور توضيحية للموديل ولا تثبت التوافق مع السنة أو المحرك. تم قص الصور وتعتيمها في التصميم."
            : "Photographs illustrate model names; they do not establish year or engine fitment. Images are cropped and darkened in the design."}
        </p>
        <p>
          {locale === "ar" ? "صورة المنظر السابقة: " : "Legacy landscape: "}
          <a href="https://unsplash.com/license">Unsplash license</a> ·{" "}
          <a href="https://images.unsplash.com/photo-1500534623283-312aade485b7">
            Original image
          </a>
        </p>
        {credits.map((c) => (
          <article key={c.title} className="accordion">
            <h3>{c.title}</h3>
            <p>{c.artist}</p>
            <a href={c.descriptionUrl}>
              {c.license} · {locale === "ar" ? "المصدر" : "Source"}
            </a>
          </article>
        ))}
      </div>
    );
  } else if (
    ["about", "contact", "faq", "guides"].includes(route) ||
    path[0] === "guides" ||
    path[0] === "policies"
  ) {
    const allowed = ["privacy", "terms", "shipping", "returns", "warranty"];
    if (
      path[0] === "policies" &&
      (!allowed.includes(path[1]) || path.length !== 2)
    )
      notFound();
    let cms = null;
    if (configured()) {
      const { data } = await service()
        .from("cms_pages")
        .select("*")
        .eq("slug", path.join("/"))
        .eq("published", true)
        .maybeSingle();
      cms = data;
    }
    const builtInGuide =
      path[0] === "guides" && path.length === 2
        ? buyingGuides.find((g) => g.slug === path[1])
        : undefined;
    if (path[0] === "guides" && path.length > 1 && !cms && !builtInGuide)
      notFound();
    const guidePages =
      route === "guides" && path.length === 1 && configured()
        ? ((
            await service()
              .from("cms_pages")
              .select("slug,title")
              .like("slug", "guides/%")
              .eq("published", true)
              .order("slug")
          ).data ?? [])
        : [];
    content =
      builtInGuide && !cms ? (
        <BuyingGuide guide={builtInGuide} locale={locale} />
      ) : (
        <div className="shell section narrow">
          <Breadcrumb
            locale={locale}
            items={[
              ...(path[0] === "guides" && path.length > 1
                ? [{ label: w.guides, href: `/${locale}/guides` }]
                : []),
              {
                label: cms?.title[locale] ?? route.replaceAll("/", " / "),
                href: `/${locale}/${route}`,
              },
            ]}
          />
          <span className="eyebrow">
            {locale === "ar" ? "موبِك / معلومات" : "MOPC / INFORMATION"}
          </span>
          <h1>
            {cms?.title[locale] ??
              {
                about: locale === "ar" ? "من نحن" : "About MOPC",
                contact: locale === "ar" ? "تواصل معنا" : "Contact",
                faq:
                  locale === "ar"
                    ? "أسئلة شائعة"
                    : "Frequently asked questions",
                guides: w.guides,
              }[route] ??
              (locale === "ar" ? "السياسات" : "Policies")}
          </h1>
          {route === "guides" && (
            <div className="stack">
              {buyingGuides
                .filter(
                  (g) =>
                    !guidePages.some(
                      (page) => page.slug === `guides/${g.slug}`,
                    ),
                )
                .map((g) => (
                  <Link
                    className="panel"
                    key={g.slug}
                    href={`/${locale}/guides/${g.slug}`}
                  >
                    <h2>{g.title[locale]}</h2>
                    <p>{g.description[locale]}</p>
                  </Link>
                ))}
            </div>
          )}
          {guidePages.length > 0 && (
            <div className="stack">
              {guidePages.map((guide) => (
                <Link
                  className="panel"
                  key={guide.slug}
                  href={`/${locale}/${guide.slug}`}
                >
                  {guide.title[locale]} ↗
                </Link>
              ))}
            </div>
          )}
          {route === "contact" && (
            <ContactForm locale={locale} enabled={configured()} />
          )}
          {path[0] === "policies" &&
            ["shipping", "returns", "warranty"].includes(path[1]) &&
            cms && (
              <Link
                className="button secondary"
                href={`/${locale}/contact#callback`}
              >
                {locale === "ar"
                  ? "اطلب تواصل بخصوص هذه السياسة"
                  : "Request help with this policy"}{" "}
                ↗
              </Link>
            )}
          {cms ? (
            <div className="stack">
              {cms.body[locale]
                .split(/\n\s*\n/)
                .map((paragraph: string, index: number) => (
                  <p className="prose" key={index}>
                    {paragraph}
                  </p>
                ))}
            </div>
          ) : route === "guides" || route === "contact" ? null : route ===
            "about" ? (
            <p className="lead">
              {w.intro} {w.demo}
            </p>
          ) : route === "faq" ? (
            <StoreQuestions locale={locale} />
          ) : (
            <p className="notice">
              {locale === "ar"
                ? "هذا المحتوى ينتظر اعتماد التاجر قبل الإطلاق. معلومات الاتصال والسياسات والدليل غير معتمدة بعد."
                : "This content awaits merchant approval before launch. Contact information, policies and guides have not been approved yet."}
            </p>
          )}
        </div>
      );
  } else notFound();
  return (
    <Shell locale={locale} vehicle={vehicle} home={!route}>
      {content}
    </Shell>
  );
}
function Breadcrumb({
  locale,
  items,
}: {
  locale: Locale;
  items: { label: string; href: string }[];
}) {
  const crumbs = [
    { label: locale === "ar" ? "الرئيسية" : "Home", href: `/${locale}` },
    ...items,
  ];
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <>
      <nav
        className="breadcrumbs"
        aria-label={locale === "ar" ? "مسار التصفح" : "Breadcrumb"}
      >
        {crumbs.map((item, i) => (
          <span key={item.href}>
            {i > 0 ? " / " : ""}
            {i === crumbs.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.label,
              item: new URL(c.href, base).href,
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
