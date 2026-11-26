# MOPC — Live SEO validation and next actions (2026-11-26)

## What this iteration implements

- Added a **read-only production crawl audit** at `scripts/seo-live-audit.mjs`. It checks robots access, sitemap index and groups, sitemap URL origins, the first three URLs in each populated sitemap, response statuses, canonical tags, unexpected noindex directives and the Arabic home redirect.
- Updated `src/app/robots.ts` so a sitemap is **only advertised** when `sitemapPublished()` allows the XML sitemap to be served. Preview, unapproved and database-disconnected environments no longer publish a dead sitemap declaration.
- Added regression assertions to `tests/seo-build.test.ts`.

## How to validate a live deployment

Run after production has deployed the commit and the storefront has been approved for crawling:

```bash
npm run prebuild
node scripts/seo-live-audit.mjs https://mopc.store
```

The script is read-only, uses GET requests, samples a maximum of three pages per sitemap, applies 15-second request timeouts, and exits with a non-zero status on failed checks. Do **not** interpret a pass as complete coverage: it samples URLs rather than checking the whole catalog, does not submit to search engines and cannot verify that Google indexed a URL.

## Release checklist

1. Verify `SEO_DOMAIN_MIGRATION=true`, `STORE_LAUNCH_APPROVED=true`, `VERCEL_ENV=production` and a valid `NEXT_PUBLIC_SUPABASE_URL` in the actual production deployment. Do not enable crawling in previews.
2. Run the audit against `https://mopc.store`. Investigate any 404, cross-origin URL, canonical mismatch or noindex violation before submitting a sitemap.
3. Submit `https://mopc.store/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Inspect a **real** product URL, a category URL and a make/model URL; compare each Google-selected canonical with the declared canonical.
4. Review Search Console coverage weekly: crawled-not-indexed, duplicate without user-selected canonical, soft 404, redirect errors and sitemap-discovered URLs.
5. Prioritize catalog quality using the existing SEO health report: missing part numbers, verified compatibility, unique Arabic/English descriptions, product photos, stock/condition and manufacturer evidence. Do not invent specs, reviews, ratings, availability or guarantees.
6. Re-run audit after changes to product routes, model aliases, sitemap generation, locale handling or Next.js middleware.

## Follow-up development priorities

- **P1:** Expand automated monitoring from sampled URLs to a complete sitemap integrity crawl in CI or a controlled external job, with throttling and alerting. Keep production traffic and crawl budgets in mind.
- **P1:** Correlate real Search Console landing pages/queries with catalog coverage. Prioritize model + part type + part number queries that have actual products, rather than creating empty thin landing pages.
- **P2:** Add category and model landing-page copy only where inventory is verified and unique helpful information exists. Keep reciprocal hreflang and canonical logic tested.
- **P2:** Measure Core Web Vitals by template (product, category, brand/model) on mobile before choosing performance fixes. Image work may be deferred separately.
- **P2 / AIO:** Ensure existing product and vehicle structured data stays aligned with visible facts; keep help and policy pages discoverable. There is no special guaranteed AI ranking mechanism.

## Boundaries

These commits change source only. They are **not** proof of a successful build, live production deploy, indexing, merchant feed acceptance or search ranking improvement. Run the checks above and inspect the actual deployment before considering these verified.
