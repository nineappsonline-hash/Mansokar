# MOPC SEO and AI discovery release — 9 November 2026

## 1. Audit findings

Read-only production inventory: 5 makes, 20 saved models, 48 engine/year configurations, 86 model-year records, 430 products, 424 real published products, 350 products with photos. No vehicles, fitments, reviews, GTINs or inventory quantities were invented. All 424 real published products have model applications, but no exact configuration fitment records were found. Model/year association is not engine-specific confirmation.

174 published products lack usable English names. Twelve saved models have no linked published products: Peugeot 301/308/3008/2008, Citroën C3/C4/C5, MG 5/6/ZS/HS/RX5. They remain accessible to customers but are withheld from model sitemaps and marked noindex until populated. Brand pages remain useful vehicle navigation.

306 published effective prices have fractional EGP values while public prices display whole pounds. Saved prices and checkout calculations were not changed. Structured offers and merchant feed entries are withheld for these products until a consistent price is approved. The admin report flags `fractional_price_review`.

The production site currently has indexing disabled. `mopc.store` and `www.mopc.store` failed DNS preflight and the domain was not attached to the accessible Vercel account. Terms and Privacy are missing; Returns is a draft. Checkout's existing policy gate remains intact. External Search Console, GA4 and Merchant Center accounts were not connected or claimed verified.

See `seo-audit.md`, `seo/catalog-baseline.json`, `seo/http-baseline.json`, `seo/vehicle-inventory.csv` and `seo/product-audit.csv`. Unknown fields are explicitly unknown. No customer records, costs or credentials are included.

## 2. Changed files and migration

- `src/lib/site-url.ts`, `src/proxy.ts`, `next.config.ts`, `src/app/layout.tsx`: one canonical origin, opt-in host migration, preview noindex, locale HTML and initial metadata. Root resource validation preserves HTTP 404 above the loading boundary. Blocking metadata trades some initial latency for complete initial HTML/status correctness.
- `src/lib/seo-policy.ts`, `seo-inventory.ts`, `seo-pages.ts`, `sitemap-xml.ts`, `src/app/sitemap.xml/route.ts`, `src/app/sitemaps/[group]/route.ts`, `src/app/robots.ts`: eligibility, partitioned XML, actual translated alternates, real timestamps only, image URLs and crawler preferences. Replaces the previous flat `src/app/sitemap.ts`.
- `src/app/[locale]/[[...path]]/page.tsx`, `src/lib/public-product.ts`, `product-seo.ts`, `product-specifications.ts`: pagination canonicals, alias normalization, truthful schema, unknown-field omission, private specification filtering and automatic/manual SEO behavior.
- `src/components/model-year-cards.tsx` and its CSS: ordinary crawlable model link alongside the existing expandable year selection. `model-search-content.tsx` and `seo-content.module.css`: saved years/counts and compatibility buying help below products. `buying-guide.tsx`: organization authorship/publisher and current catalog/model internal links.
- `src/components/admin-seo*.tsx`, `src/lib/seo-health*.ts`, `src/app/api/admin-seo-report/route.ts`: authenticated remediation dashboard, completeness (not ranking) score, canonical/copy previews and CSV. Product editors add optional verified stock/condition and explicit SEO overrides; basic automatic entry remains available.
- `src/lib/merchant-feed.ts`, `src/app/api/merchant-feed/route.ts`: authenticated XML feed scaffold; only verified eligible products. No account submission or paid campaign was activated.
- `src/components/analytics.tsx`, `forms.tsx`, `src/lib/analytics-input.ts`, `src/app/api/[action]/route.ts`: consent-aware events, sanitized context, optional GA4, public-product ID resolution, stable URLs/manual overrides across saves and Excel updates. Browser purchase events are rejected; existing server-confirmed purchase processing remains authoritative.
- `src/lib/catalog.ts`, `db.ts`, `validation.ts`, `.env.example`: optional types, guarded content-date reads and configuration.
- `tests/seo-foundations.test.ts`, `tests/product-seo.test.ts`, `package.json`, `scripts/seo-*.mjs`: regression coverage, repeatable read-only audits and browser measurements. Existing CI runs the expanded `npm test`.
- `supabase/migrations/20261109101710_seo_content_dates_and_analytics.sql`: nullable content dates, future content/image update triggers, extended analytics events and sanitized JSON context. No legacy-date backfill or RLS/grant expansion. Applied remotely and columns verified read-only. Prior manually applied shipping/payment migrations were excluded from an isolated CLI work directory; their schema/history was not replayed or repaired.

Your separate vehicle styling and Excel import/export filter edits are preserved. No commit, push, production application deployment, DNS or domain switch was performed for this release.

## 3. Implemented features by phase

1. Technical foundation: central origin, staged 308 host normalization preserving paths/queries, locale canonicals/hreflang, eligible sitemap partitions, crawlable facets with noindex, self-canonical model pagination, unsupported-resource 404s and preview protection.
2. Product/vehicle SEO: one public product identity across car contexts, stable saved public slugs, optional explicit editorial overrides, real manufacturer numbers/images, no invented stock/condition/reviews, data-backed model introductions, direct model/product/guide links. Fractional legacy prices cannot create inconsistent merchant offers.
3. Merchant/measurement scaffold: authenticated feed, strict activation gates, consent-based GA4 and local events, no private search text or contact details, server-only purchase authority. Actual merchant approval and analytics connection remain external.
4. Content/AI discovery: four existing bilingual buying guides strengthened with publisher identity and real internal links; 20 saved-model keyword destinations, recorded MPN map, and 64 repeatable Egyptian Arabic/English prompts. No mass doorway pages or fabricated search-volume/citation results. Existing source content dates remain unknown when not recorded.
5. Automation: authenticated SEO health filters/export, future content dates, isolated module styles, CI regression tests and repeatable rendered/performance/image audits.

## 4. Test results and reproduction

- `npm test`: passed, including existing database/RLS/checkout/idempotency/import/domain tests and eight new SEO foundation tests. The new timestamp test proves legacy dates remain null, cost-only edits do not stamp public content, and public content/images do.
- `npm run build`: production compilation and TypeScript validation passed. `npm run typecheck`: passed.
- `BASE_URL=http://127.0.0.1:3115 node scripts/seo-render-check.mjs`: read-only production-build checks for Arabic/English HTML, one H1, canonical, parsed JSON-LD, model pagination, noindex facets, 404, unauthorized admin/feed access and responsive overflow; interactive model/year/product/cart regression included. Results: `seo/rendered-validation.json`.
- `BASE_URL=http://127.0.0.1:3115 node --env-file=.env.local scripts/seo-image-audit.mjs`: all 20 sampled images passed after bounded GET retry. 350 saved image records exist; this is a sample, not a full image certification. `IMAGE_AUDIT_LIMIT=0` runs all records. Results: `seo/image-validation.json`.
- Representative routes: `/ar`, `/en`, `/ar/brands/chevrolet`, `/ar/brands/chevrolet/captiva`, a real canonical product selected from the product sitemap, and `/ar/guides/check-part-compatibility`. The report records exact selected URLs. Production origin remains `mansokar.vercel.app` until cutover.
- Browser PerformanceObserver records mobile 390px and desktop 1440px LCP/CLS and DOM timing on home/brand/model/product/guide. Measurements are local, unthrottled, single runs with the real remote catalog; they are not field p75, Lighthouse scores or INP certification. No fabricated Lighthouse or Search Console score is claimed. The recorded ten runs show LCP 360–2,384 ms and maximum CLS 0.00165; obtain field Core Web Vitals after launch.
- Structured-data JSON parses and application assertions pass. Google Rich Results/Merchant diagnostics must be run against the deployed public URLs; local validation is not Google certification or a guarantee of rich results/AI citations.
- `supabase db push --dry-run` listed only the new SEO migration; apply succeeded. Read-back verified all three date columns and analytics context. Supabase security advisor returned HTTP 403 due to account privileges; no clean advisor result is claimed. Local RLS and migration tests pass.

Local server reproduction: `SEO_CONTENT_TIMESTAMPS_ENABLED=true npm run start -- --hostname 127.0.0.1 --port 3115` after building. Keep real secrets in the environment. These audit commands do not place orders or charge cards.

## 5. Deployment and rollback status

Application changes are local and tested; the additive database migration is applied. Current canonical domain, DNS, indexing approval and external account settings were not changed. `SEO_CONTENT_TIMESTAMPS_ENABLED=true` may be enabled on rollout now that the column migration is verified. It gates enriched analytics and public content-date reads; legacy event collection remains compatible when false.

Before cutover, attach and verify `mopc.store` and `www.mopc.store` in the correct Vercel project/account. Use Vercel's assigned DNS values, verify both DNS answers and TLS, then test home, both locales, saved make/model/product, guide, sitemap, auth callback and payment callback routes. Payment/auth endpoints are deliberately excluded from host redirects. Update provider allowlists/configuration under owner control and test checkout only after approved policies are published.

Only after successful preflight and owner approval: set `SEO_DOMAIN_MIGRATION=true`, `NEXT_PUBLIC_SITE_URL=https://mopc.store`, and, for the approved production deployment, `STORE_LAUNCH_APPROVED=true`; redeploy. Confirm all old public URLs 308 directly to the new canonical host with no loops, www normalizes, private callbacks work, and previews retain noindex. URL map: `seo/domain-url-map.csv` (staged, not active).

Rollback: disable `SEO_DOMAIN_MIGRATION`, restore the previous `NEXT_PUBLIC_SITE_URL` and indexing flag, disable merchant/GA4 flags if necessary, and redeploy the prior application revision. Keep additive columns/triggers in place so rollback does not destroy data; no destructive SQL rollback is needed. DNS rollback should use the owner-recorded prior values. Preserve old-host redirects long term after a successful migration.

## 6. External setup checklist

- Domain/DNS/TLS: owner access and successful preflight plus explicit cutover approval remain required. No nameserver changes made.
- Search Console: create/verify the domain property via owner DNS or provide `GOOGLE_SITE_VERIFICATION` for URL-prefix verification. Submit `/sitemap.xml`; inspect representative URLs, then monitor index coverage, canonical selection and 404s. If moving an established indexed property, follow Google's Change of Address requirements. No service-account data integration is claimed.
- Merchant Center: Egypt, Arabic/English and EGP are supported according to current official documentation, but this merchant account/program eligibility is unverified. Verify/claim the store, publish approved business/policy information, configure actual Egypt shipping/returns, resolve price mismatches and fill verified stock/condition. Keep `MERCHANT_FEED_ENABLED`, `MERCHANT_EG_ELIGIBILITY_CONFIRMED`, `MERCHANT_SHIPPING_CONFIGURED` false until verified.
- Feed setup after those gates: configure a strong server-only `MERCHANT_FEED_TOKEN`. Use `/api/merchant-feed?locale=ar` (or `en`), Bearer auth for controlled downloads, or scheduled-fetch HTTP Basic username `MERCHANT_FEED_USERNAME` (default `mopc-feed`) and token as password. Do not put the credential in the URL. Review account diagnostics before enabling any destination. No feed/product submission performed.
- GA4: supply an owned `NEXT_PUBLIC_GA4_ID`, enable existing `ANALYTICS_ENABLED`, rebuild, accept consent, and verify in DebugView/Realtime. Disable GA4 enhanced measurement/automatic search collection to preserve the configured privacy contract. The app sends sanitized paths and context, not raw queries/VIN/phone/email. Existing server purchase events are authoritative; GA4 Measurement Protocol purchase/revenue reconciliation needs account-specific credentials and is not connected.
- AI crawling: ordinary search retrieval remains available when public indexing is approved. Training crawlers GPTBot and Google-Extended stay disallowed unless the owner sets `SEO_ALLOW_TRAINING_CRAWLERS=true`. Do not enable training by assumption. Run the 64 prompts manually with recorded date/platform/location/model; cite actual observations only.
- Database security advisor: an owner with advisor privileges should rerun it; the current account returned 403.

## 7. Content and keyword backlog

`seo/verified-model-keyword-map.csv` maps all 20 actual saved models to existing localized URLs and records product counts/index eligibility; query language is a demand hypothesis, not measured volume. `seo/part-number-keyword-map.csv` uses actual saved manufacturer part numbers. `seo/ai-visibility-prompts.csv` provides 64 unrun prompts for the eight models with products. `seo/measurement-dashboard-template.csv` leaves external metrics unknown.

First improve the 174 missing English names using verified part terminology and manufacturer references. Confirm actual inventory and whole-pound pricing. Add photographs where missing (80 products have no photo record). Review potentially invalid country-of-origin values and MPN collisions in the admin report. Record exact engine/configuration fitment only from a trusted parts source; never infer it from the make/model name.

Prioritize content from measured Egypt Search Console queries and customer requests. Strengthen the existing compatibility, item-brand/origin, price-comparison and vehicle-identification guides, linking to eligible model/product pages. Add model-specific guides only where actual product coverage and distinct questions justify them. Reuse model canonicals for individual-year intent; do not mass-generate identical year pages. Saved models without products need real products before indexing, rather than speculative sales copy. Track installment demand without claiming that a listed finance provider is an active store payment method.

## 8. Known issues and next priorities

1. P0: domain ownership/DNS/TLS and launch indexing approval; missing approved checkout policies also block commercial payment testing. No payment transactions were attempted for this SEO task.
2. P1: 306 fractional effective prices, unknown stock across the catalog, 174 missing English names and 80 products without photos; these limit merchant eligibility and product discovery. Existing product prices/stock were not fabricated or bulk-edited.
3. P1: connect owned Search Console/GA4/Merchant accounts, inspect rich results/feed diagnostics and monitor paid-confirmed conversions. Existing local event counts do not substitute for external search impressions or GA4 revenue reconciliation.
4. P2: exact configuration fitment evidence, validated query demand, monthly AI citation observations and field performance measurement. Lab measurements cannot certify real-user Core Web Vitals.
5. P2: full image audit and authorized database advisor rerun. The image sample has passed; complete catalog/network reliability remains unmeasured.

Official references checked: [Google AI guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [merchant listing schema](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), [site migration](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), [supported countries/currencies](https://support.google.com/merchants/answer/160637?hl=en), [scheduled data-source fetching](https://support.google.com/merchants/answer/14991445?hl=en), [OpenAI crawler controls](https://developers.openai.com/api/docs/bots). Ranking, rich results and AI citations are not guaranteed.
