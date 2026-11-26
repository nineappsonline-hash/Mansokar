import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPage } from "../src/lib/seo-policy";
import { sitemapPublished } from "../src/lib/sitemap-visibility";
import { sitemapIndex, sitemapXml, sitemapGroups } from "../src/lib/sitemap-xml";
import { collectSearchPages } from "../src/lib/seo-inventory";

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
