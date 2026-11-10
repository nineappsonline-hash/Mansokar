# MOPC.store — SEO & AI Search Implementation Specification

**Project:** MOPC automotive spare parts e-commerce, Egypt  
**Current site:** `https://mansokar.vercel.app/ar`  
**Production domain:** `https://mopc.store`  
**Primary market:** Egypt  
**Languages:** Arabic (`ar-EG`, primary), English (`en-EG`, secondary)  
**Document version:** 1.0 — 2026-11-09  
**Audience:** AI coding agent / development team  

> **Execution mandate:** Implement the requirements below in the existing application. Inspect the repository, database schema, routes, deployment configuration, and real product/vehicle records before changing code. Preserve the existing customer journey and visual design. Never fabricate products, compatibility, manufacturer specifications, reviews, inventory, pricing, or search volumes. Do not create landing pages for unsupported vehicles.

## 0. Non-negotiable scope and operating rules

1. **The existing database/site is the source of truth for ALL supported brands, models, generations, years, engines, and transmissions.** The owner confirmed the currently listed cars are the complete supported scope. No new vehicle models are to be added in this project. The catalog may expand in a few months; design for expansion without pre-publishing unsupported pages.
2. Do not hard-code an assumed list of vehicles. An earlier homepage inspection suggested Chevrolet, Opel, MG, Peugeot, and Citroën, but enumerate the actual current production records before implementation. Examples throughout this specification are illustrative only.
3. Preserve the site's **vehicle-first** shopping flow. SEO-oriented component landing pages may exist without adding conventional category navigation to the storefront.
4. Do not change pricing, inventory, checkout, payment, shipping, or fitment logic unless specifically required to fix an identified bug and tested.
5. Never assert compatibility from brand/model names alone. Require verified fitment evidence. A missing fitment relationship is **unknown**, not compatible.
6. Do not mass-produce thin pages, duplicate model/year URLs, fake local landing pages, synthetic reviews, or unverified technical advice.
7. Use real inventory and actual customer-facing business policies. No fake ratings, GTINs, OEM claims, delivery promises, warranties, or certifications.
8. No one can guarantee first-page or #1 Google rankings. Optimize measurable search visibility and organic revenue.
9. Use staged releases and feature flags for migration-sensitive changes. Document rollback.
10. **Before implementing:** produce an inventory of routes, tables, metadata, current SEO defects, deployment assumptions, and affected files. Then execute in phases; do not stop after an audit unless blocked by missing credentials or approval.

## 1. Definition of done and deliverables

Deliver a working implementation, not merely recommendations:

- Correct canonical production domain `mopc.store`, permanent old-to-new redirects, HTTPS and host normalization.
- Indexable, server-rendered Arabic and English homepage, brand, supported model, eligible product, and useful guide pages.
- Stable URLs, canonical tags, reciprocal hreflang, localized metadata, correct `lang`/`dir`.
- Generated XML sitemap index and child sitemaps, accurate `robots.txt`, deliberate indexability rules.
- Accurate JSON-LD for organization, breadcrumbs, products/offers, articles, and business policies where supported.
- SEO-aware vehicle and product navigation with ordinary HTML anchor links.
- SEO content templates populated from verified catalog and vehicle data.
- Product title/description quality checks, image audit, missing-data workflow.
- Merchant Center-compatible product feed for eligible products, gated on current country/program eligibility.
- Analytics events, Search Console readiness, KPI dashboard or export, error monitoring.
- An admin SEO health view and automated SEO checks integrated into CI.
- A final deployment report listing changed files, migrations, tested routes, measured results, remaining manual actions, and known risks.

### Acceptance criteria

- All eligible public pages return meaningful HTML in the initial response (not blank JavaScript shells).
- No public indexable page canonicalizes to the staging domain.
- Unsupported/empty vehicle combinations are not indexable.
- Every indexable product URL is unique, stable, and reachable through crawlable links or an XML sitemap (prefer both).
- Every product's visible price/availability matches its structured data and feed.
- Valid schema markup with no fabricated fields.
- `mopc.store` host normalization and migration redirects work with no redirect loops.
- Arabic and English locale pairs have correct reciprocal hreflang only when both translations exist.
- Product search, checkout, cart, accounts, and vehicle filtering continue working after deployment.
- Automated tests cover the key conditions and failures below.

## 2. Discovery / audit phase (mandatory)

### 2.1 Repository and infrastructure inspection

Determine and record:

- Framework/version (likely Next.js; verify), App Router vs Pages Router, SSR/SSG/ISR approach.
- Hosting, Vercel domain configuration, middleware, edge caching, auth and bot protections.
- Current public route tree and URLs in both languages.
- Product/vehicle schema, fitment join tables, inventory, pricing, images, manufacturer references.
- Existing SEO fields, sitemap/robots/canonical/hreflang/schema implementation.
- Existing guide/blog infrastructure, translation framework, product listing pagination.
- Current search and filtering behavior; how URLs are constructed and indexed.
- Current Google Analytics, Search Console, Merchant Center, and tag manager connections.

Create `/docs/seo-audit.md` with a route matrix and issues labeled P0/P1/P2. Capture baseline HTTP status, canonical, title, H1, robots, JSON-LD, image state, page speed, and indexability for representative pages of every template.

### 2.2 Vehicle scope inventory

Export a **read-only** authoritative inventory with columns:

`brand_id, brand_slug, brand_name_ar, brand_name_en, model_id, model_slug, model_name_ar, model_name_en, generation_id, generation_name, year_from, year_to, engine_code, engine_size, transmission, market, active, published, eligible_product_count`

Do not invent missing engine or generation fields. If fields do not exist, mark them `unknown` and avoid making specific claims. Compare the live frontend to database records and resolve discrepancies before page generation.

### 2.3 Product data audit

Export or query:

`product_id, canonical_slug, title_ar, title_en, description_ar, description_en, internal_sku, brand/manufacturer, manufacturer_part_number, OEM_references, GTIN, product_condition, stock, price_egp, image_urls, fitment_links, warranty, shipping_eligibility, published, updated_at`

Assess missing/duplicate titles, empty descriptions, part-number collisions, incorrect transliterations, broken images, stock inconsistencies, and orphan products. Existing site observations suggested roughly 430 catalog results at one point; **do not assume this count is current**.

### 2.4 Search baseline and competitor research

When access is available, export 3–6 months of Search Console query/page/device/country data, index coverage, Core Web Vitals, and top pages. Use live Egyptian SERPs and an actual keyword tool to validate volume and competition. Do not invent numbers. Record a keyword-to-page map and SERP intent for each supported model, part family, and verified manufacturer part number.

## 3. Site architecture and indexability

**Prefer preserving existing stable public routes** unless a change has a demonstrated SEO/UX benefit. If changing paths, implement exact 301/308 redirects.

Suggested logical structure (adapt to existing routes):

```text
/ar/                          Arabic homepage
/en/                          English homepage
/ar/brands/{brand}/           Supported brand landing
/ar/cars/{brand}/{model}/     Supported model landing
/ar/products/{slug}/          Unique canonical product page
/ar/guides/{slug}/            Verified buying and fitment guides
/ar/parts/{part-family}/      OPTIONAL editorial/commercial landing (only with sufficient real inventory)
/en/...                       Localized equivalents when content exists
/sitemap.xml                  Sitemap index
/sitemaps/products.xml        Product sitemap (split if needed)
/sitemaps/vehicles.xml        Brand/model sitemap
/sitemaps/guides.xml          Guides sitemap
/robots.txt                   Crawler directives
```

### 3.1 Eligibility rules

| URL type | Indexing | Conditions |
|---|---|---|
| Homepage | index | Public, substantive |
| Brand | index | Supported and published, useful model links/content |
| Model | index | Supported and published, useful content and/or real available inventory |
| Model/year | selective | Distinct verified fitment/inventory and search utility; avoid near duplicates |
| Model/engine | selective | Only if materially distinct and verified |
| Product | index | Published, real product with substantive information; stock policy reviewed |
| Guides | index | Original, accurate, maintained content |
| Component page | selective | Useful, distinct real catalog coverage |
| Empty filters/search results | noindex | Avoid crawl traps; do not block noindex pages from being crawled |
| Cart/checkout/account | noindex or auth | Protect private data with authentication |
| Sorting/tracking params | canonical/URL control | Do not generate indexable duplicates |
| Unsupported vehicle combination | 404 or noindex | Never publish invented coverage |

Do not add `noindex` to a page and simultaneously block it in robots.txt if crawlers must see the directive. For discontinued products, decide case-by-case: keep informative page, link to verified substitute, 301 only to a genuinely equivalent replacement, or 404/410.

### 3.2 Crawlable linking

- Homepage links to all currently supported brand pages.
- Each brand page links to every currently supported model page.
- Each model page links to its real eligible products and relevant guides.
- Products link back to verified vehicle pages; multi-vehicle products use **one** canonical product URL.
- Pagination uses real `<a href>` links; do not canonicalize all pages to page one.
- Render breadcrumbs in HTML and structured data.
- Avoid creating infinite combinations of facets and query parameters.

## 4. On-page SEO templates

### 4.1 Language and terminology

Arabic is primary; use natural Egyptian automotive terminology. English is secondary. Cover genuine spelling variants in visible content naturally (e.g. `ستروين`, `سيتروين`, `Citroen`), without duplicating pages. Keep technical product names precise and human-reviewed.

### 4.2 Metadata templates

**Homepage (illustrative):**

- Title: `قطع غيار سيارات أصلية وبديلة في مصر | موبك MOPC`
- Description: `اختار عربيتك ودور على قطع الغيار المتاحة من موبك. راجع رقم القطعة والتوافق والأسعار وطرق الدفع والتوصيل داخل مصر.`

**Brand:**

- Title: `قطع غيار {brand_ar} في مصر | {verified_top_models} | موبك`
- H1: `قطع غيار {brand_ar} في مصر`
- Description: Natural 140–160-ish-character summary of verified coverage; avoid forced length.

**Model:**

- Title: `قطع غيار {brand_ar} {model_ar} في مصر | موبك`
- H1: `قطع غيار {brand_ar} {model_ar}`
- Description: Model-specific available inventory and fitment confirmation, not invented specs.

**Product:**

- Title: `{verified_part_name_ar} {manufacturer} {mpn_if_verified} | موبك`
- H1: Descriptive accurate product name.
- Description: Unique summary including verified manufacturer/part number, real price/availability if maintained, and fitment-check CTA.

Avoid identical titles across SKUs, excessive keyword stuffing, claims like “original” unless verified, and changing URLs just to insert keywords.

### 4.3 Brand/model page content

For each supported brand/model, build reusable templates with:

1. Concise original introduction based on actual coverage.
2. Supported configurations/years from the database.
3. Actual product listing with crawlable links.
4. Manufacturer/OEM and aftermarket distinctions only where accurate.
5. Compatibility check and warnings for unknown fitment.
6. FAQs based on genuine questions and supported answers.
7. Links to guides and shipping/returns information.
8. No empty keyword sections or templated filler.

### 4.4 Product detail content

Required presentation where data exists:

- Arabic and English descriptive names.
- Internal SKU vs MPN vs OEM cross-references kept separate.
- Manufacturer, actual product condition, genuine/aftermarket status.
- Real images and accessible alt text.
- Current price in EGP, stock, warranty, shipping and return details.
- Verified compatible configurations with model/year/engine/market when available.
- Compatibility status: **confirmed / incompatible / needs verification**.
- Useful technical specs and install warnings only from reliable sources.
- Related verified alternatives, links to models and guides.
- Clear CTA to confirm compatibility before purchase.

Never infer fitment based solely on matching text, brand, or part family.

## 5. Technical implementation

### 5.1 Rendering and metadata

- Render public SEO pages with server-side or statically generated HTML (Next.js metadata APIs if applicable).
- Return correct status codes, no soft 404s for nonexistent vehicles/products.
- Emit unique title, description, canonical, Open Graph/Twitter metadata as appropriate.
- Use `html lang="ar-EG" dir="rtl"` on Arabic pages; English `lang="en-EG" dir="ltr"`.
- Ensure server-rendered price/stock and JSON-LD are synchronized with data freshness/caching strategy.

### 5.2 Canonicals and hreflang

- All canonical URLs use `https://mopc.store` and one consistent trailing-slash policy.
- Canonical to self for unique indexable pages; do not canonicalize different products together.
- Use reciprocal `ar-EG` and `en-EG` alternates only for genuinely corresponding published translations.
- Add `x-default` if a suitable neutral/default destination exists.
- Do not create English placeholders with untranslated Arabic content.

### 5.3 Sitemaps and robots

- Generate sitemap index and partitioned child sitemaps from published, canonical, eligible records.
- `<lastmod>` must reflect meaningful content updates, not arbitrary build time.
- Exclude auth, cart, checkout, internal search, duplicate filters, unsupported configurations, and noindex pages.
- Add sitemap URL to `robots.txt`; do not block public SEO assets or content.
- Do not treat robots.txt as a security control.

### 5.4 Performance

Measure mobile and desktop with Lighthouse/PageSpeed and real-user data. Target 75th-percentile **LCP ≤2.5s, INP ≤200ms, CLS ≤0.1**. Optimize LCP image preload/priority, responsive images, dimensions, caching, DB queries, unnecessary JavaScript, fonts, and layout stability. Do not lazy-load above-the-fold LCP image. Retest representative routes after changes.

### 5.5 Images

- Audit all product image URLs for broken/missing assets.
- Prefer actual clean product images, not unrelated stock imagery.
- Use responsive sizes, modern formats, proper intrinsic dimensions, descriptive alt text.
- For feeds, comply with product image requirements; avoid watermarks/promotional overlays.
- Maintain fallback UX without presenting fallback as actual product photo.

## 6. Structured data

Use JSON-LD from authoritative server data. Implement:

- Homepage: `Organization`, `WebSite` (avoid unsupported search-action claims).
- Breadcrumbs: `BreadcrumbList` on applicable pages.
- Product: `Product` + accurate `Offer` or supported offer structure.
- Guides: `Article`/`BlogPosting` with genuine author and update date.
- Physical store: `LocalBusiness` **only** if actual qualifying business/location data exists.
- Returns/shipping policies where supported by current Google merchant markup.
- Reviews/ratings **only** from genuine, eligible customer review data.

Example *template* (all placeholders must be replaced with verified values):

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{verified_product_name}}",
  "sku": "{{internal_sku}}",
  "mpn": "{{verified_manufacturer_part_number}}",
  "brand": {"@type": "Brand", "name": "{{verified_manufacturer}}"},
  "image": ["{{actual_product_image_url}}"],
  "description": "{{accurate_description}}",
  "offers": {
    "@type": "Offer",
    "url": "{{canonical_product_url}}",
    "priceCurrency": "EGP",
    "price": "{{current_price}}",
    "availability": "{{actual_schema_org_availability_url}}",
    "itemCondition": "https://schema.org/NewCondition"
  }
}
```

Omit unavailable/unknown optional fields rather than outputting placeholders. Do not mark used/refurbished goods as new. Validate with Google's Rich Results Test and Schema.org validator; automated test actual rendered JSON-LD. FAQ content may be useful for people but should **not** be expected to receive FAQ rich results on an ordinary retail site.

## 7. Google Merchant Center and shopping discovery

1. Check Egypt eligibility and applicable free-listing/merchant program requirements **at implementation time**.
2. Configure verified merchant identity, returns, shipping, and checkout policies.
3. Build an authenticated/scheduled feed or supported API integration with actual eligible products.
4. Include ID, title, description, canonical link, image, availability, EGP price, condition, verified brand, verified MPN/GTIN where available, and required shipping attributes.
5. Never invent GTINs or mark a product as in stock if unavailable.
6. Keep feed, visible HTML, and schema aligned. Update promptly on price/stock changes.
7. Monitor disapprovals and fix actual errors; don't assume feed submission guarantees free listings.

## 8. AIO / AI search visibility

**Objective:** Make real MOPC information easy for search and AI retrieval systems to access, verify, and cite. No guaranteed AI mentions or special ranking shortcut.

### 8.1 Content principles

- Publish concise direct answers followed by detailed evidence and caveats.
- Create verified guides on OEM/MPN lookup, genuine vs aftermarket, fitment verification, model-specific buying, and common purchasing mistakes.
- Include real part numbers, configuration tables, manufacturer references, actual product links, original images, author/reviewer details when genuine, and last verified date.
- Do not fabricate technical specs, service intervals, repair procedures, or testimonials.
- Link each guide to real model/product pages and vice versa.
- Use natural Arabic and English; avoid mass-produced near-duplicate AI content.

### 8.2 Retrieval accessibility

- Ensure public pages expose substantive server HTML, stable URLs, clear headings, accurate schema, and ordinary links.
- Review bot/security configuration to allow desired search crawlers. Distinguish AI **search retrieval** crawlers from AI **training** crawlers; honor owner preferences.
- `llms.txt` is optional and low priority, not a Google ranking requirement.
- Do not block public pages behind mandatory login or car selection.

### 8.3 AI visibility monitoring

Maintain 50–100 verified, representative Egyptian Arabic/English prompts based on actual supported cars and parts. Monthly test citation/mention, destination URL, factual accuracy, and competing sources across available AI search products. Store test date and conditions. AI referrals are useful but incomplete; never call them total AI exposure.

## 9. Keyword research and content plan

### 9.1 Keyword groups

For **every actually supported** brand/model/configuration, research:

- `قطع غيار {brand}`
- `قطع غيار {brand} {model}`
- `قطع غيار {brand} {model} {generation}`
- `قطع غيار {brand} {model} {year}` (only if a useful distinct page is justified)
- `{part_name_ar} {brand} {model}`
- `سعر {part_name_ar} {brand} {model}`
- `{manufacturer_part_number}`
- `{OEM_part_number}`
- `{brand} {model} spare parts Egypt`
- Common Egyptian colloquial names and verified spelling variations.

Map one primary intent to one canonical destination. Do not create duplicate pages for each spelling. Prioritize queries with evidence of purchase intent, real stock, verified fitment, and realistic SERP competition.

### 9.2 Initial guide backlog

1. `إزاي تعرف رقم قطعة الغيار الأصلية لعربيتك؟`
2. `إزاي تتأكد إن قطعة الغيار مناسبة لعربيتك؟`
3. `الفرق بين قطع الغيار الأصلية والبديلة`
4. `إيه الفرق بين رقم OEM ورقم الشركة المصنعة؟`
5. `إزاي تختار تيل الفرامل المناسب؟`
6. One buying guide for **each actual supported model** selected by search demand.
7. Manufacturer-number explainers for important **verified stocked parts**.

Use an editorial checklist: query intent, accurate answer, sources, verified vehicle scope, internal links, real images, no misleading claims, updated date, review owner. Don't publish an article solely to hit a weekly quota.

### 9.3 Content production sequence

- First optimize existing indexable product and brand/model pages.
- Then publish high-value model/part-family pages where there is substantial unique inventory.
- Then add verified buying/compatibility guides.
- Refresh based on Search Console queries, conversion data, stock, and accuracy checks.

## 10. Domain migration: `mansokar.vercel.app` → `mopc.store`

**Do not switch domains until the target passes preflight tests.** A prior external attempt to reach `mopc.store` returned an error; recheck current live state rather than assuming ongoing outage.

### Preflight

- Verify domain ownership, DNS, TLS, hosting, WWW/apex preference, HTTPS, and accessibility.
- Export **all** old public URLs including product and locale variants.
- Generate exact old-to-new URL mapping, preserving stable slugs when possible.
- Record baseline Search Console/indexing, analytics, traffic, backlinks, sitemap, and redirects.
- Check staging/prod environment variables and canonical host generation.
- Test new routes, robots, sitemap, schema, locale links, image URLs, and checkout.

### Cutover

- Use server-side permanent **301 or 308** redirects from each old URL to its corresponding new URL; preserve relevant paths and query behavior without redirect loops.
- Redirect all old hosts and variants consistently; no broad redirect of all products to homepage.
- Set new canonical and hreflang URLs; update internal links, sitemaps, schema, email templates, feed URLs, social profiles, and business citations.
- Verify both domains in Google Search Console and use Change of Address where applicable.
- Submit new sitemaps and request inspection of key URLs.
- Keep old-to-new redirects active for at least one year, preferably longer.
- Monitor 404s, crawl errors, indexing, rankings, traffic, and revenue daily immediately after cutover.

### Rollback

Document deployment rollback for code/config without creating conflicting canonicals or redirect loops. Coordinate rollback decisions with owner if indexing/crawl data has already changed. Do not deploy untested mass redirects.

## 11. Analytics, events, and reporting

Set up/verify GA4, Search Console, Merchant Center, optional Tag Manager, and performance monitoring with privacy-consistent consent and data handling.

Recommended standard ecommerce events: `view_item`, `select_item`, `add_to_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `search`.

Custom events: `vehicle_selected`, `compatibility_checked`, `compatibility_confirmed`, `part_number_searched`, `request_part_submitted`.

Avoid duplicate purchase events; send transaction ID and actual EGP value.

### Monthly KPI dashboard

- Non-brand organic clicks, impressions, CTR, and query clusters.
- Search performance by homepage/brand/model/product/guide template.
- Indexable vs indexed pages; crawl errors; schema validation errors.
- Organic product views, cart rate, checkout conversion, purchase revenue.
- Revenue by supported brand/model and product family.
- Ranking distribution for **validated** target keywords.
- Merchant Center approvals/disapprovals and product impressions where available.
- Core Web Vitals by device and template.
- AI citations/mentions from repeatable manual or automated monitoring.

Do not invent historical metrics. Establish baseline and targets after access to real data.

## 12. Admin SEO automation

Create an SEO health section in the existing Super Admin, or a non-invasive report if the UI change is too risky.

### 12.1 Suggested features

- Page-level title/description preview and editable overrides.
- SEO health score and missing fields (not a proxy for Google ranking).
- Missing/duplicate titles, descriptions, canonicals, and image checks.
- Product MPN/OEM consistency warnings.
- Missing fitment evidence alerts.
- Broken internal links, orphan eligible products, invalid schema, sitemap exclusion reasons.
- Canonical/indexability status, last content update, and page type.
- Batch report/export and prioritized remediation queue.

### 12.2 Auto-generated metadata

Generate **suggestions** from actual product records, with manual override and validation. Never fill missing specifications with guesses. Updates should invalidate relevant page caches and refresh sitemap/feed data when material.

### 12.3 Future extensibility

New models may be added months later through the existing admin/database workflow. When the owner explicitly adds supported vehicles, eligible pages and links should appear automatically based on published records. **Do not pre-create future model pages now.**

## 13. Quality assurance and automated tests

Add unit/integration/e2e tests for:

1. Correct canonical on each locale/template.
2. Reciprocal hreflang with real translated pairs; no nonexistent translations.
3. Unique title/H1 and nonempty meaningful initial HTML.
4. Unsupported model/year returns correct 404/noindex behavior.
5. Search/filter/cart/checkout/account excluded as appropriate.
6. Multi-fitment product has exactly one canonical product URL.
7. Unknown compatibility never renders as confirmed.
8. Price/availability consistency across UI, JSON-LD, feed.
9. Product schema omits unknown GTIN/MPN/reviews.
10. Sitemaps contain only canonical eligible pages, no duplicates.
11. Pagination exposes crawlable product links.
12. Old-to-new redirect mapping, host normalization, and no loops.
13. Images load, fallback works, alt text is meaningful.
14. Mobile RTL/LTR layouts and responsive UI remain usable.
15. No regression in add-to-cart, checkout, payments, and vehicle selection.
16. Lighthouse/Core Web Vitals measurements captured for representative templates.

Provide commands to reproduce tests and record results in `/docs/seo-release-report.md`.

## 14. Implementation phases and execution order

### Phase 0 — Baseline and audit (before changes)

- Inspect repository, routes, DB, inventory, current deployment, and analytics.
- Export actual supported vehicle matrix and product data quality report.
- Capture SEO baseline and URL mapping.
- Deliver `/docs/seo-audit.md` and an implementation checklist.

### Phase 1 — Domain and technical foundations

- Prepare `mopc.store`, canonical host, redirects, sitemap, robots, metadata, hreflang, SSR, statuses, pagination.
- Validate preflight, then migrate in a controlled cutover.

### Phase 2 — Product and vehicle SEO

- Implement reusable brand/model/product templates.
- Improve product titles/descriptions and part-number normalization.
- Render verified fitment, breadcrumbs, crawlable links, JSON-LD, images.
- Fix duplicate/thin/empty pages and indexability rules.

### Phase 3 — Merchant discovery and analytics

- Set up eligible product feed, reconcile price/stock, validate Merchant Center.
- Add GA4 ecommerce and compatibility events, reporting.

### Phase 4 — Content and AI discovery

- Research real Egyptian SERPs and keywords for current supported cars.
- Build high-value verified guides and editorial workflows.
- Audit desired crawler access, set up AI prompt visibility monitoring.

### Phase 5 — Automation and optimization

- Add admin SEO health tooling, CI checks, automated link/sitemap/feed refresh.
- Improve mobile Core Web Vitals and conversion friction.
- Review Search Console results monthly and iterate.

## 15. Suggested 90-day operational cadence

| Weeks | Focus | Output |
|---|---|---|
| 1–2 | Audit, scope verification, baseline, migration mapping | Audits, vehicle matrix, priority issues |
| 3–4 | Technical fixes and domain cutover after QA | Production SEO infrastructure |
| 5–6 | Brand/model templates and top-priority products | Strong commercial landing pages |
| 7–8 | Remaining high-value product cleanup, Merchant feed | Better catalog search coverage |
| 9–10 | Verified guides and internal linking | Model/part authority clusters |
| 11–12 | Admin automation, speed, conversion | Sustainable SEO operations |
| 13 | KPI review and next-quarter backlog | Evidence-based iteration |

This is a suggested schedule, not a promise. Dependencies and data quality may change sequencing.

## 16. Implementation decisions and escalation

The AI agent should proceed independently with safe, reversible code changes, but **request owner approval before**:

- Switching production domain or changing DNS.
- Executing destructive database migrations or deleting products.
- Replacing existing URL patterns with large-scale redirects.
- Enabling paid services or spending money.
- Changing payment, checkout, warranty, shipping, or returns policies.
- Publishing unverified technical claims or newly inferred compatibility.
- Enabling training crawlers if owner preferences are unknown.

If credentials are unavailable, implement the integration scaffold, provide precise setup steps, and report blocked external actions. Never claim Merchant Center, Search Console, or analytics accounts are connected unless actually verified.

## 17. Final handoff format (mandatory)

At the end, provide:

1. **Audit findings:** verified live facts and remaining uncertainties.
2. **Changed files and database migrations:** concise path-by-path summary.
3. **Implemented features:** mapped to phases and acceptance criteria.
4. **Test results:** commands, pass/fail, representative URLs, schema validation, performance benchmarks.
5. **Deployment/migration status:** which changes are live versus pending approval.
6. **External setup checklist:** DNS, Search Console, Merchant Center, GA4, feeds.
7. **Content/keyword backlog:** only actual supported vehicles and verified product families.
8. **Known issues and next priorities:** ranked by expected commercial impact.

## 18. Reference documentation

Use current official documentation during implementation, especially where requirements change:

- Google Search Central ecommerce: https://developers.google.com/search/docs/specialty/ecommerce
- Product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Google merchant listings: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google URL structure: https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites
- Google site migration: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Google AI search guidance: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search Console: https://search.google.com/search-console/
- Google Merchant Center: https://merchants.google.com/
- OpenAI crawler documentation: https://platform.openai.com/docs/bots
- Schema.org: https://schema.org/

---

## Final instruction to the AI coding agent

**Begin by inspecting the existing repository and current production vehicle/product records. Do not assume sample vehicle lists are complete or correct. Create a short audit and concrete implementation checklist, then implement the phases in order, validating each stage. The store's current supported cars are final for this release; do not add other vehicles. Preserve working commerce features. Favor truthful, useful, crawlable pages over keyword stuffing or mass page generation. Finish with a tested production-ready implementation and an honest handoff report.**
