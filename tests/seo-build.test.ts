import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPage, categoryLandingIndexable } from "../src/lib/seo-policy";
import { sitemapPublished } from "../src/lib/sitemap-visibility";
import { sitemapIndex, sitemapXml, sitemapGroups } from "../src/lib/sitemap-xml";
import { collectSearchPages, cmsTranslatedLocales } from "../src/lib/seo-inventory";
import { sitemapFitmentCounts } from "../src/lib/seo-fitment-counts";
import { demoProducts } from "../src/lib/catalog";

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
    modelCounts: { "opel/astra-j": 1 },
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
    modelCounts: { "opel/astra-j": 1 },
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
