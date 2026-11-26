import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPage, categoryLandingIndexable } from "../src/lib/seo-policy";
import { sitemapPublished } from "../src/lib/sitemap-visibility";
import { knownBrandRoute } from "../src/lib/seo-brand-route";
import { rootLocaleRedirect } from "../src/lib/site-url";
import { sitemapIndex, sitemapXml, sitemapGroups } from "../src/lib/sitemap-xml";
import { collectSearchPages, cmsTranslatedLocales, vehicleLandingLocales, searchPagesForLocale } from "../src/lib/seo-inventory";
import { sitemapFitmentCounts } from "../src/lib/seo-fitment-counts";
import { demoProducts } from "../src/lib/catalog";
import { brandModelBuyingNotes } from "../src/lib/vehicle-coverage";
import { brandModelListSchema } from "../src/lib/brand-model-schema";

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


test("streaming loading shell never injects extra H1 headings into indexable pages", () => {
  const source = readFileSync("src/app/loading.tsx", "utf8");
  const css = readFileSync("src/app/loading.module.css", "utf8");
  assert.ok(!source.includes("<h1"));
  assert.ok(source.includes("loadingTitle"));
  assert.ok(source.includes("styles.ar"));
  assert.ok(source.includes("styles.en"));
  assert.ok(css.includes(".copy .loadingTitle"));
  assert.ok(!css.includes(".copy h1"));
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
    modelCounts: { "mg/5": 1, "mg/6": 2, "mg/hs": 1, "peugeot/2008": 1 },
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
    modelCounts: { "opel/astra-j": 1 },
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
