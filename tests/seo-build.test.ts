import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPage, categoryLandingIndexable } from "../src/lib/seo-policy";
import { sitemapPublished } from "../src/lib/sitemap-visibility";
import { knownBrandRoute } from "../src/lib/seo-brand-route";
import { rootLocaleRedirect, legacyVehicleModelRedirect } from "../src/lib/site-url";
import { sitemapIndex, sitemapXml, sitemapGroups } from "../src/lib/sitemap-xml";
import { collectSearchPages, cmsTranslatedLocales, vehicleLandingLocales, searchPagesForLocale, duplicateModelCategory } from "../src/lib/seo-inventory";
import { sitemapFitmentCounts } from "../src/lib/seo-fitment-counts";
import { demoProducts } from "../src/lib/catalog";
import { brandModelBuyingNotes, targetModel } from "../src/lib/vehicle-coverage";
import { brandModelListSchema } from "../src/lib/brand-model-schema";
import { modelCategorySearchCopy } from "../src/lib/vehicle-landing-seo";
import { modelCategoryBrowsePaths } from "../src/lib/model-category-navigation";
import { planImportVehicles } from "../src/lib/import-vehicles";
import { canonicalVehicleModelSlug, resolveImportModelAlias } from "../src/lib/vehicle-model-aliases";

const brand = { slug: "opel", name: "Opel", ar: "أوبل", models: ["astra-j"] };
const modelNames = [
  { brand: "opel", slug: "astra-j", name: { ar: "أسترا J", en: "Astra J" } },
];
const categories = [
  { slug: "filters", name: { ar: "فلاتر", en: "Filters" } },
  { slug: "brakes", name: { ar: "فرامل", en: "Brakes" } },
];

test("canonical pagination on make/model/category URLs retains page number but excludes facets", () => {
  assert.equal(canonicalPage("/ar/brands/opel/astra-j/filters", { page: "2" }), "/ar/brands/opel/astra-j/filters?page=2");
  assert.equal(canonicalPage("/en/brands/opel/astra-j/filters", { page: "3", utm_source: "ad" }), "/en/brands/opel/astra-j/filters?page=3");
  assert.equal(canonicalPage("/ar/brands/opel/astra-j/filters", { page: "2", year: "2019" }), "/ar/brands/opel/astra-j/filters");
  assert.equal(canonicalPage("/ar/brands/opel/astra-j/filters", { page: "1" }), "/ar/brands/opel/astra-j/filters");
});

test("HTML sitemap differentiates repeated part names with their maker and part number", () => {
  const entries = collectSearchPages({
    brands: [], modelNames: [], categories: [], cms: [], guides: [],
    products: [
      { ...demoProducts[0], demo: false, status: "published", price: 10000,
        name: { ar: "فلتر زيت", en: "Oil Filter" }, manufacturer: "GM", partNumber: "12345678",
        slug: "oil-filter-gm-p-11111111-1111-4111-8111-111111111111" },
      { ...demoProducts[0], id: "22222222-2222-4222-8222-222222222222", demo: false,
        status: "published", price: 10000, name: { ar: "فلتر زيت", en: "Oil Filter" },
        manufacturer: "Bosch", partNumber: "87654321",
        slug: "oil-filter-bosch-p-22222222-2222-4222-8222-222222222222" },
    ],
  });
  const products = entries.filter((entry) => entry.kind === "product");
  assert.equal(products.length, 2);
  assert.equal(products[0].title.ar, "فلتر زيت");
  assert.notEqual(products[0].linkTitle?.ar, products[1].linkTitle?.ar);
  assert.ok(products[0].linkTitle?.ar.includes("12345678"));
  assert.ok(products[1].linkTitle?.en.includes("Bosch"));
  const html = readFileSync("src/components/site-map.tsx", "utf8");
  assert.ok(html.includes("p.linkTitle?.[locale] ?? p.title[locale]"));
});

test("verified car make and model lead sitemap anchors; unknown fitment safely keeps part number", () => {
  const product = {
    ...demoProducts[0], demo: false, status: "published" as const, price: 10000,
    name: { ar: "فلتر زيت", en: "Oil Filter" }, manufacturer: "GM",
    partNumber: "12345678",
  };
  const one = collectSearchPages({
    brands: [], modelNames: [], categories: [], cms: [], guides: [],
    products: [product],
    productVehicleLabels: {
      [product.id]: [{ ar: "أوبل أسترا J", en: "Opel Astra J" }],
    },
  }).find((entry) => entry.kind === "product");
  assert.equal(one?.linkTitle?.ar, "فلتر زيت – أوبل أسترا J – GM – رقم القطعة 12345678");
  assert.equal(one?.linkTitle?.en, "Oil Filter – Opel Astra J – GM – Part 12345678");
  assert.ok(one?.linkTitle?.ar.includes("12345678"));

  const several = collectSearchPages({
    brands: [], modelNames: [], categories: [], cms: [], guides: [],
    products: [product],
    productVehicleLabels: {
      [product.id]: [
        { ar: "أوبل أسترا J", en: "Opel Astra J" },
        { ar: "شيفروليه كروز", en: "Chevrolet Cruze" },
        { ar: "شيفروليه ماليبو", en: "Chevrolet Malibu" },
      ],
    },
  }).find((entry) => entry.kind === "product");
  assert.ok(several?.linkTitle?.ar.includes("وموديلات أخرى"));
  assert.ok(several?.linkTitle?.en.includes("and other models"));
  assert.ok(several?.linkTitle?.ar.includes("رقم القطعة 12345678"));
  assert.ok(several?.linkTitle?.en.includes("Part 12345678"));
  assert.equal(one?.path, several?.path);
  const unknown = collectSearchPages({
    brands: [], modelNames: [], categories: [], cms: [], guides: [],
    products: [product],
  }).find((entry) => entry.kind === "product");
  assert.ok(unknown?.linkTitle?.ar.includes("رقم القطعة 12345678"));
});

test("same car model and maker get distinct sitemap links for different part numbers", () => {
  const common = {
    ...demoProducts[0], demo: false, status: "published" as const, price: 10000,
    name: { ar: "فلتر زيت", en: "Oil Filter" }, manufacturer: "GM",
  };
  const one = { ...common, id: "a", slug: "filter-one-p-11111111-1111-4111-8111-111111111111", partNumber: "555111" };
  const two = { ...common, id: "b", slug: "filter-two-p-22222222-2222-4222-8222-222222222222", partNumber: "555222" };
  const entries = collectSearchPages({
    brands: [], modelNames: [], categories: [], cms: [], guides: [],
    products: [one, two],
    productVehicleLabels: {
      a: [{ ar: "أوبل أسترا J", en: "Opel Astra J" }],
      b: [{ ar: "أوبل أسترا J", en: "Opel Astra J" }],
    },
  }).filter((entry) => entry.kind === "product");
  assert.equal(entries.length, 2);
  assert.notEqual(entries[0].linkTitle?.ar, entries[1].linkTitle?.ar);
  assert.notEqual(entries[0].linkTitle?.en, entries[1].linkTitle?.en);
  assert.ok(entries[0].linkTitle?.ar.includes("555111"));
  assert.ok(entries[1].linkTitle?.ar.includes("555222"));
});

test("index XML has expected groups and correctly escapes origin", () => {
  const xml = sitemapIndex("https://mopc.store");
  assert.ok(xml.includes("https://mopc.store/sitemaps/vehicles.xml"));
  assert.equal((xml.match(/<sitemap>/g) ?? []).length, sitemapGroups.length);
});

test("vehicle sitemaps only include recorded inventory-backed model/categories", () => {
  const pages = collectSearchPages({
    brands: [brand], modelNames, categories, cms: [], guides: [], products: [],
    modelCounts: { "opel/astra-j": 1 },
    modelCategoryCounts: { "opel/astra-j/filters": 3, "opel/astra-j/brakes": 0 },
  });
  assert.ok(pages.some((page) => page.path === "/brands/opel/astra-j/filters"));
  assert.ok(!pages.some((page) => page.path === "/brands/opel/astra-j/brakes"));
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  assert.ok(xml.includes("https://mopc.store/ar/brands/opel/astra-j/filters"));
  assert.ok(!xml.includes("/astra-j/brakes"));
  assert.ok(!sitemapXml(pages, "https://mopc.store", "products").includes("astra-j/filters"));
});

test("hreflang declarations are reciprocal for bilingual vehicle pages", () => {
  const pages = collectSearchPages({
    brands: [brand], modelNames, categories, cms: [], guides: [], products: [],
    modelCounts: { "opel/astra-j": 2 },
    modelCategoryCounts: { "opel/astra-j/filters": 1 },
  });
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  for (const language of ["ar", "en"]) {
    const path = `https://mopc.store/${language}/brands/opel/astra-j/filters`;
    assert.ok(xml.includes(`<loc>${path}</loc>`));
  }
  assert.ok(xml.includes('hreflang="ar-EG" href="https://mopc.store/ar/brands/opel/astra-j/filters"'));
  assert.ok(xml.includes('hreflang="en-EG" href="https://mopc.store/en/brands/opel/astra-j/filters"'));
});

test("a page without a real English translation does not claim an en hreflang", () => {
  const xml = sitemapXml([{
    path: "/products/recorded-item", kind: "product" as const,
    title: { ar: "فلتر هواء", en: "" }, locales: ["ar" as const],
  }], "https://mopc.store", "products");
  assert.ok(xml.includes("https://mopc.store/ar/products/recorded-item"));
  assert.ok(!xml.includes("https://mopc.store/en/products/recorded-item"));
  assert.ok(xml.includes('hreflang="ar-EG"'));
  assert.ok(!xml.includes('hreflang="en-EG"'));
});

test("XML escapes special characters and never fabricates a lastmod date", () => {
  const xml = sitemapXml([{
    path: "/products/part", kind: "product" as const,
    title: { ar: "قطعة", en: "Part" },
    images: ["/product.jpg?a=1&b=2"],
  }], "https://mopc.store", "products");
  assert.ok(xml.includes("/product.jpg?a=1&amp;b=2"));
  assert.ok(!xml.includes("<lastmod>"));
});

test("sitemaps stay unpublished unless launch, environment and catalog access all allow crawling", () => {
  const production = {
    STORE_LAUNCH_APPROVED: "true", VERCEL_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://db.example",
  };
  assert.equal(sitemapPublished(production), true);
  assert.equal(sitemapPublished({ ...production, VERCEL_ENV: "preview" }), false);
  assert.equal(sitemapPublished({ ...production, STORE_LAUNCH_APPROVED: "false" }), false);
  assert.equal(sitemapPublished({ ...production, NEXT_PUBLIC_SUPABASE_URL: "" }), false);
});


test("no-inventory brands are excluded without hiding brands with confirmed model inventory", () => {
  const pages = collectSearchPages({
    brands: [
      brand,
      { slug: "empty", name: "Empty", ar: "فارغ", models: ["placeholder"] },
    ],
    modelNames,
    categories,
    cms: [], guides: [], products: [],
    modelCounts: { "opel/astra-j": 2, "empty/placeholder": 0 },
    modelCategoryCounts: { "opel/astra-j/filters": 2 },
  });
  assert.ok(pages.some((page) => page.path === "/brands/opel"));
  assert.ok(!pages.some((page) => page.path === "/brands/empty"));
  assert.ok(!sitemapXml(pages, "https://mopc.store", "vehicles").includes("/brands/empty"));
});

test("untranslated categories and model names do not create fabricated hreflang URLs", () => {
  const pages = collectSearchPages({
    brands: [brand],
    modelNames: [{ brand: "opel", slug: "astra-j", name: { ar: "أسترا J", en: "أسترا J" } }],
    categories: [{ slug: "filters", name: { ar: "فلاتر", en: "فلاتر" } }],
    cms: [], guides: [],
    products: [{ ...({
      id: "a", sku: "A", slug: "a", name: { ar: "فلتر زيت", en: "Oil filter" },
      description: { ar: "فلتر زيت موثق", en: "Recorded oil filter" },
      manufacturer: "Brand", category: "filters", family: "filters", type: "aftermarket",
      price: 10000, sale: null, partNumber: "P1", demo: false, orderable: true,
      status: "published", specs: {},
    } as const) }],
    modelCounts: { "opel/astra-j": 2 },
    modelCategoryCounts: { "opel/astra-j/filters": 1 },
  });
  const categoryPage = pages.find((page) => page.path === "/categories/filters");
  assert.deepEqual(categoryPage?.locales, ["ar"]);
  const modelPage = pages.find((page) => page.path === "/brands/opel/astra-j");
  assert.deepEqual(modelPage?.locales, ["ar"]);
  const modelCategoryPage = pages.find((page) => page.path === "/brands/opel/astra-j/filters");
  assert.deepEqual(modelCategoryPage?.locales, ["ar"]);
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  assert.ok(xml.includes("https://mopc.store/ar/brands/opel/astra-j/filters"));
  assert.ok(!xml.includes("https://mopc.store/en/brands/opel/astra-j/filters"));
});


test("empty categories and untranslated categories cannot be indexed", () => {
  const category = { ar: "فلاتر", en: "Filters" };
  assert.equal(categoryLandingIndexable(0, category, "ar"), false);
  assert.equal(categoryLandingIndexable(3, category, "ar"), true);
  assert.equal(categoryLandingIndexable(3, category, "en"), true);
  assert.equal(categoryLandingIndexable(3, { ar: "فلاتر", en: "فلاتر" }, "en"), false);
  assert.equal(categoryLandingIndexable(3, undefined, "ar"), false);
  assert.equal(categoryLandingIndexable(Number.NaN, category, "ar"), false);
});


test("model-only fitments without years count once per model and category", () => {
  const product = {
    ...demoProducts[0], id: "filter1", demo: false,
    status: "published", specs: { "car_years:astra-id": "" },
  };
  const counts = sitemapFitmentCounts({
    models: [{ id: "astra-id", brand: "opel", slug: "astra-j" }],
    vehicles: [{ id: "v1", brand: "opel", model: "astra-j" },
      { id: "v2", brand: "opel", model: "astra-j" }],
    products: [product, { ...product, id: "demo", demo: true }],
    fitments: [
      { product_id: "filter1", vehicle_config_id: "v1" },
      { product_id: "filter1", vehicle_config_id: "v1" },
      { product_id: "filter1", vehicle_config_id: "v2" },
    ],
  });
  assert.deepEqual(counts.modelCounts, { "opel/astra-j": 1 });
  assert.deepEqual(counts.modelCategoryCounts, {
    [`opel/astra-j/${product.category}`]: 1,
  });
});

test("separate registered models and eligible products receive independent accurate counts", () => {
  const template = { ...demoProducts[0], demo: false, status: "published" };
  const counts = sitemapFitmentCounts({
    models: [
      { id: "astra-id", brand: "opel", slug: "astra-j" },
      { id: "corsa-id", brand: "opel", slug: "corsa" },
    ],
    vehicles: [
      { id: "v1", brand: "opel", model: "astra-j" },
      { id: "v2", brand: "opel", model: "corsa" },
      { id: "orphan", brand: "another", model: "unknown" },
    ],
    products: [
      { ...template, id: "a", category: "filters", specs: {
        "car_years:astra-id": "", "car_years:corsa-id": "2020",
      } },
      { ...template, id: "b", category: "brakes", specs: {} },
      { ...template, id: "c", demo: true, specs: { "car_years:astra-id": "" } },
      { ...template, id: "d", status: "draft", specs: { "car_years:astra-id": "" } },
    ],
    fitments: [
      { product_id: "b", vehicle_config_id: "v1" },
      { product_id: "b", vehicle_config_id: "v2" },
      { product_id: "b", vehicle_config_id: "orphan" },
      { product_id: "not-found", vehicle_config_id: "v1" },
    ],
  });
  assert.deepEqual(counts.modelCounts, {
    "opel/astra-j": 2,
    "opel/corsa": 2,
  });
  assert.deepEqual(counts.modelCategoryCounts, {
    "opel/astra-j/filters": 1,
    "opel/corsa/filters": 1,
    "opel/astra-j/brakes": 1,
    "opel/corsa/brakes": 1,
  });
});


test("CMS metadata and sitemap use the same verified language availability", () => {
  const title = { ar: "معلومات الشحن", en: "معلومات الشحن" };
  assert.deepEqual(cmsTranslatedLocales(title), ["ar"]);
  assert.deepEqual(cmsTranslatedLocales({ ar: "معلومات الشحن", en: "Shipping details" }), ["ar", "en"]);
  const pages = collectSearchPages({
    brands: [], modelNames: [], categories: [], guides: [], products: [],
    cms: [{
      slug: "guides/shipping-help",
      title,
      published: true,
      seo_updated_at: null,
    }],
  });
  const guide = pages.find((page) => page.path === "/guides/shipping-help");
  assert.deepEqual(guide?.locales, ["ar"]);
  const xml = sitemapXml(pages, "https://mopc.store", "guides");
  assert.ok(xml.includes("https://mopc.store/ar/guides/shipping-help"));
  assert.ok(!xml.includes("https://mopc.store/en/guides/shipping-help"));
  assert.ok(!xml.includes('hreflang="en-EG" href="https://mopc.store/en/guides/shipping-help"'));
});


test("global loading overlay is removed so navigation shows content directly", () => {
  assert.equal(existsSync("src/app/loading.tsx"), false);
  assert.equal(existsSync("src/app/loading.module.css"), false);
});

test("brand/category route allows five segments but rejects nonexistent makes and models", () => {
  const brands = [{ slug: "opel" }];
  const models = [{ brand: "opel", slug: "astra-j" }];
  assert.equal(knownBrandRoute(["ar", "brands", "opel"], brands, models), true);
  assert.equal(knownBrandRoute(["ar", "brands", "opel", "astra-j"], brands, models), true);
  assert.equal(knownBrandRoute(["ar", "brands", "opel", "astra-j", "filters"], brands, models), true);
  assert.equal(knownBrandRoute(["en", "brands", "opel", "astra-j", "mechanical-parts"], brands, models), true);
  assert.equal(knownBrandRoute(["ar", "brands", "opel", "astra-j", "filters", "extra"], brands, models), false);
  assert.equal(knownBrandRoute(["ar", "brands", "missing", "astra-j", "filters"], brands, models), false);
  assert.equal(knownBrandRoute(["ar", "brands", "opel", "missing", "filters"], brands, models), false);
  assert.equal(knownBrandRoute(["ar", "brands", "opel", "", "filters"], brands, models), false);
});

test("bare homepage always redirects to locale canonical while preserving non-root requests", () => {
  assert.equal(rootLocaleRedirect(new URL("https://mopc.store/"))?.href, "https://mopc.store/ar");
  assert.equal(rootLocaleRedirect(new URL("https://mopc.store/?source=ad"))?.href, "https://mopc.store/ar?source=ad");
  assert.equal(rootLocaleRedirect(new URL("https://mopc.store/ar")), null);
  assert.equal(rootLocaleRedirect(new URL("https://mopc.store/ar/brands/opel/astra-j/filters")), null);
});

test("numeric and short-code model URLs remain discoverable in both languages when inventory exists", () => {
  const makes = [
    { slug: "mg", ar: "إم جي", name: "MG", models: ["5", "6", "hs"] },
    { slug: "peugeot", ar: "بيجو", name: "Peugeot", models: ["2008"] },
  ];
  const models = [
    { brand: "mg", slug: "5", name: { ar: "5", en: "5" } },
    { brand: "mg", slug: "6", name: { ar: "6", en: "6" } },
    { brand: "mg", slug: "hs", name: { ar: "HS", en: "HS" } },
    { brand: "peugeot", slug: "2008", name: { ar: "2008", en: "2008" } },
  ];
  assert.deepEqual(vehicleLandingLocales({ ar: "إم جي", en: "MG" }, { ar: "5", en: "5" }), ["ar", "en"]);
  assert.deepEqual(vehicleLandingLocales({ ar: "بيجو", en: "Peugeot" }, { ar: "2008", en: "2008" }), ["ar", "en"]);
  const pages = collectSearchPages({
    brands: makes, modelNames: models,
    categories: [{ slug: "filters", name: { ar: "فلاتر", en: "Filters" } }],
    products: [], cms: [], guides: [],
    modelCounts: { "mg/5": 2, "mg/6": 2, "mg/hs": 1, "peugeot/2008": 3 },
    modelCategoryCounts: { "mg/5/filters": 1, "peugeot/2008/filters": 2 },
  });
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  for (const slug of ["mg/5", "mg/6", "mg/hs", "peugeot/2008", "mg/5/filters", "peugeot/2008/filters"]) {
    for (const lang of ["ar", "en"]) {
      assert.ok(xml.includes(`<loc>https://mopc.store/${lang}/brands/${slug}</loc>`), `${slug} missing ${lang}`);
    }
  }
});

test("brand display name does not conceal untranslated model or category locale", () => {
  const makes = [{ slug: "opel", ar: "أوبل", name: "Opel", models: ["astra-j"] }];
  const pages = collectSearchPages({
    brands: makes,
    modelNames: [{ brand: "opel", slug: "astra-j", name: { ar: "استرا J", en: "استرا J" } }],
    categories: [{ slug: "filters", name: { ar: "فلاتر", en: "فلاتر" } }],
    products: [], cms: [], guides: [],
    modelCounts: { "opel/astra-j": 2 },
    modelCategoryCounts: { "opel/astra-j/filters": 1 },
  });
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  assert.ok(xml.includes("https://mopc.store/ar/brands/opel/astra-j"));
  assert.ok(!xml.includes("<loc>https://mopc.store/en/brands/opel/astra-j</loc>"));
  assert.ok(!xml.includes("https://mopc.store/en/brands/opel/astra-j/filters"));
});

test("HTML site map never advertises a locale missing from XML sitemap", () => {
  const pages = collectSearchPages({
    brands: [{ slug: "opel", name: "Opel", ar: "أوبل", models: ["astra-j"] }],
    modelNames: [{ brand: "opel", slug: "astra-j", name: { ar: "استرا J", en: "استرا J" } }],
    categories: [], products: [], cms: [], guides: [],
    modelCounts: { "opel/astra-j": 1 }, modelCategoryCounts: {},
  });
  const arPages = searchPagesForLocale(pages, "ar");
  const enPages = searchPagesForLocale(pages, "en");
  assert.ok(arPages.some((p) => p.path === "/brands/opel/astra-j"));
  assert.ok(!enPages.some((p) => p.path === "/brands/opel/astra-j"));
  assert.ok(enPages.some((p) => p.path === "/brands/opel"));
});

test("catalog sitemap indexes eligible inventory and photos without leaking draft or demo products", () => {
  const base = {
    ...demoProducts[0], status: "published", demo: false,
    name: { ar: "فلتر هواء", en: "Air filter" },
    manufacturer: "GM", partNumber: "GM-1234", price: 15000,
  } as const;
  const products = [
    { ...base, id: "a", slug: "filter-a", category: "filters" },
    { ...base, id: "b", slug: "filter-b", category: "filters" },
    { ...base, id: "c", slug: "brake-c", category: "brakes", status: "draft" as const },
    { ...base, id: "d", slug: "brake-d", category: "brakes", demo: true },
  ];
  const pages = collectSearchPages({
    brands: [], modelNames: [],
    categories: [
      { slug: "filters", name: { ar: "فلاتر", en: "Filters" } },
      { slug: "brakes", name: { ar: "فرامل", en: "Brakes" } },
    ],
    products, cms: [], guides: [],
    productImages: [
      { id: "img-a1", product_id: "a", path: "/private/a1.webp" },
      { id: "img-b1", product_id: "b", path: "https://cdn.example.org/b1.webp" },
      { id: "img-a2", product_id: "a", path: "/private/a2.webp" },
      { id: "img-c1", product_id: "c", path: "/private/draft.webp" },
    ],
  });
  assert.ok(pages.some((p) => p.path === "/categories/filters"));
  assert.ok(!pages.some((p) => p.path === "/categories/brakes"));
  assert.ok(pages.some((p) => p.path === "/products/filter-a"));
  assert.ok(!pages.some((p) => p.path === "/products/brake-c"));
  assert.ok(!pages.some((p) => p.path === "/products/brake-d"));
  const a = pages.find((p) => p.path === "/products/filter-a");
  assert.deepEqual(a?.images, ["/product-media/img-a1", "/product-media/img-a2"]);
  const xml = sitemapXml(pages, "https://mopc.store", "products");
  assert.ok(xml.includes("<image:loc>https://mopc.store/product-media/img-a1</image:loc>"));
  assert.ok(xml.includes("<image:loc>https://mopc.store/product-media/img-a2</image:loc>"));
  assert.ok(xml.includes("<image:loc>https://cdn.example.org/b1.webp</image:loc>"));
  assert.ok(!xml.includes("draft.webp"));
});

test("brand buying advice is curated per actual model and never invents fitment", () => {
  const notes = brandModelBuyingNotes("chevrolet", [
    { slug: "captiva", name: { ar: "كابتيفا", en: "Captiva" } },
    { slug: "unknown-model", name: { ar: "موديل", en: "Unknown model" } },
    { slug: "cruze", name: { ar: "كروز", en: "Cruze" } },
  ]);
  assert.deepEqual(notes.map((entry) => entry.slug), ["captiva", "cruze"]);
  assert.match(notes[0].note.ar, /سنة الصنع/);
  assert.match(notes[0].note.en, /part number/);
  assert.equal(brandModelBuyingNotes("unlisted-make", [{ slug: "captiva", name: { ar: "كابتيفا", en: "Captiva" } }]).length, 0);
});

test("brand page replaces blanket original-parts promises with model-specific labels", () => {
  const source = readFileSync("src/components/car-model-page.tsx", "utf8");
  assert.ok(source.includes("brandModelBuyingNotes"));
  assert.ok(source.includes("model-buying-notes-heading"));
  assert.ok(source.includes("/brands/"));
  assert.ok(!source.includes("Original & After Market parts"));
  assert.ok(!source.includes("الأصلية و"));
});

test("brand model structured data uses only registered displayed models and genuine URLs", () => {
  const schema = brandModelListSchema({
    locale: "ar",
    make: { slug: "mg", ar: "إم جي", name: "MG" },
    models: [
      { slug: "5", name: { ar: "5", en: "5" } },
      { slug: "hs", name: { ar: "HS", en: "HS" } },
      { slug: "", name: { ar: "", en: "" } },
    ],
    origin: "https://mopc.store",
  });
  assert.equal(schema["@type"], "ItemList");
  assert.equal(schema.numberOfItems, 2);
  assert.deepEqual(schema.itemListElement.map((row) => row.position), [1, 2]);
  assert.deepEqual(schema.itemListElement.map((row) => row.url), [
    "https://mopc.store/ar/brands/mg/5",
    "https://mopc.store/ar/brands/mg/hs",
  ]);
  assert.ok(schema.itemListElement[0].name.includes("إم جي 5"));
  const english = brandModelListSchema({
    locale: "en",
    make: { slug: "chevrolet", ar: "شيفروليه", name: "Chevrolet" },
    models: [{ slug: "captiva", name: { ar: "كابتيفا", en: "Captiva" } }],
    origin: "https://mopc.store",
  });
  assert.equal(english.itemListElement[0].url, "https://mopc.store/en/brands/chevrolet/captiva");
  assert.equal(english.itemListElement[0].name, "Chevrolet Captiva");
});

test("car brand page publishes ItemList markup but does not claim product-level fitment", () => {
  const source = readFileSync("src/components/car-model-page.tsx", "utf8");
  assert.match(source, /brandModelListSchema/);
  assert.match(source, /application\/ld\+json/);
});

test("known car spelling aliases resolve only to already registered canonical models", () => {
  const models = [
    { id: "legacy", brand: "chevrolet", slug: "cruz" },
    { id: "canonical", brand: "chevrolet", slug: "cruze" },
  ];
  assert.equal(canonicalVehicleModelSlug("chevrolet", "cruz"), "cruze");
  assert.equal(canonicalVehicleModelSlug("opel", "insginia-a"), "insignia-a");
  assert.equal(canonicalVehicleModelSlug("mg", "5"), "5");
  assert.equal(resolveImportModelAlias("chevrolet", models[0], models).id, "canonical");
  assert.equal(resolveImportModelAlias("chevrolet", models[0], [models[0]]).id, "legacy");
});

test("new Excel imports avoid duplicate Cruz/Cruze and Insignia spelling model fitments", () => {
  const brands = [
    { slug: "chevrolet", name: "Chevrolet", ar: "شيفروليه" },
    { slug: "opel", name: "Opel", ar: "أوبل" },
  ];
  const models = [
    { id: "legacy-cruz", brand: "chevrolet", slug: "cruz", name: { ar: "Cruz", en: "Cruz" } },
    { id: "canonical-cruze", brand: "chevrolet", slug: "cruze", name: { ar: "كروز", en: "Cruze" } },
    { id: "legacy-insginia", brand: "opel", slug: "insginia-a", name: { ar: "انسيجنيا", en: "Insginia A" } },
    { id: "canonical-insignia", brand: "opel", slug: "insignia-a", name: { ar: "إنسيجنيا A", en: "Insignia A" } },
  ];
  const rows = [
    { spreadsheet: true, applications_input: [{ make: "Chevrolet", model: "Cruz", years: "all" }] },
    { spreadsheet: true, applications_input: [{ make: "Opel", model: "insginia-a", years: "all" }] },
  ];
  const result = planImportVehicles(rows, models, brands, [
    { model_id: "canonical-cruze", year: 2018 },
    { model_id: "canonical-insignia", year: 2015 },
  ]);
  assert.deepEqual(result.rows[0].applications_input, [{ make: "chevrolet", model: "cruze", years: [2018] }]);
  assert.deepEqual(result.rows[1].applications_input, [{ make: "opel", model: "insignia-a", years: [2015] }]);
  assert.equal(result.additions.length, 0);
  const legacyOnly = planImportVehicles([rows[0]], [models[0]], brands, [{ model_id: "legacy-cruz", year: 2019 }]);
  assert.deepEqual(legacyOnly.rows[0].applications_input, [{ make: "chevrolet", model: "cruz", years: [2019] }]);
});

test("vehicle consolidation SQL is opt-in, transactional and retains legacy records until audit", () => {
  const audit = readFileSync("scripts/seo/vehicle-model-alias-audit.sql", "utf8");
  const sql = readFileSync("scripts/seo/vehicle-model-alias-merge.sql", "utf8");
  assert.ok(audit.includes("legacy_product_fitments"));
  assert.ok(audit.includes("legacy_garage_vehicles"));
  assert.ok(audit.includes("legacy_product_applications"));
  assert.ok(sql.includes("BEGIN;"));
  assert.ok(sql.includes("COMMIT;"));
  assert.ok(sql.includes("mopc.allow_vehicle_alias_merge"));
  assert.ok(sql.includes("Overlapping exact configs"));
  assert.ok(sql.includes("public.vehicle_generations"));
  assert.ok(sql.includes("public.vehicle_model_years"));
  assert.ok(sql.includes("public.vehicle_configs"));
  assert.ok(sql.includes("public.products"));
  assert.ok(!/DELETE FROM public\\.vehicle_models/i.test(sql));
});

test("old vehicle typo routes redirect permanently to canonical model and category paths", () => {
  const cases = [
    ["https://mopc.store/ar/brands/chevrolet/cruz", "https://mopc.store/ar/brands/chevrolet/cruze"],
    ["https://mopc.store/en/brands/chevrolet/cruz/spare-parts", "https://mopc.store/en/brands/chevrolet/cruze/spare-parts"],
    ["https://mopc.store/ar/brands/opel/insginia-a?year=2015", "https://mopc.store/ar/brands/opel/insignia-a?year=2015"],
    ["https://mopc.store/en/brands/opel/insginia-a/mechanical-parts?page=2", "https://mopc.store/en/brands/opel/insignia-a/mechanical-parts?page=2"],
  ] as const;
  for (const [from, to] of cases)
    assert.equal(legacyVehicleModelRedirect(new URL(from))?.href, to);
  for (const unchanged of [
    "https://mopc.store/ar/brands/chevrolet/cruze",
    "https://mopc.store/ar/brands/opel/insignia-a",
    "https://mopc.store/ar/brands/opel/insginia-a/filters/deeper",
    "https://mopc.store/api/vehicles",
    "https://mopc.store/en/brands/mg/5",
  ]) assert.equal(legacyVehicleModelRedirect(new URL(unchanged)), null);
});

test("vehicle sitemap gives model landings real inventory lastmod without fabricated dates", () => {
  const make = { slug: "chevrolet", name: "Chevrolet", ar: "شيفروليه", models: ["cruze"] };
  const input = {
    brands: [make],
    modelNames: [{ brand: "chevrolet", slug: "cruze", name: { ar: "كروز", en: "Cruze" } }],
    categories: [
      { slug: "mechanical-parts", name: { ar: "قطع ميكانيكية", en: "Mechanical parts" } },
      { slug: "spare-parts", name: { ar: "قطع غيار", en: "Spare parts" } },
    ],
    products: [], cms: [], guides: [],
    modelCounts: { "chevrolet/cruze": 7 },
    modelCategoryCounts: {
      "chevrolet/cruze/mechanical-parts": 5,
      "chevrolet/cruze/spare-parts": 2,
    },
    modelDates: { "chevrolet/cruze": "2026-11-26T18:59:09Z" },
    modelCategoryDates: {
      "chevrolet/cruze/mechanical-parts": "2026-11-25T12:00:00Z",
    },
  };
  const pages = collectSearchPages(input);
  assert.equal(
    pages.find((p) => p.path === "/brands/chevrolet/cruze")?.lastModified,
    "2026-11-26T18:59:09Z",
  );
  assert.equal(
    pages.find((p) => p.path === "/brands/chevrolet/cruze/mechanical-parts")?.lastModified,
    "2026-11-25T12:00:00Z",
  );
  assert.equal(
    pages.find((p) => p.path === "/brands/chevrolet/cruze/spare-parts")?.lastModified,
    undefined,
  );
  const xml = sitemapXml(pages, "https://mopc.store", "vehicles");
  assert.ok(xml.includes("2026-11-26"));
  assert.ok(xml.includes("2026-11-25"));
  const source = readFileSync("src/lib/seo-pages.ts", "utf8");
  assert.ok(source.includes("if (!eligibleProduct(product) || !changed"));
  assert.ok(source.includes("for (const modelId of compatibleIds.get(product.id)"));
  assert.ok(source.includes("recordNewest(modelDates, key, changed)"));
  assert.ok(source.includes("recordNewest(modelCategoryDates"));
});

test("vehicle sitemap keeps model landing but omits duplicated all-in-one-category landings", () => {
  const make = { slug: "mg", name: "MG", ar: "إم جي", models: ["5", "6"] };
  const models = [
    { brand: "mg", slug: "5", name: { ar: "5", en: "5" } },
    { brand: "mg", slug: "6", name: { ar: "6", en: "6" } },
  ];
  const listed = collectSearchPages({
    brands: [make], modelNames: models,
    categories: [
      { slug: "spare-parts", name: { ar: "قطع غيار", en: "Spare parts" } },
      { slug: "mechanical-parts", name: { ar: "قطع ميكانيكية", en: "Mechanical parts" } },
    ],
    cms: [], guides: [], products: [],
    modelCounts: { "mg/5": 1, "mg/6": 5 },
    modelCategoryCounts: {
      "mg/5/spare-parts": 1,
      "mg/6/spare-parts": 2,
      "mg/6/mechanical-parts": 3,
    },
  });
  assert.equal(duplicateModelCategory("mg", "5", "spare-parts", { "mg/5": 1 }, { "mg/5/spare-parts": 1 }), true);
  assert.equal(duplicateModelCategory("mg", "5", "spare-parts"), false);
  assert.equal(duplicateModelCategory("mg", "6", "spare-parts", { "mg/6": 5 }, { "mg/6/spare-parts": 2 }), false);
  const xml = sitemapXml(listed, "https://mopc.store", "vehicles");
  for (const lang of ["ar", "en"]) {
    assert.ok(xml.includes(`<loc>https://mopc.store/${lang}/brands/mg/5</loc>`));
    assert.ok(!xml.includes(`<loc>https://mopc.store/${lang}/brands/mg/5/spare-parts</loc>`));
    assert.ok(xml.includes(`<loc>https://mopc.store/${lang}/brands/mg/6/spare-parts</loc>`));
    assert.ok(xml.includes(`<loc>https://mopc.store/${lang}/brands/mg/6/mechanical-parts</loc>`));
  }
});

test("model-category snippets distinguish filtered listings from complete model overview", () => {
  const a = modelCategorySearchCopy({ locale: "ar", make: "شيفروليه", model: "كروز", category: "قطع غيار" });
  const b = modelCategorySearchCopy({ locale: "en", make: "Chevrolet", model: "Cruze", category: "Spare parts" });
  assert.ok(a.title.includes("قسم قطع الغيار شيفروليه كروز"));
  assert.ok(!a.title.includes("قطع غيار قطع غيار"));
  assert.ok(a.description.includes("من المنتجات المسجلة للموديل"));
  assert.ok(b.title.includes("Chevrolet Cruze Spare parts"));
  assert.ok(b.description.includes("Compare part numbers"));
  assert.ok(b.description.length <= 160, b.description);
  for (const model of ["Cruze", "Malibu"]) {
    for (const category of ["Mechanical Parts", "Spare parts"]) {
      const copy = modelCategorySearchCopy({
        locale: "en", make: "Chevrolet", model, category,
      });
      assert.ok(copy.description.length <= 160, copy.description);
    }
  }
  const mechanical = modelCategorySearchCopy({
    locale: "ar", make: "أوبل", model: "أسترا J", category: "قطع ميكانيكية",
  });
  assert.ok(mechanical.title.startsWith("قطع ميكانيكية أوبل أسترا J"));
  assert.ok(!mechanical.title.includes("لموديل"));
  assert.ok(mechanical.description.includes("راجع سنة الصنع والموتور"));
  assert.ok(mechanical.title.length <= 70, mechanical.title);
  assert.ok(a.title.length <= 70, a.title);
  assert.ok(b.title.length <= 70, b.title);
  // The shared metadata layout appends the store name once.
  assert.ok(!a.title.includes("موبِك"));
  assert.ok(!mechanical.title.includes("موبِك"));
  assert.ok(!b.title.includes("MOPC"));
  assert.ok(!a.title.includes("أصلية"));
});

test("robots sitemap is advertised only when the same crawl gate publishes it", () => {
  const source = readFileSync("src/app/robots.ts", "utf8");
  assert.match(source, /const crawlEnabled = sitemapPublished\(\)/);
  assert.match(source, /crawlEnabled \? \{ sitemap: siteOrigin\(\) \+ "\/sitemap\.xml" \} : \{\}/);
  assert.doesNotMatch(source, /^\s*sitemap: siteOrigin\(\) \+ "\/sitemap\.xml",\s*$/m);
});

test("live SEO audit inspects actual sitemaps and canonical links without write operations", () => {
  const source = readFileSync("scripts/seo-live-audit.mjs", "utf8");
  assert.ok(source.includes('get("/robots.txt")'));
  assert.ok(source.includes('get("/sitemap.xml")'));
  assert.ok(source.includes("canonical(page.body)"));
  assert.ok(source.includes("AbortSignal.timeout"));
  assert.ok(!source.includes('method: "POST"'));
});

test("selected car does not hide recorded model SEO links", () => {
  const source = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(source.includes(
    "const compatibleCars = productCardVehicles(raw, { brands, models: vehicleModels }, locale).map(",
  ));
  assert.ok(source.includes("const showApplications = !vehicle && !browsingContext;"));
  assert.ok(!source.includes("const compatibleCars = showApplications"));
  assert.ok(source.includes(".filter((car) => Boolean(car.href))"));
});

test("product pages expose crawlable category and recorded model links without inventing fitment", () => {
  const source = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(source.includes('href={`/${locale}/categories/${p.category}`}'));
  assert.ok(source.includes('compatibleCars\n              .filter((car) => Boolean(car.href))'));
  assert.ok(source.includes('new Map('));
  assert.ok(source.includes(').values()].slice(0, 6)'));
  assert.ok(source.includes('href={car.href!}'));
  assert.ok(source.includes('Verify the part number, model year and engine'));
});

test("model landing JSON-LD lists only actual page products with canonical URLs", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes('const publicModelCollection ='));
  assert.ok(page.includes('modelListing && listingBrand && listingModel && !vehicle &&'));
  assert.ok(page.includes('!q.q && !q.year && !q.sort && !q.manufacturer && !q.type'));
  assert.ok(page.includes('canonicalPage(`/${locale}/${route}`, { page: q.page })'));
  assert.ok(page.includes('"@type": "CollectionPage"'));
  assert.ok(page.includes('"@type": "ItemList"'));
  assert.ok(page.includes('"@type": "ListItem"'));
  assert.ok(page.includes('numberOfItems: visible.length'));
  assert.ok(page.includes('publicProductSlug(item)'));
  assert.ok(page.includes('{publicModelCollection && ('));
  assert.ok(!page.includes('aggregateRating: { ratingValue:'));
});

test("paginated model CollectionPage URL matches canonical despite internal make-model filters", () => {
  const input = {
    make: "chevrolet", model: "cruze", category: "mechanical-parts", page: "2",
  };
  const route = "/ar/brands/chevrolet/cruze/mechanical-parts";
  assert.equal(canonicalPage(route, input), route, "internal filters suppress pagination");
  assert.equal(
    canonicalPage(route, { page: input.page }),
    route + "?page=2",
    "CollectionPage must not reuse page-one URL for page two",
  );
  const source = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(source.includes('const url = new URL(canonicalPage(`/${locale}/${route}`, { page: q.page }), siteOrigin()).href;'));
});

test("model landings use curated tips for real catalog model slugs without inventing fitments", () => {
  for (const [brandSlug, modelSlug] of [
    ["opel", "astra-j"],
    ["opel", "insignia-a"],
    ["chevrolet", "cruze"],
    ["chevrolet", "captiva"],
    ["chevrolet", "malibu"],
  ]) {
    const record = targetModel(brandSlug, modelSlug);
    assert.ok(record?.note.ar, `missing Arabic note for ${brandSlug}/${modelSlug}`);
    assert.ok(record?.note.en, `missing English note for ${brandSlug}/${modelSlug}`);
  }
  const component = readFileSync("src/components/model-search-content.tsx", "utf8");
  const source = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(component.includes("buyingNote?: string;"));
  assert.ok(component.includes("{buyingNote && ("));
  assert.ok(component.includes("<p>{buyingNote}</p>"));
  assert.ok(source.includes("buyingNote={targetModel(listingBrand.slug, listingModel.slug)?.note[locale]}"));
});

test("model category browse links follow locale-specific sitemap eligibility instead of all categories", () => {
  const pages = collectSearchPages({
    brands: [brand], modelNames, categories,
    products: [], cms: [], guides: [],
    modelCounts: { "opel/astra-j": 5 },
    modelCategoryCounts: {
      "opel/astra-j/filters": 3,
      "opel/astra-j/brakes": 0,
    },
  });
  const allowed = new Set(
    searchPagesForLocale(pages, "ar")
      .filter((entry) => entry.path.startsWith("/brands/opel/astra-j/"))
      .map((entry) => entry.path),
  );
  assert.deepEqual([...allowed], ["/brands/opel/astra-j/filters"]);
  assert.equal(allowed.has("/brands/opel/astra-j/brakes"), false);

  // If one category contains every recorded model product, the canonical
  // model page is the landing page and the duplicate category is not linked.
  const duplicate = collectSearchPages({
    brands: [brand], modelNames, categories,
    products: [], cms: [], guides: [],
    modelCounts: { "opel/astra-j": 5 },
    modelCategoryCounts: { "opel/astra-j/filters": 5 },
  });
  assert.equal(searchPagesForLocale(duplicate, "ar").some(
    (entry) => entry.path === "/brands/opel/astra-j/filters",
  ), false);
  const source = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(source.includes("indexableModelCategoryPaths"));
  assert.ok(source.includes("modelCategoryBrowsePaths({"));
  assert.ok(source.includes("cachedModelCategoryTotals("));
  assert.ok(!source.includes("searchPagesForLocale(await searchPages(), locale)"));
  assert.ok(source.includes(".filter((item) => !modelListing || indexableModelCategoryPaths?.has("));
});

test("scoped model category navigation excludes empty, duplicate and untranslated landing pages", () => {
  const input = {
    locale: "ar" as const,
    make: "opel",
    model: "astra-j",
    makeName: { ar: "أوبل", en: "Opel" },
    modelName: { ar: "أسترا J", en: "Astra J" },
    modelTotal: 5,
    categories: [
      { slug: "filters", name: { ar: "فلاتر", en: "Filters" }, total: 3 },
      { slug: "brakes", name: { ar: "فرامل", en: "Brakes" }, total: 0 },
      { slug: "all", name: { ar: "كل القطع", en: "All parts" }, total: 5 },
    ],
  };
  assert.deepEqual([...modelCategoryBrowsePaths(input)], ["/brands/opel/astra-j/filters"]);
  assert.equal(modelCategoryBrowsePaths({ ...input, modelTotal: 0 }).size, 0);
  assert.deepEqual([...modelCategoryBrowsePaths({
    ...input,
    locale: "en",
    categories: [
      { slug: "filters", name: { ar: "فلاتر", en: "فلاتر" }, total: 3 },
      { slug: "brakes", name: { ar: "فرامل", en: "Brakes" }, total: 2 },
    ],
  })], ["/brands/opel/astra-j/brakes"]);
  assert.equal(modelCategoryBrowsePaths({
    ...input, locale: "en", modelName: { ar: "أسترا J", en: "أسترا J" },
  }).size, 0);
});

test("homepage cards use batched first-image lookup with no redundant per-product fetch", () => {
  const db = readFileSync("src/lib/db.ts", "utf8");
  const home = readFileSync("src/components/cyan-home.tsx", "utf8");
  const card = readFileSync("src/components/product-card.tsx", "utf8");
  assert.ok(db.includes("export async function firstProductImages("));
  assert.ok(db.includes('.in("product_id", ids.slice(offset, offset + 100))'));
  assert.ok(db.includes("if (result[row.product_id]) continue"));
  assert.ok(home.includes("firstProductImages(products.map((product) => product.id))"));
  assert.ok(!home.includes("products.map(async (product)"));
  assert.ok(home.includes("mediaResolved"));
  assert.ok(card.includes("mediaResolved ? cover :"));
  assert.ok(card.includes('decoding="async"'));
  assert.ok(card.includes("width={320}"));
  assert.ok(card.includes("height={240}"));
});

test("image loading priorities protect hero and main product LCP without eager thumbnails", () => {
  const hero = readFileSync("src/components/hero-slideshow.tsx", "utf8");
  const controls = readFileSync("src/components/controls.tsx", "utf8");
  assert.ok(hero.includes('fetchPriority={i === 0 ? "high" : "low"}'));
  assert.ok(hero.includes('loading={i === 0 ? undefined : "lazy"}'));
  const gallery = controls.slice(controls.indexOf("export function Gallery("), controls.indexOf("export function VehicleSync("));
  assert.ok(gallery.includes('fetchPriority="high"'));
  assert.ok(gallery.includes('loading="eager"'));
  assert.ok(gallery.includes("width={800}"));
  assert.ok(gallery.includes("height={600}"));
  assert.ok(gallery.includes('loading="lazy"'));
  assert.ok(gallery.includes("width={96}"));
  assert.ok(gallery.includes("height={72}"));
});

test("catalog listing avoids per-card motion hydration and homepage car years use indexed lookups", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(!page.includes('import { Reveal } from "@/components/motion-primitives"'));
  assert.ok(page.includes("{items.map((p) => ("));
  assert.ok(!page.includes("<Reveal key={p.id}"));
  assert.ok(page.includes("const yearsByModelId = new Map<string, Set<number>>()"));
  assert.ok(page.includes("const yearsByModelSlug = new Map<string, Set<number>>()"));
  assert.ok(page.includes("yearsByModelId.get(m.id)"));
  assert.ok(page.includes("yearsByModelSlug.get("));
  assert.ok(!page.includes("...registeredYears\n                .filter((y) => y.model_id === m.id)"));
});

test("buying guides use bounded published product candidates rather than full inventory", () => {
  const guide = readFileSync("src/components/buying-guide.tsx", "utf8");
  assert.ok(guide.includes("catalog({ limit: 96 })"));
  assert.ok(guide.includes("unstable_cache("));
  assert.ok(guide.includes("revalidate: 120"));
  assert.ok(guide.includes("modelIdsWithYears"));
  assert.ok(!guide.includes("catalog({ all: true })"));
});

test("SEO requests share SKU lookup and cache only short-lived public homepage data", () => {
  const db = readFileSync("src/lib/db.ts", "utf8");
  const root = readFileSync("src/app/layout.tsx", "utf8");
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(db.includes("export const catalogBySlug = cache((slug: string) => catalog({ slug }));"));
  assert.ok(root.includes("catalogBySlug(segments[2])"));
  assert.ok(page.includes("catalogBySlug(path[1])"));
  assert.ok(db.includes('["mopc-public-hero-slideshow-v1"], { revalidate: 120'));
  assert.ok(db.includes('["mopc-public-model-years-v1"]'));
  assert.ok(db.includes("revalidate: 60, tags:"));
  assert.ok(page.includes("publicModelYears()"));
});

test("local gallery thumbnails use responsive sizing while full-resolution hero remains unchanged", () => {
  const detail = readFileSync("src/components/product-detail-controls.tsx", "utf8");
  const gallery = detail.slice(detail.indexOf("export function Gallery("), detail.indexOf("export function MobileBuyBar("));
  assert.ok(gallery.includes('from "next/image"') || detail.includes('import Image from "next/image"'));
  assert.ok(gallery.includes('item.url.startsWith("/product-media/")'));
  assert.ok(gallery.includes('sizes="54px"'));
  assert.ok(gallery.includes('<Image'));
  assert.ok(gallery.includes('src={items[index].url}'));
  assert.ok(gallery.includes('fetchPriority="high"'));
  assert.ok(gallery.includes('width={1200}'));
  assert.ok(gallery.includes('height={900}'));
});

test("product pages use a lightweight client island instead of the cart and compare bundle", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  const detail = readFileSync("src/components/product-detail-controls.tsx", "utf8");
  assert.ok(page.includes('from "@/components/product-detail-controls"'));
  assert.ok(page.includes('import { Cart, Compare } from "@/components/controls";'));
  for (const name of ["ProductActions", "Gallery", "CopyPart", "MobileBuyBar"])
    assert.ok(detail.includes(`export function ${name}(`), name);
  assert.ok(!detail.includes("export function Cart("));
  assert.ok(!detail.includes("export function Compare("));
  assert.ok(detail.includes('window.dispatchEvent(new Event("store-change"))'));
  assert.ok(detail.includes("addCartItem("));
  assert.ok(detail.includes("dialog.current?.showModal()"));
});

test("product and home data sources fetch independently in parallel without hiding critical failures", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("const [media, areas, policies, relationGroups] ="));
  assert.ok(page.includes('const productDetailsPromise = path[0] === "products"'));
  assert.ok(page.includes("(await productDetailsPromise)!;"));
  assert.ok(page.includes("productImages(raw.id).catch(() => [])"));
  assert.ok(page.includes("deliveryAreas(),"));
  assert.ok(page.includes("relatedProductGroups(raw.id, selectedId)"));
  assert.ok(page.includes("const { together, alternative: curatedAlternatives } = relationGroups;"));
  assert.ok(page.includes("const homeDataPromise = !route"));
  assert.ok(page.includes("const [registeredYears, slideshow] = await homeDataPromise!;"));
  assert.ok(page.includes("const selectedIdPromise = (async () =>"));
  assert.ok(page.includes("const selectedId = await selectedIdPromise;"));
  assert.ok(page.includes("heroSlideshow("));
  assert.ok(!page.includes("const areas = await deliveryAreas()"));
  assert.ok(!page.includes("const slideshow = await heroSlideshow("));
});

test("SKU and policy SEO lookups share only short-lived public cache", () => {
  const db = readFileSync("src/lib/db.ts", "utf8");
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("const productLookupPromise = path[0] ==="));
  assert.ok(page.includes("    productLookupPromise,"));
  assert.ok(db.includes('["mopc-public-product-images-v1"], { revalidate: 60'));
  assert.ok(db.includes('["mopc-public-policy-pages-v1"], { revalidate: 60'));
  assert.ok(db.includes("sharedPolicyPages([...new Set(slugs)].sort())"));
  assert.ok(db.includes("export const productImages = cache((productId: string)"));
  assert.ok(!db.includes("const sharedProductImages = unstable_cache(async function loadProductImages(productId: string) {\n  const user"));
});

test("SKU relation groups retain verified together recommendations and batch related products", () => {
  const db = readFileSync("src/lib/db.ts", "utf8");
  assert.ok(db.includes("export async function relatedProductGroups(id: string, vehicle?: string)"));
  assert.ok(db.includes('.in("kind", ["alternative", "together"])'));
  assert.ok(db.includes("if (!vehicle || !togetherIds.size)"));
  assert.ok(db.includes("flags[product.id]"));
});

test("product photos share request data with metadata and vehicle-free cross-sells skip database", () => {
  const db = readFileSync("src/lib/db.ts", "utf8");
  assert.ok(db.includes("export const productImages = cache((productId: string) => sharedProductImages(productId))"));
  assert.ok(db.includes('if (!configured() || (kind === "together" && !vehicle)) return [];'));
});

test("metadata queries model/category inventory concurrently and keeps canonical duplicate handling", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("const [selected, allModel] = await Promise.all(["));
  assert.ok(page.includes("categoryForModel\n            ? searchCatalog({ make: brand.slug, model: path[2], size: 1 })"));
  assert.ok(page.includes("duplicateModelCategoryLanding = allModel.total === selected.total"));
  assert.ok(page.includes("modelHasInventory = selected.total > 0"));
});

test("installments search titles remain within 60 characters including store suffix", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  const ar = "تقسيط قطع غيار السيارات في مصر: الطرق والشروط";
  const en = "Car parts installments in Egypt: options and terms";
  assert.ok(page.includes(ar));
  assert.ok(page.includes(en));
  assert.ok(`${ar} | موبِك`.length <= 60);
  assert.ok(`${en} | MOPC`.length <= 60);
});

test("model category totals cache is public, short-lived and not affected by user filters", () => {
  const source = readFileSync("src/lib/model-category-totals.ts", "utf8");
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(source.includes("unstable_cache("));
  assert.ok(source.includes("{ revalidate: 60 }"));
  assert.ok(source.includes('service().rpc("model_category_inventory_counts"'));
  assert.ok(source.includes("p_make: make"));
  assert.ok(source.includes("p_model: model"));
  assert.ok(source.includes("categorySlugs.map((slug) => [slug, result?.categoryTotals?.[slug] ?? 0])"));
  assert.ok(!source.includes("categorySlugs.map((category) => searchCatalog"));
  assert.ok(source.includes("mopc-public-model-category-totals-v2"));
  assert.ok(page.includes("categories.map((item) => item.slug)"));
  assert.ok(page.includes("counts.categoryTotals[item.slug] ?? 0"));
  assert.ok(!page.includes("searchPagesForLocale(await searchPages(), locale)"));
});

test("published SKU, policies and related inventory start before independent layout/catalog waits", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  const kickoff = page.indexOf('const productDetailsPromise = path[0] === "products"');
  const catalogs = page.indexOf("const [vehicleData, categories] = await Promise.all([");
  const family = page.indexOf('const familyPromise = path[0] === "products"');
  const consumption = page.indexOf("const family = await familyPromise;");
  assert.ok(kickoff > 0 && family > kickoff && catalogs > family && consumption > catalogs);
  assert.ok(page.includes("Promise.all([productLookupPromise, selectedIdPromise]).then("));
  assert.ok(page.includes("relatedProductGroups(raw.id, selectedId)"));
  assert.ok(page.includes("productImages(raw.id).catch(() => [])"));
  assert.ok(page.includes("policyPages("));
  assert.ok(page.includes("deliveryAreas()"));
});

test("product and category pages do not request unused brand/slideshow media", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes('const home = !route;'));
  assert.ok(page.includes('const brandLanding = path[0] === "brands" && path.length === 2;'));
  assert.ok(page.includes('home ? shellDataPromise.then(([storeSettings]) => storeSettings) : Promise.resolve(null)'));
  assert.ok(page.includes('const [vehicleData, categories] = await Promise.all(['));
  assert.ok(page.includes("siteMedia(mediaSlots)"));
});

test("catalog products share one batched cover query with a safe per-card fallback", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("firstProductImages(productIds).catch(() => null)"));
  assert.ok(page.includes("const [flags, catalogCovers] = await Promise.all(["));
  assert.ok(page.includes("cover={covers?.[p.id]}"));
  assert.ok(page.includes("mediaResolved={covers !== null}"));
  assert.ok(page.includes("isCatalog\n      ? firstProductImages(productIds)"));
});

test("product relation sections reuse a batched cover map with a safe fallback", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("const relatedCovers = await firstProductImages("));
  assert.ok(page.includes("[...new Set([...together, ...alternatives].map((item) => item.id))]"));
  assert.ok(page.includes(").catch(() => null);"));
  assert.ok(page.includes("cover={relatedCovers?.[item.id]}"));
  assert.ok(page.includes("mediaResolved={relatedCovers !== null}"));
  assert.ok(page.includes("{cards(alternatives, relatedCovers)}"));
  const card = readFileSync("src/components/product-card.tsx", "utf8");
  assert.ok(card.includes("mediaResolved ? cover :"));
});

test("homepage regular items and special offers load concurrently", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(page.includes("const [primary, homeOffers, homeProducts] = await Promise.all(["));
  // The inventory query must start before waiting for vehicle and branding.
  assert.ok(page.includes("const homeProductsPromise = !route"));
  assert.ok(page.includes("catalog({ limit: 10 })"));
  assert.ok(page.indexOf("const homeProductsPromise = !route") < page.indexOf("const [vehicleData, categories] = await Promise.all(["));
  // Inventory starts early; vehicle-specific offer query retains its previous
  // ordering to avoid competing with the first-render brand media lookups.
  assert.ok(page.includes("searchCatalog({ offers: true, vehicle: vehicle?.id, size: 4 })"));
  assert.ok(page.includes("    homeProductsPromise,"));
  assert.ok(page.includes("...homeProducts, ...homeOffers"));
  assert.ok(!page.includes("...(await catalog({ limit: 10 })), ...homeOffers"));
});

test("shell identity is fetched in parallel once and shared with homepage and header", () => {
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  assert.ok(page.includes("const shellDataPromise = Promise.all(["));
  assert.ok(page.includes('siteMedia(["logo"])'));
  assert.ok(page.includes("shellData={shellDataPromise}"));
  assert.ok(shell.includes("shellData?: Promise<["));
  assert.ok(shell.includes("const [settings, media] = await (shellData ?? Promise.all(["));
  assert.ok(page.indexOf("const shellDataPromise = Promise.all([") < page.indexOf("await vehicleCatalog()") || page.indexOf("const shellDataPromise = Promise.all([") < page.indexOf("const [vehicleData, categories] = await Promise.all(["));
});

test("measured mobile image and font bottlenecks are addressed without modifying brand artwork", () => {
  const logo = readFileSync("src/components/brand-logo.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.ok(logo.includes('import Image from "next/image"'));
  assert.ok(logo.includes('src={src || "/images/mopc/logo-dark.png"}'));
  assert.ok(logo.includes('sizes="180px"'));
  assert.ok(logo.includes("unoptimized={!original}"));
  assert.ok(!logo.includes("width={2172}"));
  assert.ok(!css.includes('fonts.googleapis.com/css2?family=Almarai'));
  assert.ok(css.includes('src: url(/fonts/ibm-plex-sans-arabic-arabic-400.woff2)'));
});

test("model year expansion does not require motion/react in client bundle", () => {
  const component = readFileSync("src/components/model-year-cards.tsx", "utf8");
  const css = readFileSync("src/components/model-year-cards.module.css", "utf8");
  assert.ok(!component.includes('from "motion/react"'));
  assert.ok(component.includes('inert={!open}'));
  assert.ok(component.includes('aria-hidden={!open}'));
  assert.ok(css.includes("grid-template-rows: 0fr;"));
  assert.ok(css.includes("grid-template-rows: 1fr;"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
});

test("sitewide shell imports small navigation controls without hydrating product controls", () => {
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  const slim = readFileSync("src/components/shell-client-controls.tsx", "utf8");
  assert.ok(shell.includes('from "./shell-client-controls"'));
  assert.ok(!shell.includes('from "./controls"'));
  for (const name of ["Language", "VehicleSync", "CartSync", "ClearVehicle"]) {
    assert.ok(slim.includes(`export function ${name}(`));
  }
  assert.ok(!slim.includes('from "./controls"'));
  assert.ok(slim.includes("window.addEventListener(\"store-change\", persist)"));
});

test("global support loads its heavy form only after customer interaction", () => {
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  const launcher = readFileSync("src/components/lazy-chat-widget.tsx", "utf8");
  const panel = readFileSync("src/components/chat-widget.tsx", "utf8");
  assert.ok(shell.includes('from "./lazy-chat-widget"'));
  assert.ok(!shell.includes('from "./chat-widget"'));
  assert.ok(launcher.includes('dynamic('));
  assert.ok(launcher.includes('import("./chat-widget")'));
  assert.ok(launcher.includes("onClick={() => setOpened(true)}"));
  assert.ok(panel.includes("initiallyOpen = false"));
  assert.ok(panel.includes("useState(initiallyOpen)"));
});
test("built-in car brand logos use responsive optimized images", () => {
  const home = readFileSync("src/components/cyan-home.tsx", "utf8");
  assert.ok(home.includes('src={\n                      b.logo ||'));
  assert.ok(home.includes('unoptimized={Boolean(b.logo)}'));
  assert.ok(home.includes('sizes="(max-width:640px) 120px, 160px"'));
});

test("product image zoom is not mounted until opened, avoiding hidden full-size assets", () => {
  const controls = readFileSync("src/components/controls.tsx", "utf8");
  const gallery = controls.slice(controls.indexOf("export function Gallery("), controls.indexOf("export function VehicleSync("));
  assert.ok(gallery.includes("const [zoomOpen, setZoomOpen] = useState(false)"));
  assert.ok(gallery.includes("onClose={() => setZoomOpen(false)}"));
  assert.ok(gallery.includes("{zoomOpen && ("));
  assert.ok(gallery.includes('loading="eager"'));
  assert.ok(gallery.includes('fetchPriority="high"'));
});

test("product action client islands receive only fields needed for cart and purchase", () => {
  const controls = readFileSync("src/components/controls.tsx", "utf8");
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(controls.includes('Pick<Product, "id" | "orderable" | "family">'));
  assert.ok(controls.includes('Pick<Product, "id" | "orderable" | "price" | "sale">'));
  assert.ok(page.includes("product={{ id: p.id, orderable: p.orderable, family: p.family }}"));
  assert.ok(page.includes("product={{ id: p.id, orderable: p.orderable, price: p.price, sale: p.sale }}"));
  assert.ok(!page.includes("<MobileBuyBar product={p}"));
});

test("hero carousel never mounts unseen viewport images before they are selected", () => {
  const hero = readFileSync("src/components/hero-slideshow.tsx", "utf8");
  assert.ok(hero.includes("i === 0 || i === active ? ("));
  assert.ok(hero.includes("preload={i === 0}"));
  assert.ok(hero.includes('fetchPriority={i === 0 ? "high" : "low"}'));
  assert.ok(hero.includes("onClick={() => select(active + 1)}"));
  assert.ok(hero.includes("setIndex((current) => (current + 1) % slides.length)"));
});

test("mobile brand photos request widths matching their actual two-column grid", () => {
  const home = readFileSync("src/components/cyan-home.tsx", "utf8");
  assert.ok(home.includes("orderedBrands.map((b, index) => ("));
  assert.ok(home.includes('"(max-width:640px) 50vw, (max-width:1180px) 33vw, 20vw"'));
  assert.ok(home.includes('"(max-width:640px) 100vw, (max-width:1180px) 33vw, 20vw"'));
  assert.ok(home.includes("index === orderedBrands.length - 1"));
});

test("storefront-only CSS does not block unrelated root routes", () => {
  const root = readFileSync("src/app/layout.tsx", "utf8");
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  assert.ok(root.includes('import "./globals.css"'));
  assert.ok(!root.includes('import "@/components/mopc-premium-v2.css"'));
  assert.ok(!root.includes('import "@/components/mopc-showroom.css"'));
  assert.ok(shell.includes('import "./mopc-premium-v2.css"'));
  assert.ok(shell.includes('import "./mopc-showroom.css"'));
  assert.ok(shell.indexOf('import "./mopc-premium-v2.css"') < shell.indexOf('import "./mopc-showroom.css"'));
});

test("homepage postpones below-fold rendering while reserving stable space", () => {
  const styles = readFileSync("src/components/mopc-home-2026.css", "utf8");
  assert.ok(styles.includes(".cyan-home .cyan-featured,"));
  assert.ok(styles.includes(".cyan-home .showroom-request {"));
  assert.ok(styles.includes("content-visibility: auto;"));
  assert.ok(styles.includes("contain-intrinsic-size: auto 640px;"));
  assert.ok(!styles.includes(".cyan-home .cyan-hero { content-visibility: auto;"));
});

test("global cart counter stays independent of favorites and checkout bundles", () => {
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  const badge = readFileSync("src/components/cart-count.tsx", "utf8");
  assert.ok(shell.includes('import { CartCount } from "./cart-count"'));
  assert.ok(!shell.includes('import { CartCount } from "./favorites"'));
  assert.ok(!badge.includes('from "./favorites"'));
  assert.ok(!badge.includes('from "./purchase-buttons"'));
  assert.ok(badge.includes('localStorage.getItem("cart")'));
  assert.ok(badge.includes('window.addEventListener("store-change", update)'));
  assert.ok(badge.includes('window.addEventListener("storage", update)'));
});

test("disabled analytics never hydrates the analytics client bundle", () => {
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  assert.ok(shell.includes('process.env.ANALYTICS_ENABLED === "true" && ('));
  assert.ok(shell.includes("<Analytics locale={locale} enabled />"));
  assert.ok(!shell.includes('enabled={process.env.ANALYTICS_ENABLED === "true"}'));
  assert.ok(shell.includes('<CartSync />'));
});

test("admin-only style overrides do not block public storefront CSS", () => {
  const global = readFileSync("src/app/globals.css", "utf8");
  const admin = readFileSync("src/app/admin/admin-overrides.css", "utf8");
  const page = readFileSync("src/app/admin/page.tsx", "utf8");
  assert.ok(page.includes('import "./admin-overrides.css"'));
  assert.ok(admin.includes(".admin-overview-redesign"));
  assert.ok(admin.includes(".admin-orders-list"));
  assert.ok(admin.includes(".mopc-orders-table"));
  assert.ok(admin.includes(".admin-product-editor"));
  assert.ok(!global.includes("/* MOPC Admin overview — Figma design:"));
  assert.ok(!global.includes(".admin-overview-redesign .admin-overview-section"));
  assert.ok(global.includes(".category-hero-image { width: 100%;"));
  assert.ok(global.includes(".category-image-links { display: flex;"));
});

test("checkout payment bundle stays out of general forms used by public pages", () => {
  const forms = readFileSync("src/components/forms.tsx", "utf8");
  const checkout = readFileSync("src/components/checkout-form.tsx", "utf8");
  const page = readFileSync("src/app/[locale]/[[...path]]/page.tsx", "utf8");
  assert.ok(forms.includes("export function ApiForm("));
  assert.ok(forms.includes("export function AuthForm("));
  assert.ok(forms.includes("export function RequestForm("));
  assert.ok(!forms.includes("export function Checkout("));
  assert.ok(!forms.includes('from "./instapay-button"'));
  assert.ok(!forms.includes('from "@/lib/payments"'));
  assert.ok(!forms.includes('from "@/lib/shipping"'));
  assert.ok(checkout.includes("export function Checkout("));
  assert.ok(checkout.includes("checkout-quote"));
  assert.ok(checkout.includes("InstaPayButton"));
  assert.ok(page.includes('import { Checkout } from "@/components/checkout-form"'));
  assert.ok(!page.includes("RequestForm, Checkout, ApiForm"));
});

test("every product card uses lightweight favorite toggle without hydrating favorites listing", () => {
  const card = readFileSync("src/components/product-card.tsx", "utf8");
  const toggle = readFileSync("src/components/favorite-button.tsx", "utf8");
  const favorites = readFileSync("src/components/favorites.tsx", "utf8");
  assert.ok(card.includes('import { FavoriteButton } from "./favorite-button"'));
  assert.ok(!card.includes('from "./favorites"'));
  assert.ok(toggle.includes("export function FavoriteButton("));
  assert.ok(toggle.includes("export function useFavorites()"));
  assert.ok(toggle.includes('window.dispatchEvent(new Event(event))'));
  assert.ok(toggle.includes('window.addEventListener("storage", update)'));
  assert.ok(toggle.includes("current.length >= 40"));
  assert.ok(!toggle.includes("PurchaseButtons"));
  assert.ok(!toggle.includes("/api/products?ids="));
  assert.ok(favorites.includes('import { FavoriteButton, useFavorites } from "./favorite-button"'));
  assert.ok(favorites.includes("export function Favorites("));
  assert.ok(favorites.includes("PurchaseButtons"));
});

test("homepage vehicle selector serializes only selected-language labels and needed fields", () => {
  const home = readFileSync("src/components/cyan-home.tsx", "utf8");
  const finder = readFileSync("src/components/home-vehicle-finder.tsx", "utf8");
  assert.ok(home.includes("label: ar ? brand.ar : brand.name"));
  assert.ok(home.includes("label: model.name[locale]"));
  assert.ok(home.includes("years: model.years"));
  assert.ok(finder.includes("brands: { slug: string; label: string }[]"));
  assert.ok(finder.includes("models: { brand: string; slug: string; label: string; years: number[] }[]"));
  assert.ok(finder.includes("m.label"));
  assert.ok(!finder.includes("Text }"));
  assert.ok(finder.includes('name="make"'));
  assert.ok(finder.includes('name="model"'));
  assert.ok(finder.includes('name="year"'));
});

test("product-card add-to-cart islands serialize only one language of the product name", () => {
  const card = readFileSync("src/components/product-card.tsx", "utf8");
  const buy = readFileSync("src/components/purchase-buttons.tsx", "utf8");
  const favorites = readFileSync("src/components/favorites.tsx", "utf8");
  assert.ok(card.includes("product={{ id: p.id, orderable: p.orderable }}"));
  assert.ok(card.includes("label={p.name[locale]}"));
  assert.ok(!card.includes("name: p.name, orderable: p.orderable"));
  assert.ok(buy.includes('label?: string;'));
  assert.ok(buy.includes('const productLabel = label ?? product.name?.[locale] ?? ""'));
  assert.ok(buy.includes("addCartItem(product.id, quantity, buyNow, cartVehicle)"));
  assert.ok(buy.includes("productLabel"));
  assert.ok(favorites.includes("<PurchaseButtons product={p} locale={locale} />"));
});

test("production builds generate measurable client JS/CSS transfer-size reports", () => {
  const config = JSON.parse(readFileSync("package.json", "utf8"));
  const report = readFileSync("scripts/report-client-assets.mjs", "utf8");
  assert.equal(config.scripts.postbuild, "node scripts/report-client-assets.mjs");
  assert.ok(report.includes('app-build-manifest.json'));
  assert.ok(report.includes("gzipSync("));
  assert.ok(report.includes("client-asset-report.json"));
  assert.ok(report.includes("manifest.pages || {}"));
  assert.ok(report.includes("largest: assets.sort("));
});

test("decorative home banners render on server with no hydration or viewport observer", () => {
  const banner = readFileSync("src/components/banner-motion.tsx", "utf8");
  const sections = readFileSync("src/components/storefront-banners.tsx", "utf8");
  assert.ok(!banner.includes('"use client"'));
  assert.ok(!banner.includes("new IntersectionObserver("));
  assert.ok(!banner.includes("useEffect("));
  assert.ok(banner.includes('data-in-view="true"'));
  assert.ok(banner.includes("aria-labelledby={labelledBy}"));
  assert.ok(sections.includes("<BannerMotion"));
});

test("bundle report correlates Next App Router client manifests to emitted route chunks", () => {
  const audit = readFileSync("scripts/report-client-assets.mjs", "utf8");
  assert.ok(audit.includes('"_client-reference-manifest.js"'));
  assert.ok(audit.includes("manifest.clientModules || {}"));
  assert.ok(audit.includes("manifest.entryCSSFiles || {}"));
  assert.ok(audit.includes("runInNewContext("));
  assert.ok(audit.includes("jsGzip:"));
  assert.ok(audit.includes("const routeEntryPrefix ="));
  assert.ok(audit.includes("entryFiles"));
  assert.ok(audit.includes("excluding shared JS runtime"));
  assert.ok(audit.includes("cssGzip:"));
  assert.ok(audit.includes("manifestSources"));
  assert.ok(audit.includes("NOT first-view downloads"));
});

test("browser network audit checks real storefront requests without purchasing anything", () => {
  const config = JSON.parse(readFileSync("package.json", "utf8"));
  const audit = readFileSync("scripts/audit-browser-network.mjs", "utf8");
  assert.equal(config.scripts["perf:routes"], "node scripts/audit-browser-network.mjs");
  assert.ok(audit.includes('context.newCDPSession(page)'));
  assert.ok(audit.includes('Network.loadingFinished'));
  assert.ok(audit.includes('new PerformanceObserver('));
  assert.ok(audit.includes('await audit("home"'));
  assert.ok(audit.includes('await audit("catalog"'));
  assert.ok(audit.includes('await audit("product"'));
  assert.ok(audit.includes('await audit("checkout-view-only"'));
  assert.ok(!audit.includes("page.click("));
  assert.ok(!audit.includes("page.fill("));
  assert.ok(audit.includes("browser-network.json"));
  // Remote ImageKit/other CDN product photos must count towards the mobile
  // image budget: the same-origin-only total understates actual bytes.
  assert.ok(audit.includes("const allImages = allRequests.filter"));
  assert.ok(audit.includes("imageAllOrigins: sum(allImages)"));
  assert.ok(audit.includes("heaviestImages: heavy(allImages)"));
  assert.ok(audit.includes("heaviestRequests: heavy(allRequests)"));
  assert.ok(audit.includes("INP is not measured"));
});

test("Google merchant readiness requires admin and shares actual feed eligibility rules", () => {
  const report = readFileSync("src/app/api/admin/merchant-readiness/route.ts", "utf8");
  const helper = readFileSync("src/lib/merchant-readiness.ts", "utf8");
  const feed = readFileSync("src/app/api/merchant-feed/route.ts", "utf8");
  assert.ok(report.includes("await requireAdmin()"));
  assert.ok(report.includes('status: 401'));
  assert.ok(report.includes('"private, no-store"'));
  assert.ok(report.includes('merchantReadiness(rows, "ar")'));
  assert.ok(report.includes('merchantReadiness(rows, "en")'));
  assert.ok(report.includes('process.env.MERCHANT_FEED_ENABLED === "true"'));
  assert.ok(report.includes('process.env.MERCHANT_SHIPPING_CONFIGURED === "true"'));
  assert.ok(report.includes('process.env.MERCHANT_EG_ELIGIBILITY_CONFIRMED === "true"'));
  assert.ok(report.includes("policyStatus.missing.length === 0"));
  assert.ok(helper.includes("feedExclusionReasons(product, locale, images)"));
  assert.ok(helper.includes("merchantImagesByProduct("));
  assert.ok(feed.includes("merchantImagesByProduct(images, isRemoteImageUrl)"));
  assert.ok(!feed.includes("images.filter((i) => i.product_id === product.id)"));
});

test("Merchant Center feed always exports canonical mopc.store landing-page links", () => {
  const feed = readFileSync("src/app/api/merchant-feed/route.ts", "utf8");
  assert.ok(feed.includes('import { TARGET_ORIGIN } from "@/lib/site-url"'));
  assert.ok(feed.includes("merchantFeed(rows, locale, TARGET_ORIGIN)"));
  assert.ok(feed.includes("merchantImagesByProduct(images, isRemoteImageUrl)"));
  assert.ok(feed.includes('process.env.MERCHANT_FEED_ENABLED !== "true"'));
  assert.ok(feed.includes("crypto.timingSafeEqual("));
});

test("Merchant Center public feed serves only approved products and keeps admin routes protected", () => {
  const feed = readFileSync("src/app/api/merchant-feed/route.ts", "utf8");
  const policy = readFileSync("src/lib/merchant-feed.ts", "utf8");
  const readiness = readFileSync("src/app/api/admin/merchant-readiness/route.ts", "utf8");
  assert.ok(feed.includes('process.env.MERCHANT_FEED_PUBLIC === "true"'));
  assert.ok(feed.includes("if (!publicFeed && !authorized) await requireAdmin()"));
  assert.ok(feed.includes('process.env.MERCHANT_FEED_ENABLED !== "true"'));
  assert.ok(feed.includes('process.env.MERCHANT_EG_ELIGIBILITY_CONFIRMED !== "true"'));
  assert.ok(feed.includes('process.env.MERCHANT_SHIPPING_CONFIGURED !== "true"'));
  assert.ok(feed.includes("feedExclusionReasons(r.product, locale, r.images)"));
  assert.ok(policy.includes("eligibleProduct(p, locale)"));
  assert.ok(policy.includes("!images.length"));
  assert.ok(readiness.includes("await requireAdmin()"));
});

test("live Product Offer smoke checks prioritize known Google-indexed SKUs in both languages", () => {
  const audit = readFileSync("scripts/audit-seo-indexing.mjs", "utf8");
  assert.ok(audit.includes("const sampleSize = 8;"));
  assert.ok(audit.includes("const indexedProductIds = ["));
  assert.ok(audit.includes('c4c0ce8c-7060-4591-9e4e-64650dfc7f15'));
  assert.ok(audit.includes('1f840aa9-ea09-4d10-b996-2282152fb18a'));
  assert.ok(audit.includes("(?:ar|en)"));
  assert.ok(audit.includes("const sampleUrls = [...new Set(["));
  assert.ok(audit.includes("for (const url of sampleUrls)"));
  assert.ok(audit.includes("eligibleProductSamplesAttempted: sampleUrls.length"));
  assert.ok(!audit.includes("method: \"POST\""));
});

test("scheduled SEO smoke validates XML-discovered model pages and their real Product ItemLists", () => {
  const audit = readFileSync("scripts/audit-seo-indexing.mjs", "utf8");
  assert.ok(audit.includes('fetchPage("/sitemaps/vehicles.xml")'));
  assert.ok(audit.includes("const modelSitemapUrls ="));
  assert.ok(audit.includes("const modelSample = ["));
  assert.ok(audit.includes("for (const url of modelSample)"));
  assert.ok(audit.includes('item?.["@type"] === "CollectionPage"'));
  assert.ok(audit.includes('item?.mainEntity?.["@type"] === "ItemList"'));
  assert.ok(audit.includes("modelPagesPassed, modelPagesAttempted: modelSample.length"));
  assert.ok(audit.includes("if (!canonical || new URL(canonical, origin).href !== url)"));
  assert.ok(audit.includes('throw Error("Model unexpectedly noindex")'));
  assert.ok(!audit.includes('method: "POST"'));
});

test("SEO monitoring validates every Product snippet, not just one valid offer", () => {
  const audit = readFileSync("scripts/audit-seo-indexing.mjs", "utf8");
  assert.ok(audit.includes('if (!products.every((product) =>'));
  assert.ok(audit.includes('product.url === url'));
  assert.ok(audit.includes('product.offers?.["@type"] === "Offer"'));
  assert.ok(audit.includes('product.offers.url === url'));
  assert.ok(audit.includes('product.offers.priceCurrency === "EGP"'));
  assert.ok(audit.includes('Number.isFinite(Number(product.offers.price))'));
  assert.ok(!audit.includes('products.some((product) => product.offers'));
});

test("phase 9 monitors live crawl, canonical, sitemap and Product Offers without buying", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const audit = readFileSync("scripts/audit-seo-indexing.mjs", "utf8");
  const workflow = readFileSync(".github/workflows/mopc-seo-crawl-audit.yml", "utf8");
  assert.equal(pkg.scripts["seo:live-audit"], "node scripts/audit-seo-indexing.mjs");
  assert.ok(pkg.scripts.prebuild.includes("node --check scripts/audit-seo-indexing.mjs"));
  assert.ok(audit.includes("root redirect"));
  assert.ok(audit.includes("robots.txt"));
  assert.ok(audit.includes("sitemap.xml"));
  assert.ok(audit.includes("Product JSON-LD"));
  assert.ok(audit.includes('product.offers.priceCurrency === "EGP"'));
  assert.ok(audit.includes('status: "FAIL"'));
  assert.ok(!audit.includes("fetch(new URL(\"/checkout"));
  assert.ok(workflow.includes("workflow_dispatch:"));
  assert.ok(workflow.includes("schedule:"));
  assert.ok(workflow.includes("actions/upload-artifact@v4"));
});

test("phase 9 HTML sitemap exposes every product page directly and guides in the footer", () => {
  const htmlMap = readFileSync("src/components/site-map.tsx", "utf8");
  const shell = readFileSync("src/components/shell.tsx", "utf8");
  const policy = readFileSync("src/lib/seo-policy.ts", "utf8");
  assert.ok(htmlMap.includes("Array.from({ length: count }"));
  assert.ok(htmlMap.includes('aria-current={number === current ? "page" : undefined}'));
  assert.ok(htmlMap.includes("site-map?page="));
  assert.ok(shell.includes('`/${locale}/guides`'));
  assert.ok(policy.includes('(?:ar|en)\\/site-map$'));
});

test("Googlebot sitemap fetches use bounded shared edge caching without blocking fresh updates", () => {
  for (const route of ["src/app/sitemap.xml/route.ts", "src/app/sitemaps/[group]/route.ts"]) {
    const code = readFileSync(route, "utf8");
    assert.ok(code.includes('"Content-Type": "application/xml; charset=utf-8"'));
    assert.ok(code.includes("public, max-age=0, s-maxage=600, stale-while-revalidate=3600"));
    assert.ok(code.includes("sitemapPublished()"));
  }
});
