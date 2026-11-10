import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { demoProducts } from "../src/lib/catalog";
import {
  siteOrigin,
  migrationRedirect,
  indexingApproved,
} from "../src/lib/site-url";
import {
  canonicalPage,
  eligibleProduct,
  verifiedAvailability,
} from "../src/lib/seo-policy";
import { sitemapXml, sitemapIndex } from "../src/lib/sitemap-xml";
import {
  merchantFeed,
  validGtin,
  feedExclusionReasons,
} from "../src/lib/merchant-feed";
import { browserAnalyticsInput } from "../src/lib/analytics-input";
import { publicProductSlug } from "../src/lib/public-product";
import { csvReport, seoHealthRows } from "../src/lib/seo-health";
const product = {
  ...demoProducts[0],
  demo: false,
  status: "published" as const,
  specs: {},
  name: { ar: "فلتر زيت", en: "Oil filter" },
};
test("domain cutover stays opt-in and preserves paths without redirect loops or private callbacks", () => {
  const env = {
    NEXT_PUBLIC_SITE_URL: "https://mansokar.vercel.app",
    SEO_DOMAIN_MIGRATION: "false",
  };
  assert.equal(siteOrigin(env), "https://mansokar.vercel.app");
  assert.equal(
    migrationRedirect(new URL("https://mansokar.vercel.app/ar"), env),
    null,
  );
  env.SEO_DOMAIN_MIGRATION = "true";
  assert.equal(siteOrigin(env), "https://mopc.store");
  assert.equal(
    migrationRedirect(
      new URL("https://www.mopc.store/ar/brands/opel?year=2020"),
      env,
    ),
    "https://mopc.store/ar/brands/opel?year=2020",
  );
  for (const url of [
    "https://mopc.store/ar",
    "https://preview.vercel.app/ar",
    "https://mansokar.vercel.app/api/payments",
    "https://mansokar.vercel.app/admin",
  ])
    assert.equal(migrationRedirect(new URL(url), env), null);
  assert.equal(
    indexingApproved({ STORE_LAUNCH_APPROVED: "true", VERCEL_ENV: "preview" }),
    false,
  );
});
test("pagination is self canonical while facets resolve to the base and product locale eligibility is honest", () => {
  assert.equal(
    canonicalPage("/ar/brands/opel/astra", { page: "2" }),
    "/ar/brands/opel/astra?page=2",
  );
  assert.equal(
    canonicalPage("/ar/brands/opel/astra", { page: "2", year: "2020" }),
    "/ar/brands/opel/astra",
  );
  assert.equal(
    eligibleProduct(
      { ...product, name: { ar: "فلتر زيت", en: "فلتر زيت" } },
      "en",
    ),
    false,
  );
  assert.equal(eligibleProduct(product, "ar"), true);
});
test("partitioned XML escapes URLs, emits only actual translations and never invents dates", () => {
  const xml = sitemapXml(
    [
      {
        path: "/products/a",
        kind: "product",
        title: product.name,
        locales: ["ar"],
        images: ["/photo?x=1&y=2"],
      },
    ],
    "https://mopc.store",
    "products",
  );
  assert.ok(xml.includes('hreflang="ar-EG"'));
  assert.ok(!xml.includes("en-EG"));
  assert.ok(!xml.includes("<lastmod>"));
  assert.ok(xml.includes("&amp;"));
  assert.equal(
    (sitemapIndex("https://mopc.store").match(/<sitemap>/g) || []).length,
    4,
  );
});
test("merchant discovery excludes unknown stock and emits only verified identifiers and consistent EGP prices", () => {
  assert.equal(verifiedAvailability(product), undefined);
  assert.ok(
    feedExclusionReasons(product, "ar", ["/part.jpg"]).includes(
      "unknown_availability",
    ),
  );
  const known = {
    ...product,
    orderable: true,
    specs: {
      stock_status: "in_stock",
      product_condition: "new",
      gtin: "4006381333931",
    },
  };
  const xml = merchantFeed(
    [{ product: known, images: ["/part.jpg"] }],
    "ar",
    "https://mopc.store",
  );
  assert.ok(xml.includes("<g:availability>in_stock</g:availability>"));
  assert.ok(
    xml.includes(`${((known.sale ?? known.price) / 100).toFixed(2)} EGP`),
  );
  assert.ok(validGtin("4006381333931"));
  assert.equal(validGtin("4006381333932"), false);
  assert.equal(validGtin("123456789"), false);
});
test("browser analytics cannot submit purchases, search strings or contact data", () => {
  assert.equal(
    browserAnalyticsInput.safeParse({ event: "purchase" }).success,
    false,
  );
  assert.equal(
    browserAnalyticsInput.safeParse({
      event: "search",
      context: { query: "private contact" },
    }).success,
    false,
  );
  assert.equal(
    browserAnalyticsInput.safeParse({
      event: "vehicle_selected",
      context: { locale: "ar", make: "opel", year: 2020 },
    }).success,
    true,
  );
});
test("stored public slugs survive item name changes and reports exclude private cost and protect spreadsheet formulas", () => {
  const p = { ...product, id: "11111111-1111-4111-8111-111111111111" };
  const slug = publicProductSlug(p);
  assert.equal(
    publicProductSlug({
      ...p,
      name: { ar: "اسم آخر", en: "Another name" },
      specs: { public_slug: slug },
    }),
    slug,
  );
  const rows = seoHealthRows(
    [{ ...p, cost: 1234567 }],
    [],
    [],
    [],
    "https://mopc.store",
  );
  assert.ok(!JSON.stringify(rows).includes("1234567"));
  assert.ok(csvReport([{ name: "=BAD()" }]).includes("'=BAD()"));
});
test("SEO timestamps leave legacy dates unknown, ignore cost-only edits and track public content and image changes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create table products(id text primary key,name text,cost integer,created_at timestamptz);create table cms_pages(id text);create table vehicle_models(id text);create table product_images(id text,product_id text);create table analytics_events(event text constraint analytics_events_event_check check(event in ('purchase')));insert into products values('legacy','Old',10,now());`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261109101710_seo_content_dates_and_analytics.sql",
        "utf8",
      ),
    );
    const stamp = async () =>
      (
        await db.query<{ stamp: string | null }>(
          "select seo_updated_at::text as stamp from products where id='legacy'",
        )
      ).rows[0].stamp;
    assert.equal(await stamp(), null);
    await db.exec("update products set cost=20 where id='legacy'");
    assert.equal(await stamp(), null);
    await db.exec("update products set name='Changed' where id='legacy'");
    assert.ok(await stamp());
    await db.exec(
      "update products set seo_updated_at=null where id='legacy';insert into product_images values('photo','legacy')",
    );
    assert.ok(await stamp());
  } finally {
    await db.close();
  }
});

test("fractional legacy prices are withheld from merchant offers instead of disagreeing with whole-pound display", async () => {
  const { productStructuredData } = await import("../src/lib/product-seo");
  const p = { ...product, price: 12345, sale: null };
  assert.equal(
    productStructuredData(p, "ar", "https://mopc.store", [])!.offers,
    undefined,
  );
  assert.ok(
    feedExclusionReasons(p, "ar", ["/image.jpg"]).includes(
      "fractional_price_review",
    ),
  );
});
