# MOPC — Egypt SEO + AI Search / AIO Competitive Study & 90-Day Execution Roadmap
**Date:** 26 November 2026  
**Store:** https://mopc.store  
**Status:** Research and implementation plan only; no Search Console, Merchant Center, or AI-platform account data has been accessed. Do not confuse sample search-result visibility with verified first-page rankings, search volumes, market share, or proven AI citations.

## 1. Executive assessment

MOPC already has a substantive technical SEO base: bilingual server-rendered URLs, canonicals/hreflang, segmented XML sitemaps, structured Product/Breadcrumb data, real product links, SEO health checks, buying guides, policy pages, admin report, and a guarded merchant feed. The highest-impact next step is **not** boilerplate SEO metadata; it is (a) maintaining eligibility of model-only applications without years, (b) strengthening data quality and sellable catalog coverage, (c) producing useful search-specific landing pages, (d) connecting measurement and product feeds, and (e) editorial content grounded in actual Egyptian inventory.

**Positioning opportunity:** become the easiest place in Egypt to verify *which* spare part fits *which* make/model (with year/engine only when actually necessary), read the real manufacturer part number and price in EGP, and complete a reliable order or inquiry. Do not mirror competitors' unverified stock, warranty, claims, fitments or exact copy.

## 2. Sources, method and limitations

**Sources reviewed:** current GitHub main code in `nineappsonline-hash/Mansokar` (SEO policy, inventory, sitemap, products, Merchant feed, canonical/domain, model-only applications), archived read-only production audit dated 11 Nov 2026, archived catalog baseline dated 9 Nov 2026, and a keyword-based public-web result sample on 26 Nov 2026. Google Search Central official 2026 AI Search and Ecommerce guidelines were consulted.

**Competitor sample queries:** `قطع غيار سيارات اون لاين مصر`, `قطع غيار اوبل استرا J مصر`, `قطع غيار MG HS مصر`, `قطع غيار أصلية أوبل`, `قطع غيار سيارات اسعار مصر`. Search-provider results are personalized/time-sensitive and are **not** reproducible rank-tracking output. No logged-in Egyptian Google SERP screenshot series, Search Console, Similarweb, Ahrefs/Semrush historical data, Google AI Mode outputs, ChatGPT answer citations or conversion statistics were available. A direct HTTP public web fetch of mopc.store failed in the research interface; rely on archived run plus current source code, not on an invented live crawl.

**Historical MOPC baseline as of 9–11 Nov (not current live inventory):**
- 5 brands, 20 models, 430 products, 424 published, 350 with images, 174 lacking usable English translation, no verified stock quantities, no exact engine-configuration fitments.
- Nov 11 audit: 658 localized product sitemap URLs, 26 vehicle URLs, 8 guide URLs, 20 other URLs, 27 sampled live routes without identified crawl issues; public indexability enabled at the time.
- There have been subsequent product imports and compatibility/code changes. Re-run counts before deriving a new baseline.

## 3. Visible competitor strategies — sampled results, not a ranking league table

| Competitor | Observed search/result pattern | What appears effective | Adaptation for MOPC |
|---|---|---|---|
| AutoSpare — https://autospare.com.eg | Brand/model, origin and part-type paths; Opel Astra J, MG HS, original/Chinese variants; product counts and price/delivery details | Large crawlable inventory taxonomy with specific long-tail model/part combinations | Build *curated* make→model→category and original/aftermarket hubs only when eligible listings and factual descriptions exist. |
| DalelAuto — https://dalelauto.com | Dedicated Opel and Astra hub, generation split, individual products | Clear model and generation mapping, content in conversational Egyptian Arabic | Create verified generation/part-number guides and model pages; do not infer model years from competitors. |
| XMEGA — https://xmegacorner.com | MG HS and MG make pages, category breakdown, visible product counts, availability/prices | High-intent model-category navigation | Target MG HS/ZS/5 when actual stock exists; yearless models are valid model-level compatibility, not hidden pages. |
| Tawfiqia — https://tawfiqia.com | Broad shop/catalog with large visible item count, model/engine selection, manufacturer filter, policy and article links | Category breadth, car-selection usability, trust/support information | Copy the *information architecture*, not their scale. Improve parts/vehicle/filter UX and verified fulfillment facts. |
| SAK — https://sakspareparts.com | Make/category navigation, visible warranty/shipping messages and search box | Convenience, familiarity, clear service proposition | Put real, current shipping, payment, returns and guarantee claims near the buy action; avoid unverifiable promises. |
| Oil Masr — https://oilmasr.com | Model-specific collections, extensive product range | Transactional long-tail pages and broad catalog | Publish high-value combinations based on inventory, not empty permutations. |
| Zait and Filters — https://zaitandfilters.com | Pages for Opel Astra J and MG HS, make/category links, Egyptian EGP pricing | A readily crawlable car/model/category hierarchy | Differentiate MOPC through authentic identifiers, accurate engine-level notes, and product availability, not duplicate text. |
| MG Egypt official — https://www.mgmotor.com.eg | Manufacturer spare-part catalog model/part lookup | Authoritative identifiers and model distinctions | Use official parts material as a **verification input**, cite when applicable, never claim dealership status. |

**Observed recurring formula:** indexable make & model hub + actual product count + buying-intent title + links to categories & product details + price/availability + delivery/return trust signals + FAQs. The differences matter more than formula replication: genuine fitment evidence, original images, authenticated stock, and trustworthy comparisons.

**AI answer visibility:** The web sample does not establish that any competitor is consistently cited in AI Overviews, AI Mode, ChatGPT, or Perplexity. Create an independently logged AIO citation panel, never invent a top-10 leaderboard.

## 4. MOPC source-level audit: strengths, risks, exact implementation

| Severity | Finding | Code/evidence | Required fix and acceptance criteria |
|---|---|---|---|
| P0 | Yearless **model-only** applications are ignored by sitemap modelCounts | `src/lib/seo-pages.ts` checks `a.model_id === m.id && a.years.length` | Count applications by model ID even with empty year arrays; test that a published MG HS-only SKU makes its useful model hub eligible, while truly empty models stay noindex. |
| P0 | Database-backed catalog filter may not recognize model-only products; frontend matching was partly updated | `src/app/[locale]/[[...path]]/page.tsx`, `searchCatalog`, catalog SQL/RPC | Inspect SQL and search call. Add exact model-only matching for selected model and optional year; test with real database queries and yearless product, including pagination/count. |
| P0 | Actual product availability is historically unknown, blocking feed eligibility | `src/lib/seo-policy.ts`, `merchant-feed.ts`; 9 Nov inventory | Ingest verified stock/availability; validate prices, visible page vs feed vs checkout; never set all products to InStock blindly. |
| P0 | Merchant product feed exists but is not necessarily submitted/approved | `src/app/api/merchant-feed/route.ts`, `src/lib/merchant-feed.ts` | Confirm Egypt/account eligibility, feed access/auth requirements, Merchant Center diagnostics; only eligible published items. |
| P0 | Search ownership/AI metrics not verified | Archived 11 Nov audit | Validate GSC property, DNS, sitemap processing, indexing and AI Search visibility report; log country=Egypt and mobile/desktop. |
| P1 | Yearless model-only products may show weak copy or missing model metadata | `public-product.ts`, `product-card-vehicles.ts`, `product-seo.ts` | Make yearless model clearly say compatible with model (no year asserted), distinguish model-wide from engine-verified; maintain no fake years. |
| P1 | Historical English translation and images incomplete | 9 Nov baseline | Refresh missing-field data; prioritize SEO-active products first; add truthful images, bilingual descriptions and alt text. |
| P1 | Existing hub content often generic | archived titles/descriptions and `model-search-content` | Unique intro, model/category links, actual counts, verified differences, helpful buying FAQ and clear fitment limitations. |
| P1 | No indexed model × part-category landing-page system in main sitemap | `seo-inventory.ts` | Add curated routes only with enough eligible products and distinct useful content. Suppress empty and thin pages. |
| P1 | Price fraction rule excludes some offers while public displays rounded price | `merchantPriceReady` | Reconcile and approve precision policy business-side; don't modify actual prices just for schema eligibility. |
| P1 | Sitemap review after imports needed | `seo-inventory.ts`; 11 Nov baseline stale | Crawl all sitemap URLs for 200, canonical, locale, index eligibility, image, title, duplicates, product status. |
| P2 | Broken/absent original images and generic alt reduce trust | archive audit | Repair real product media and image pipeline; do not generate deceptive package/product photos. |
| P2 | Organization signals / editorial responsibility | Existing Organization/schema, guides, policy pages | Add factual contact/about, warranties, update and reviewer details, cited sources and real service-area information. |

**Specific regression tests for model-only:**
1. MG HS saved with no model-year rows; a published product has `car_years:<model-id> = ""` and is displayed on `/ar/brands/mg/hs`.
2. Search `make=mg&model=hs` returns it, even when optional year is provided; a product mapped to a different model does not match.
3. Sitemap includes populated MG HS model, excludes truly empty models; yearless product has correct canonical and Product schema.
4. Excel export → import preview → commit → export retains yearless model association with no invented year.

## 5. Core keyword architecture (hypotheses to validate in GSC/Keyword Planner)

**High-purchase-intent (P0):**
- `قطع غيار اوبل استرا J`, `قطع غيار اوبل انسيجنيا`, `قطع غيار شيفروليه كروز`, `قطع غيار شيفروليه كابتيفا`, `قطع غيار MG HS`, `قطع غيار MG ZS`, `قطع غيار بيجو 3008`, `قطع غيار سيتروين C3`.
- `سعر [اسم القطعة] [الماركة] [الموديل]`, `[رقم القطعة]`, `[manufacturer] [MPN]`.
- `تيل فرامل امامي ام جي hs`, `فلتر زيت استرا j`, `طلمبة مياه كابتيفا` **only where those real items exist**.

**Research / AIO-answer intent (P1):**
- `ازاي اعرف رقم قطعة الغيار`, `هل [MPN] يركب على [model]`, `الفرق بين OEM والأصلي والبديل`, `قطعة غيار [model] من غير سنة تصنيع`, `أعرف ازاي تيل الفرامل مناسب لعربيتي`.
- `بلد صنع [brand] قطع الغيار`, `اختيار تيل أمامي ولا خلفي`, `سياسة استرجاع قطع الغيار`.

**Brand trust / local logistics (P1):**
- `موبك قطع غيار`, `MOPC spare parts Egypt`, and real Egyptian service-area delivery intents supported by shipping policies (not fabricated city doorway pages).

**Keyword rules:** each query cluster has one canonical target URL; Arabic spelling variants map to one page; English equivalent is a real translated page; never produce thousands of near-duplicate `model + year + city` templates.

## 6. Target information architecture

- `/ar`, `/en`: value proposition, actual served makes, original/aftermarket distinction, real policies.
- `/ar/brands/{make}`: full make hub.
- `/ar/brands/{make}/{model}`: core model hub; year optional.
- **Proposed:** `/ar/brands/{make}/{model}/parts/{category}` for curated high-intent inventory-backed combinations; only index if sufficient useful content and 3+ actual eligible relevant SKUs **as an initial editorial threshold**, adjustable.
- `/ar/categories/{category}`: cross-model hub for genuinely useful categories.
- `/ar/products/{stable-slug}`: one URL per SKU; no duplicate URLs per vehicle.
- `/ar/guides/{slug}`: diagnosis/selection/compatibility content reviewed by a parts specialist.
- `/ar/faq`, contact, shipping, returns, warranty.
- **Do not index:** faceted parameter permutations, zero-stock/empty model landing pages, private pages, carts, payment, user-specific information; evaluate crawl policy to allow crawlers to read noindex where required.

## 7. Page templates — unique user value

**Model page requirements:** H1 "قطع غيار [make] [model] في مصر"; real inventory counts and price-based filters; model identity without fabricated year; show "الموديل بدون تحديد سنة" where appropriate; real part-type navigation; 3–5 useful questions; linked product/MPN references; descriptive locale-specific meta; BreadcrumbList; updated date only when actual editorial data changed.

**Model-category page:** H1 "تيل فرامل [model] في مصر"; real front vs rear positions, manufacturer comparisons only with verified specs, actual product cards/prices, purchase guidance and caution that model-level association is not proof of exact engine or trim compatibility.

**Product page:** real product name, genuine item brand distinct from car make, prominent part number/MPN, EGP public and offer price consistency, supplied product photo, actual stock and delivery details, condition, original/aftermarket, country, warranty evidence, compatibility table:
- model-level fitment where no years are registered;
- explicit year range where verified;
- engine/trim only with real source evidence;
- a clear "راجع رقم القطعة/التجهيز قبل الشراء" disclaimer for ambiguous coverage.
JSON-LD Product/Offer/Breadcrumb must exactly match the visible facts. No invented reviews or GTIN.

**Editorial pages:** answer the question in plain Egyptian Arabic, then show evidence and a small comparison table, identity of source/reviewer/date, and internal links to verified products; create English only as a human-reviewed genuine translation.

## 8. AIO / generative discovery strategy

Google documentation confirms **no AI-only schema or llms.txt requirement**: crawlable, indexable, relevant people-first pages and precise machine-readable product info are the basics. For AI answers, usefulness and attribution increase when pages answer actual selection questions with verifiable, distinctive data.

Build a structured question-answer library from real catalog and customer support requests, e.g.:
- هل MG HS لازم سنة تصنيع عشان أختار القطعة؟ — explain yearless model mapping and need for MPN/engine check.
- إزاي أتأكد إن طلمبة مياه [model] تركب؟
- الأصلي وOEM وAftermarket: الفرق في بلد التصنيع والضمان؟
- رقم القطعة [MPN] يخص أي موديلات؟ — only sourced matches.
- أسعار تيل [model] كام؟ — current actual products, not stale generic ranges.

Add real citations to official supplier/manual references where used. Keep timestamps factual. Track model and MPN synonyms and code names. Third-party mentions should be earned via authentic supplier/dealer directories, satisfied-customer reviews, partnerships or helpful repair guides, not paid fake recommendations. Don't add invented awards/reviews or wholesale AI text.

**AIO measurement protocol:** fixed 40–60 Egyptian Arabic prompts + English variants, test monthly with recorded country, device, signed-out state, tool/mode (Google AI Overviews, AI Mode, ChatGPT Search, Perplexity, Copilot/Bing when accessible), prompt, date, referenced URLs, competitor domains, MOPC citation yes/no, factual accuracy and referral source. A citation-share score is directional, not an official ranking. Use Search Console's available generative-AI insights where connected and available; distinguish AI exposure from organic Google clicks.

## 9. 90-day phased roadmap (prioritized)

### Phase 0 — Week 1: Reliability and owned-data baseline
**Deliverables:** refresh inventory, Search Console/AI Search controls and Bing verification, recent GSC export, robots, sitemap, all public response status/redirects, user-agent fetches, canonical/hreflang, noindex, logs and Core Web Vitals. Fix the yearless-model sitemap bug, DB filtering of model-only fitments and export/import round-trip regression. Verify current active Production release and ensure main branch tests pass.
**Pass:** no yearless-match false negatives, correct model indexing, 0 invalid important sitemap URLs, protected URLs not indexed, baseline KPIs captured. Owner: engineering + SEO.

### Phase 1 — Weeks 2–3: Product data and Google merchant readiness
**Deliverables:** audit every eligible product's Arabic/English name, price precision, MPN, images, actual availability/stock and condition, category, verified fitment, shipping and warranty. Fix high-value data gaps first, then Merchant Center feed and policy/eligibility review. Validate with Google Rich Results Test and Search Console merchant diagnostics.
**Pass:** 95%+ of priority sellable SKUs have verified image/MPN/price/stock or explicitly documented exclusions; no contradictory stock or price; Merchant feed disapprovals investigated. Owner: catalog/operations + engineering.

### Phase 2 — Weeks 3–6: Winning transactional page clusters
**Deliverables:** prioritize 8 model hubs by actual product count, demand and orders (not guesses); add 12–20 curated model×category landing pages where inventory justifies them; unique title/meta, internal links, models/categories breadcrumbs, H1, useful FAQ, canonical/hreflang. Make relevant items discoverable without selecting a car first. 
**Pass:** every launched URL has distinct search intent and verifiable items; no mass thin pages, accurate rendering and sitemap, no duplicate conflicting canonical. Owner: SEO content + engineering.

### Phase 3 — Weeks 5–9: AIO and specialist authority
**Deliverables:** 12–16 high-value Arabic guides sourced/reviewed by an identifiable parts specialist, model-specific compatibility explainers, high-demand MPN lookup, comparative OEM vs aftermarket guide, fitment exception glossary. Videos/real product photos where feasible. Link guides↔models↔products↔policies.
**Pass:** factual review and source notes for all technical fitment claims, no unsupported "all years" as engine-level guarantee, monitored AI citation panel established. Owner: editorial + parts specialist.

### Phase 4 — Weeks 7–12: Digital PR, links, CRO, iteration
**Deliverables:** genuine partner/vendor pages and useful mentions; update Google Business Profile only if physical eligibility is real, improve product photography, mobile filters/checkout speed, shipping clarity and click-to-inquiry. Fix pages with many impressions but weak CTR, pages stuck at positions 5–20 and good-fit inquiries that fail conversion.
**Pass:** monthly dashboard shows GSC Egypt click/impression/CTR, eligible indexing, average rank by *fixed query set*, product rich-result status, organic inquiries and verified orders, nonbrand revenue, AI citation sample and Core Web Vitals. Owner: growth + engineering + operations.

## 10. Measurement/KPIs and decision rules

| Metric | Baseline | 30-day task | 90-day aspiration (not promise) |
|---|---|---|---|
| Google organic indexed eligible pages | Retrieve GSC, not guessed | fix sitemap/noindex; record all indexed URLs | trending upward among useful live pages |
| Nonbrand Egypt impressions/clicks | Retrieve GSC | track top 30 query clusters | positive growth with qualified purchases |
| AI answer citation share on fixed prompt set | not measured | create prompt panel and first observations | repeatable month-to-month visibility comparison |
| Eligible merchant feed items / disapprovals | unknown | verify all real stock/status | minimize correctable feed errors |
| Product metadata/photography completeness | archived baseline stale | update priority catalog data | 95%+ for focus group |
| Mobile CWV p75 (LCP/INP/CLS) | not validated currently | field baseline from GSC/CrUX where available | LCP<=2.5s, INP<=200ms, CLS<=0.1 |
| Organic inquiries + verified paid orders | requires consent analytics/account integration | instrument correct funnel events | evidence-backed uplift, not fabricated % |

**Prioritization scoring:** 30% verified inventory/fitment depth + 25% Egypt demand (GSC/Keyword Planner) + 20% expected contribution margin/order + 15% supply/availability + 10% competition feasibility. Mark all unsourced inputs "unknown".

**Weekly review:** indexing anomalies, errors and schema; top 10 pages, conversion gaps; actual product availability. **Monthly:** keywords, competitor SERP sample, AI prompt panel, refreshed model-hub opportunities. Do not mistake ranking changes caused by query-location/personalization for actual site growth.

## 11. Specific development backlog and acceptance tests

1. `seo-pages.ts`: change modelCounts condition to permit model-only applications, add tests for empty years and zero-product models.
2. DB search/rank RPC and frontend filters: ensure model-only items match model and optional year where advertised; add integration tests; verify search count pagination.
3. `item-workbook.ts`/import preview/commit/export: encode and show model-only references, don't fabricate years, preserve across round trips.
4. `seo-inventory.ts`: add curated model-category route registry, sitemap gates based on exact eligible inventory and translation quality; reject thin pages.
5. Model-category route SSR + metadata + breadcrumb; internal navigation from model/category/home hubs and product context.
6. `product-seo.ts` + merchant: exact visible/fed price/status, proper image and identifiers, shipping/returns only with facts, unambiguous item-brand vs car make.
7. Admin SEO console: prioritized missing fields and model-yearless flags; downloadable CSV task queue and GSC comparison (only after connection).
8. Mobile and accessibility: SSR content visible without hydration; LCP, INP, CLS, readable model/filter controls, alt and keyboard support.
9. Validate robots: ordinary Googlebot and relevant search-bot accessibility; check protections, site maps and launch gate; don't change training policy incidentally.
10. Regression: no fabricated product/vehicle attributes, no leakage of cost or user data, no indexed checkout/admin URLs; staging tests before Production.

## 12. Competitor and Google sources

- https://autospare.com.eg/brands/اوبل
- https://autospare.com.eg/brands/ام-جي/hs
- https://dalelauto.com/opel/astra
- https://xmegacorner.com/spare-parts/brand/mg/mg-hs
- https://tawfiqia.com/ar/shop
- https://sakspareparts.com/
- https://zaitandfilters.com/cars/mg/models/hs
- https://www.mgmotor.com.eg/spareparts-catalog/?lang=ar
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/specialty/ecommerce/
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://blog.google/products-and-platforms/products/search/new-controls-website-owners/
- Existing project records: `docs/seo/EGYPT_SEO_AEO_PLAN.md`, `docs/seo-audit-2026-11-11.md`, `docs/seo/catalog-baseline.json`, `docs/seo/live-audit.json`.

## 13. What must not be claimed at this stage

No proven top-1/page-1 position, no verified competitor total traffic or domain authority, no competitor AI citation market share, no current complete crawl of the live MOPC domain by this report, no verified Merchant Center approval, and no GSC indexing/traffic metrics. The 2026 competitor sample supports information architecture hypotheses, not causal ranking conclusions. Re-run public live SEO verification and read external owned dashboards before replacing any "unknown" baseline with a number.
