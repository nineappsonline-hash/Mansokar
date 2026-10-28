# Mansokar: Egypt SEO and AEO execution plan

Prepared 28 October 2026. Scope: Egyptian automotive spare-parts shoppers; Arabic first, English supported. Covers 5 brands and 16 model families. This is a planning deliverable, not a production deployment.

## 1. Commercial objective and positioning

Win qualified searches that lead to correct-fit purchases and useful parts inquiries. Position Mansokar around **clear EGP prices, verified compatibility, identifiable item brands, and country of manufacture**. Country of origin must describe the actual item, not the nationality of the vehicle or brand. Claims about original parts, warranty, stock, delivery or authorization require merchant evidence.

Suggested Arabic positioning: «قطع غيار سيارتك بالسعر الواضح والتوافق الصحيح». Confirm the final public store name: the repository currently mixes Mansokar with the temporary DriveParts identity. Use one consistent name in page titles, contact details, profiles and schema.

Do not choose model priority from assumed popularity. Start with catalog depth and actual stock, supplier reliability, contribution per order and inquiry demand. Validate demand using Egypt-targeted keyword research and Search Console once available. Search examples below are keyword hypotheses, not volume estimates or promised rankings.

## 2. Evidence and limits

Repository review: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/layout.tsx`, `src/app/[locale]/[[...path]]/page.tsx`, and `src/lib/catalog.ts`.

Existing strengths: Arabic/English routes; language and direction attributes; canonical and language alternates; sitemap generation; product and breadcrumb JSON-LD; index controls for demo/private pages; brand/model routes; editable product SEO fields.

Observed gaps and tasks:

| Priority | Finding                                                                                                                   | Action and acceptance test                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Indexing depends on configuration and `STORE_LAUNCH_APPROVED=true`                                                        | Before launch, verify intended public pages return 200 and indexable robots metadata. Keep demo, account and transaction pages excluded. Do not remove the launch gate before merchant approval.                                                                                       |
| P0       | Default brand list has Opel, MG, Peugeot and Citroën; Chevrolet is absent; model defaults do not match the requested list | Add Chevrolet throughout brand data, navigation and vehicle configuration workflows. Reconcile all 16 models with real production data; confirm each model route resolves and lists only verified-fit products.                                                                        |
| P0       | Product JSON-LD is minimal: name, SKU, manufacturer, description and offer price/URL                                      | Add actual product images, item brand, identifiers and truthful availability. Test representative products using Google's Rich Results Test and URL Inspection.                                                                                                                        |
| P0       | Production origin falls back to localhost                                                                                 | Configure the final HTTPS domain, redirects, metadata base, robots sitemap URL and absolute schema URLs. Confirm no localhost references in production output.                                                                                                                         |
| P1       | Parameterized pages are noindex and catalog query URLs are also robots-disallowed                                         | Design filter policy deliberately. Robots blocking prevents crawlers reading noindex. Ensure products have crawlable links independent of filters. Use crawl-accessible noindex where removal from index is needed; use disallow for crawl management after evaluating indexing state. |
| P1       | Sitemap contains public catalog/CMS URLs but does not itself check launch approval                                        | Reconcile sitemap inclusion with canonical/indexability rules, including draft/demo exclusions and bilingual completeness. Add guide hub and other approved useful hubs if absent.                                                                                                     |
| P1       | Brand/model metadata uses a basic generic template                                                                        | Write unique Arabic and English titles and introductions emphasizing model identity, EGP pricing and compatibility, with accurate inventory.                                                                                                                                           |
| P1       | No live performance or search baseline was supplied                                                                       | Verify the live domain, Search Console, analytics, robots, status codes, rendering and mobile performance before treating this as a live-site audit.                                                                                                                                   |

External research sampled Egyptian Arabic queries. AutoSpare exposes brand/model navigation, while the official MG Egypt catalog organizes parts by model/year and part number. These support a model-and-identifier-led approach, but do not establish market shares or search volumes. Competitor model dates are not fitment evidence. [AutoSpare Opel](https://autospare.com.eg/brands/اوبل), [MG Egypt catalog](https://www.mgmotor.com.eg/spareparts-catalog/?lang=ar).

## 3. Brand/model keyword map

Use the following canonical slugs under `/ar/brands/{brand}/{model}` and equivalent `/en/` routes. Existing deployed slugs take precedence; redirect changed URLs rather than creating duplicates. Treat Arabic variants as synonyms on one page, not separate landing pages.

| Brand / model     | Proposed model slug | Primary Arabic target     | Secondary variants and content angle                                   |
| ----------------- | ------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Opel Insignia     | insignia            | قطع غيار أوبل انسيجنيا    | اوبل انسجنيا، Opel Insignia parts Egypt; distinguish generation/engine |
| Opel Astra        | astra               | قطع غيار أوبل استرا       | أسترا، Astra J، Astra K; separate verified generations                 |
| Opel Grandland    | grandland           | قطع غيار أوبل جراند لاند  | جراندلاند، Grandland X; verify generation and engine                   |
| Opel Crossland    | crossland           | قطع غيار أوبل كروس لاند   | كروسلاند، Crossland X; service and brake parts                         |
| MG 5              | 5                   | قطع غيار ام جي 5          | إم جي 5، MG5، MG 5; filters, brakes, service parts                     |
| MG 6              | 6                   | قطع غيار ام جي 6          | إم جي 6، MG6، MG 6; engine/version verification                        |
| MG HS             | hs                  | قطع غيار MG HS            | ام جي اتش اس، إم جي HS; avoid mixing generations                       |
| MG RX5            | rx5                 | قطع غيار MG RX5           | ام جي RX5، RX 5; verify generation/engine                              |
| MG ZS             | zs                  | قطع غيار MG ZS            | ام جي زد اس، إم جي ZS; exact engine/version                            |
| Chevrolet Cruze   | cruze               | قطع غيار شيفروليه كروز    | شيفرولية كروز، Chevrolet Cruze parts Egypt                             |
| Chevrolet Malibu  | malibu              | قطع غيار شيفروليه ماليبو  | شيفرولية ماليبو، Malibu; year/engine fitment                           |
| Chevrolet Captiva | captiva             | قطع غيار شيفروليه كابتيفا | كابتيفـا، Captiva; distinguish generations                             |
| Peugeot 2008      | 2008                | قطع غيار بيجو 2008        | Peugeot 2008 parts Egypt; model number is not a model year             |
| Peugeot 3008      | 3008                | قطع غيار بيجو 3008        | Peugeot 3008 parts Egypt; generation/engine first                      |
| Citroën C3        | c3                  | قطع غيار سيتروين C3       | ستروين سي 3، Citroen C3; distinguish C3 from C3 Aircross               |
| Citroën C5        | c5                  | قطع غيار سيتروين C5       | ستروين سي 5، Citroen C5; distinguish C5 from C5 Aircross               |

C3/C5 Aircross coverage is a catalog decision: do not silently treat them as identical to C3/C5. If stocked, add distinct model pages and verified configurations. Public competitor navigation also separates these names. [AutoSpare Citroën](https://autospare.com.eg/brands/سيتروين).

For every model, research these intent groups:

- Buy: `قطع غيار [الموديل]`, `شراء [القطعة] [الموديل]`, `[model] spare parts Egypt`.
- Price: `سعر تيل فرامل [الموديل]`, `أسعار فلاتر [الموديل]`, `سعر [رقم القطعة]`. Answer using actual current stock/prices.
- Fitment: `[القطعة] [الموديل] [السنة] [المحرك]`, `هل [رقم القطعة] يركب على [الموديل]؟`.
- Brand/identity: `[اسم مصنع القطعة] [رقم القطعة]`, `أصلي ولا بديل [الموديل]`, `بلد صنع [القطعة]`.
- Problem/research: `أسباب صوت الفرامل [الموديل]`, `إزاي أعرف رقم القطعة؟`. Explain verification and diagnosis limits rather than prescribe replacements from symptoms alone.
- Local: `قطع غيار [الموديل] القاهرة / الجيزة / الإسكندرية` only where genuine delivery/service information supports the page.

Build a research sheet with query, Egypt monthly volume from the selected tool, intent, existing URL, planned URL, stock depth, margin band, difficulty estimate, source/date, owner and priority. Keep unknown metrics blank. Search Console country/device/query data should later refine the shortlist.

Suggested scoring: 30% stock/fitment completeness, 25% qualified demand, 20% contribution, 15% supplier reliability, 10% competitive feasibility. These weights are planning assumptions; review after the first month.

## 4. Site architecture and index rules

Hierarchy: home → 5 brand hubs → 16 model hubs → selected model/category pages → product pages. Global category hubs and guides connect across this structure.

Examples:

- Existing pattern: `/ar/brands/opel/astra`.
- Proposed new landing-page pattern: `/ar/brands/opel/astra/brakes`.
- Product pattern: `/ar/products/{stable-product-slug}`.
- Guide pattern: `/ar/guides/{topic-slug}`.

The model/category routes are proposed development work, not existing functionality. Publish them selectively where there are multiple useful products, distinct intent and helpful fitment content. Do not generate every combination of model, year, engine, city and category. Keep each sellable SKU at one canonical product URL even when it fits multiple cars.

Index real, useful brand/model/category/product/guide pages. Keep empty filter combinations, internal searches, comparison/session URLs and private pages out of the index. For temporarily unavailable products, retain a useful 200 page with truthful availability and alternatives; permanently removed pages need a relevant replacement redirect or appropriate 404/410. Avoid redirecting every missing item to home.

Each Arabic/English page should have its own self canonical and reciprocal language alternates. Do not canonicalize English to Arabic. Only advertise translations that exist. Use an accessible language switcher without forcing redirects by IP or browser language.

Important products must be reachable via ordinary HTML links without using a search box or choosing a garage vehicle. Crawlable hierarchy supports discovery. [Google ecommerce navigation guidance](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure).

## 5. Page briefs and on-page SEO

**Home:** explain vehicle brands served, link all five hubs, show genuine trust information and useful paths to shop or request a part. Suggested Arabic title: `قطع غيار أوبل وMG وشيفروليه وبيجو وسيتروين في مصر | Mansokar`. Use the final store name and avoid duplicating the suffix in the application title template.

**Brand hub:** model navigation, actual categories, item-brand clarification, buying/compatibility guidance, real delivery terms and 3–5 useful questions. No claim of official dealership without authorization.

**Model hub:** unique introduction, generation/year/engine selector, real stock, category links, visible compatibility explanation, relevant guide links and model-specific questions. Suggested title: `قطع غيار أوبل استرا في مصر وأسعارها | Mansokar`. Suggested description: `شوف قطع غيار أوبل استرا والأسعار بالجنيه المصري. اختار سنة الموديل والمحرك وراجع رقم القطعة للتأكد من التوافق قبل الطلب.` Do not promise inventory or service beyond actual capability.

**Model/category page:** e.g. `تيل وطنابير فرامل MG 5 في مصر`; separate front/rear positions, show actual product differences, links to exact fitment and related guides. Only publish when inventory supports it.

**Product page:** product name + actual item brand + part number + appropriate vehicle context; real images of item and label; EGP price; availability; country of manufacture; condition; position; dimensions/specification; verified compatible configurations; exclusions; shipping estimate and return/warranty links; request-fitment assistance. Use supplier data and editorial review. Never expose cost prices in page HTML, schema, feeds or analytics.

Distinguish vehicle make (Opel) from item brand (for example the manufacturer of the filter). Distinguish genuine, aftermarket and used/imported conditions with evidence. Never infer compatibility solely from similar names, shared corporate ownership or appearance. Verified part numbers and exact configuration mappings control fitment.

## 6. Product data and structured data

Excel import should support reliable source data: stable SKU; Arabic/English names; supplier item brand; part numbers; country of manufacture; cost kept private; public EGP prices; verified fitments; category; specifications; images and status where supported. Add missing workflow fields deliberately rather than inventing them during copywriting.

For product pages, implement `Product` with `name`, crawlable real `image`, `description`, `sku`, `brand`, verified `mpn`/`gtin` where available, and `Offer` with canonical URL, EGP price and accurate availability/condition. Do not invent GTINs. Show structured facts visibly on the page. Add shipping and return information only from actual merchant policy. Keep `BreadcrumbList`; add consistent `Organization` identity and genuine profile links. Use LocalBusiness only for an eligible real business presence.

The existing price output converts internal stored amounts to EGP; preserve numerical agreement between visible prices, Excel-facing prices, schema and any future feed. Test normal, discounted, out-of-stock and multi-fitment products. Google's merchant-listing requirements include product images, so the current minimal markup needs expansion. [Google merchant-listing documentation](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing).

Evaluate Merchant Center country, account, product and program eligibility during setup, rather than promise every shopping surface in Egypt. If eligible, submit a maintained feed with exact landing-page prices and availability; monitor disapprovals. Google describes both feeds and structured data as product-data channels. [Google product-data guidance](https://developers.google.com/search/docs/specialty/ecommerce/share-your-product-data-with-google).

## 7. AEO: content people and answer engines can use

AEO means making reliable answers easy to find, understand and attribute. It is not a guaranteed route to citations. Google's guidance says established SEO applies to AI features; no special AI schema or AI text file is required. Do not make `llms.txt` a launch dependency. [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

Use a repeatable answer block:

1. A real question as a heading.
2. A direct 40–80 word answer as an editorial guideline, not an algorithmic rule.
3. A table or checklist with model, generation, engine, identifier and verification status where relevant.
4. Named reviewer, source and real review date.
5. Links to exact products, model hub and relevant delivery/return policy.

Example question: **إزاي أتأكد إن تيل الفرامل مناسب لأوبل استرا؟**

Example answer: «اسم أسترا لوحده مش كفاية لتأكيد التوافق. حدّد سنة الصنع والجيل والمحرك، وراجع رقم القطعة ومكان التركيب: أمامي ولا خلفي. طابق البيانات مع جدول التوافق في صفحة المنتج. لو البيانات ناقصة، اطلب مراجعة رقم الشاسيه من فريق المتجر قبل الشراء.»

This answer describes a proposed assistance process; publish it only when the team can deliver that review. Collect VIN privately; never publish a customer's full VIN in a review, guide or example.

Create a reusable question library, then tailor answers by model:

- إزاي أعرف إن القطعة تركب على عربيتي؟
- الفرق بين الأصلي والبديل إيه؟
- سعر [القطعة] كام بالجنيه المصري؟
- بلد صنع القطعة إيه، وهل هي نفس بلد الماركة؟
- إيه الفرق بين القطعة الأمامية والخلفية؟
- هل نفس القطعة تركب على أكتر من موديل؟
- إيه البيانات المطلوبة لمراجعة رقم القطعة؟
- هل السعر شامل المصاريف المعروضة؟ وتكلفة الشحن لمنطقتي كام؟
- أعمل إيه لو القطعة طلعت غير مناسبة؟

Use current inventory for price answers rather than evergreen invented price ranges. Publish comparisons only with tested or sourced differences. For maintenance intervals, fluids and torque values, use the exact applicable manufacturer manual and technical reviewer; do not generalize across engines.

Readable FAQs are useful regardless of markup. Do not forecast FAQ rich results for this store: Google's documented FAQ rich-result availability focuses on authoritative government and health sites. [Google FAQ change guidance](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

Check crawler access and CDN/WAF behavior separately for search engines and selected answer services using their current published policies. Search retrieval and model-training permissions are separate business choices. Never expose private endpoints to enable discovery.

## 8. Initial editorial calendar

Arabic first; translate commercially important English pages with editorial review. Give every article one principal intent and a destination model/category page. The following are briefs, not preverified mechanical claims.

| Week | Main guide                                                      | Supporting deliverable                                    |
| ---- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | إزاي تعرف رقم قطعة الغيار وتتأكد من التوافق؟                    | Compatibility checklist, model hub template               |
| 2    | الفرق بين الأصلي والبديل وبلد المنشأ                            | Item-brand/origin glossary                                |
| 3    | دليل اختيار قطع فرامل أوبل استرا                                | Astra/Insignia questions and product links                |
| 4    | إزاي تختار فلاتر MG 5 وMG 6؟                                    | Separate compatibility tables, not shared-fit assumptions |
| 5    | جراند لاند وكروس لاند: إيه بيانات العربية المطلوبة لطلب القطعة؟ | Two model-specific answer blocks                          |
| 6    | إزاي تراجع أرقام قطع MG HS وRX5 وZS؟                            | Separate model sections and supported items               |
| 7    | شراء قطع غيار كروز: الجيل والمحرك ورقم القطعة                   | Cruze hub improvement                                     |
| 8    | طلب قطع ماليبو وكابتيفا: ليه السنة لوحدها مش كفاية؟             | Two separate model checklists                             |
| 9    | بيجو 2008 و3008: إزاي تحدد موديلك قبل شراء القطعة؟              | Model-number-versus-year explanation                      |
| 10   | الفرق بين C3 وC3 Aircross وبين C5 وC5 Aircross عند طلب القطع    | Distinct catalog entities where applicable                |
| 11   | قراءة بيانات علبة قطعة الغيار وبلد الصنع                        | Original label photography, identifier examples           |
| 12   | حساب تكلفة الطلب: سعر القطعة والشحن وشروط الاسترجاع             | Approved policies and live calculation links              |

Publish fewer stronger guides if technical review cannot keep pace. Improve real product data before increasing article volume. Refresh top pages monthly and whenever inventory, pricing, fitment or policy changes.

## 9. Local discovery, authority and trust

Create/maintain Google Business Profile only if the real operation meets eligibility requirements. Confirm address, customer access, hours, phone and business category. Do not invent branches or use fake addresses. Keep the same merchant identity across the site, profiles, invoices and legitimate directories.

Publish shipping coverage for actual Egyptian service areas, with realistic fees, cutoff times and delivery windows. Start with a useful delivery page; only build city pages when there is distinct operational value. Avoid cloned model-by-city pages.

Earn relevant links through real supplier stockist listings, verified workshop relationships, automotive editorial contributions and original compatibility resources. Offer owner communities genuinely useful answers subject to group rules; avoid purchased links, automated comments or fabricated testimonials. Request honest post-purchase reviews without scripting positive sentiment.

Add merchant-approved About, Contact, Shipping, Returns and Warranty pages. Show real business and reviewer information. Present supported payment methods accurately; do not advertise installments, wallets or card payments before they work.

## 10. Technical delivery checklist

- Confirm preferred HTTPS hostname and redirect all alternate forms once; audit root-to-Arabic redirect.
- Crawl production and staging separately; protect staging from indexing.
- Inspect server-rendered Arabic text, links, metadata, schema and product content with and without JavaScript.
- Confirm 404 behavior for unknown brands/models/products rather than soft 404s.
- Submit clean canonical-only XML sitemaps; use meaningful `lastmod` only when reliable modification timestamps exist.
- Review indexable pagination and product discovery without indexing unlimited sorts/filters.
- Check crawlable product-image URLs, descriptive alt text, image sizes and broken media.
- Measure mobile Core Web Vitals: target LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile. Use field data when available and lab tests for diagnosis. Optimize hero/image payload, layout stability, fonts and client JavaScript.
- Test Arabic RTL forms and selectors on common mobile widths and slower connections.
- Validate canonical, hreflang and schema on examples from every template and both languages after deployment.

## 11. Measurement and AEO evaluation

Baseline before publication: Search Console Egypt impressions/clicks/CTR by query/page/device; nonbrand versus brand searches; indexed eligible URLs; schema errors; organic inquiries, collected orders, net revenue and fitment-related returns.

Respect existing consent requirements. Track valid funnel steps: product view, vehicle selection, compatibility check, parts inquiry, add-to-cart, checkout and verified order/collection. Separate inquiries from purchases and ordered revenue from collected revenue. Do not send VINs, customer contacts or private product costs to analytics. Document attribution and consent gaps.

Maintain a fixed monthly set of 32 AEO prompts: one purchase-selection and one compatibility question for each of the 16 models. Run a recorded, consistent Egypt/Arabic test protocol on available answer services, with English checks for leading models. Log date, engine, locale, exact prompt, retrieval mode, cited domains, whether Mansokar was cited, cited URL and factual errors. Treat this as a directional sample, not market share. Do not claim control of personalized answers or identify all AI visits from referrers.

Planning goals, to ratify after baseline:

| Horizon | Acceptance / KPI                                                                                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Day 14  | Final identity/domain confirmed; 16 model inventory/fitment audits; production index controls understood; baseline recorded                                                                               |
| Day 30  | Five brand and sixteen model hubs approved where catalog supports publication; zero critical template/schema errors on sampled live URLs                                                                  |
| Day 60  | First eight reviewed guides; 100% of prioritized product records complete for public price, item brand, identifiers, origin where verified, and fitment; trend in eligible indexed pages tracked          |
| Day 90  | Twelve reviewed guides if resourced; first conversion and query cohort review; improve pages with impressions but weak CTR or engagement; establish next-quarter click/revenue targets from observed data |

Report weekly on delivery and technical problems; monthly on business outcomes. Do not commit to first-page rankings, a fixed traffic uplift or AI citations before baseline and real demand validation.

## 12. Ninety-day delivery plan, owners and capacity

| Window     | Deliverable                                                                                                              | Owner                                  | Dependency                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------- |
| Days 1–7   | Domain/live crawl, identity decision, analytics/Search Console access, stock and model reconciliation                    | Merchant + SEO lead + developer        | Final domain and operational facts             |
| Days 8–14  | Technical backlog; template briefs; model keyword map; product-data standard                                             | SEO lead + catalog specialist          | Supplier fitment sources                       |
| Days 15–30 | Brand/model coverage, metadata, internal links, schema, sitemap and filter fixes on staging; approved production release | Developer + QA + merchant              | Real inventory and publish approval            |
| Days 31–45 | Top stocked SKUs completed; first four guides; eligible business/profile and merchant-feed setup                         | Catalog specialist + editor + SEO lead | Original images, policies and technical review |
| Days 46–60 | Four more guides, selected model/category pages, first AEO evaluation                                                    | Editor + SEO lead + developer          | Sufficient stock and distinct intent           |
| Days 61–90 | Remaining four guides; CTR/conversion improvements; earned partnerships; next-quarter prioritization                     | SEO lead + merchant + editor           | Search and sales data                          |

Suggested capacity for planning: developer 6–10 days initially plus 1 day/week; SEO lead 1–2 days/week; Arabic editor 1–2 days/week; catalog/fitment specialist 2–3 days/week during data cleanup; merchant approval 1–2 hours/week. Adjust after counting production SKUs and missing records. These are estimates, not a quote.

Budget as separate lines: technical implementation, catalog cleanup/photography, Arabic editorial and technical review, translation, reporting/tooling and legitimate outreach. Paid acquisition is a separate test budget. Get a scoped estimate after auditing SKU count; there is insufficient evidence for a reliable EGP budget today.

## 13. Decisions needed before execution

Final store identity and domain; actual stocked models/generations/engines; whether C3/C5 includes Aircross; business location and shipping coverage; approved return/warranty/payment terms; fitment reviewer and authoritative supplier sources; team capacity and budget. Access to Search Console and merchant-approved analytics is required for measured targets. Planning can proceed without these, but production claims and priorities depend on them.

Deliverables for the implementation phase: approved 16-model map; technical tickets with acceptance tests; page briefs; product-data completion queue; 12 editorial briefs; schema/feed validation checklist; and monthly SEO/AEO dashboard. No ranking or citation guarantees.

## 14. Credit cards and installment purchasing: expanded acquisition plan

Added 28 October 2026 at the merchant's request. Cover credit-card installments and all requested companies: **Valu, Souhoola (also spelled Suhoola), Forsa, Aman, Contact, Lucky, Fawry, Klivvr and Mogo**. These are research/onboarding targets, not confirmed Mansokar payment partners. The application currently only exposes COD when enabled; card and installment payment adapters are unconfigured.

### Search intent and page ownership

Create one bilingual hub at `/ar/installments` and `/en/installments`. Initial implementation is an informational guide with an explicit current-availability statement. It must not claim that users can pay through a provider before a supported transaction flow exists.

Target umbrella queries: `قطع غيار سيارات بالتقسيط`, `تقسيط قطع غيار بالكريدت كارد`, `قطع غيار بالتقسيط بدون كريدت كارد`, `تقسيط قطع غيار في مصر`, `spare parts installments Egypt`.

For every one of the 16 model hubs, research `قطع غيار [الموديل] بالتقسيط` and `تقسيط [القطعة] [الموديل]`. Add a useful financing question and a link to the central guide. Keep the main model hub as the owner of model-level finance intent; avoid making 16 near-duplicate financing pages. Product pages answer financing availability for the actual store and link to the guide.

Provider-intent research: `قطع غيار بالتقسيط فاليو / ڤاليو`, `قطع غيار بالتقسيط سهولة`, `تقسيط قطع غيار فرصة`, `قطع غيار أمان`, `قطع غيار كونتكت`, `تقسيط قطع غيار لاكي`, `قطع غيار فوري`, `تقسيط قطع غيار كليفر / كليڤر`, `قطع غيار بالتقسيط موجو` and English provider spellings. Validate actual query demand; do not present these as measured high-volume keywords.

Do not launch provider-specific sales pages until acceptance is verified and there is unique useful content: supported channel, eligibility, actual order limits, quote process, cancellation/refund process and dated offers. Never use a provider logo or describe the store as an authorized partner without the appropriate permission/agreement.

### Provider discovery and onboarding matrix

| Channel            | Research/onboarding task                                                                                                                                                                                                           | Verification reference                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credit cards       | Select an approved gateway/acquirer. Distinguish normal card acceptance, merchant bank-installment programs and issuer-side post-purchase conversion. Confirm eligible cards, banks, transaction categories, minimums and refunds. | Obtain gateway and issuer documentation for the contracted program; there is no universal bank/card installment offer.                                                            |
| Valu               | Confirm spare-parts merchant/category eligibility, online versus POS flow, settlement, refunds and contracted integration access.                                                                                                  | [Official Valu investor material](https://www.valu.com.eg/pdfs/FY25%20Investor%20Presentation.pdf) describes its product suite; merchant terms still require direct verification. |
| Souhoola / Suhoola | Confirm merchant approval and supported online/POS integration, account activation requirements and transaction-specific costs.                                                                                                    | [Official FAQs](https://souhoola.com/faq).                                                                                                                                        |
| Forsa              | Request merchant onboarding, approved category coverage, integration documentation and refund process.                                                                                                                             | [Official Forsa site](https://www.forsaegypt.com/blog/Interest-free-installment-app); a blog/promotion is not evidence of acceptance at Mansokar.                                 |
| Aman               | Determine whether the contract covers consumer-finance purchases, payment acceptance, collections or several distinct services.                                                                                                    | [Official AMAN services](https://aman.eg/en/).                                                                                                                                    |
| Contact            | Confirm merchant-network entry, online/branch flow, transaction approval and cancellation handling for this store.                                                                                                                 | [Official shopping-finance information](https://contact.eg/en/products/contact-now?lang=ar).                                                                                      |
| Lucky              | Verify the current official product, contracting entity, merchant/category eligibility, channel and integration documentation before selecting a route.                                                                            | [Official Lucky terms](https://thelucky.io/ar/pages/terms). Merchant onboarding evidence pending; do not infer a usable checkout integration from the brand name.                 |
| Fawry              | Distinguish payment collection, installment repayment, card-based purchases and the specific myfawry taqseet finance product. Verify the exact supported purchase path.                                                            | [Official myfawry taqseet FAQ](https://www.fawry.com/wp-content/uploads/2026/05/myfawry-taqseet-FAQs.pdf).                                                                        |
| Klivvr             | Distinguish card acceptance from account credit/installment features and direct merchant integration.                                                                                                                              | [Official Klivvr site](https://klivvr.com/).                                                                                                                                      |
| Mogo               | Confirm merchant acceptance, category/channel eligibility, integration and transaction-specific quote/refund terms.                                                                                                                | [Official Mogo information](https://mogo-eg.com/en/).                                                                                                                             |

Research does not establish any store partnership or consumer approval. Do not transplant a provider's general advertised maximum tenor, approval time or temporary zero-interest offer into Mansokar product pages. Repaying another lender through Fawry/Aman is distinct from financing this purchase. Contact's own documentation illustrates the distinction between finance and repayment channels. [Contact repayment channels](https://contact.eg/en/payment-channels).

### AEO questions and conversion content

Answer these in clear Arabic, with an accurate English counterpart:

- هل أقدر أشتري قطع غيار [الموديل] بالتقسيط من المتجر؟ State actual checkout availability first.
- هل الدفع بالكريدت كارد معناه إن العملية تقسيط؟ Explain that eligible financing depends on a specific issuer/provider program.
- هل ينفع أقسط من غير كريدت كارد؟ Explain that some consumer-finance routes are separate from a credit-card program, but eligibility and store support require confirmation.
- هل المتجر بيقبل [provider]؟ Answer only from verified enabled acceptance, not planned integration.
- القسط كام وإجمالي التكلفة كام؟ Show the provider's current quote, down payment, installment count, fees and total payable; no simple price/months calculation unless the actual quote supports it.
- لو رجعت القطعة، إيه اللي بيحصل للأقساط؟ Explain the contracted refund process and how the provider confirms the adjustment.

Before activation, direct readers to the guide and actual supported checkout methods. After activation, show an eligible provider selector and current quote near the product price, with a link to detailed terms. Keep the base item price and financed total distinct. Use genuine dated offers with expiry, supported products and order constraints. Remove expired offers promptly.

### Implementation phases and acceptance

1. **Now:** publish the guide; add product questions and internal links; expand this plan; measure guide engagement. Do not enable unsupported payment actions.
2. **Merchant onboarding:** compare all requested routes for category eligibility, direct versus aggregator support, online/POS coverage, commercial terms, settlement, refund handling and documented integration access. Choose initial providers using evidence, not logo count.
3. **Engineering:** hosted/tokenized card checkout as supported by the selected provider; server-created payment intents with server-calculated totals; signed webhook verification; idempotent updates; pending/paid/failed/expired states; reconciliation and audited refunds. A browser return URL cannot prove payment. Financing quotes require current provider data and expiration handling. Do not collect card PAN/CVV, finance PINs or provider OTPs in generic inquiry forms.
4. **Validation:** sandbox success/failure/cancel/timeout, duplicated and out-of-order callbacks, forged return URLs, incorrect amounts/currencies, quote expiry, unavailable products, partial/full refunds and reconciliation. Complete a supported production test before exposing a method as active.
5. **Acquisition:** publish verified provider pages only after activation; add financing answers to each applicable model page; update product copy, checkout and campaigns together. Structured data must retain the actual product offer, not replace it with a teaser monthly amount.

Success measures: qualified finance-intent clicks; guide-to-product and product-to-checkout progression; eligible quote starts; completed and settled financed orders; financing rejection/abandonment; provider fees and net contribution; refund completion time. Keep financing applications and provider credit decisions out of general analytics. Add 16 model-level installment questions and nine provider-acceptance questions to the AEO evaluation set, separate from the existing compatibility prompts.

## 15. First implementation batch

Implemented locally: richer product-specific title/description defaults and social sharing metadata; expanded product JSON-LD with image, item brand, MPN and country-of-origin facts when supplied; visible Arabic/English product answers; bilingual installment guide; footer/product links to the guide; sitemap launch gating and guide-hub inclusion. Every published product continues to have its own `/ar/products/{slug}` and `/en/products/{slug}` URL automatically, including newly imported published products. No manual page file per SKU is needed.

Remaining: merchant onboarding and actual card/finance integrations; real stock-backed structured availability; completion of images/identifiers/fitment data; all-model catalog expansion and Chevrolet support; additional approved editorial content; live crawl/index/performance and Search Console baseline. Existing launch approval controls remain in place. This batch does not deploy or activate new payment processing.

Validation for this batch: TypeScript check and production build passed; all 18 existing tests and 3 new product SEO tests passed. Chromium checks against the local production build confirmed HTTP 200 responses, product answers/social metadata/guide links in Arabic and English, all requested provider names in the guide, and no horizontal overflow on the guide at a 390px mobile viewport. No payment provider was enabled and no production deployment was performed.

## 16. Second implementation batch

Implemented locally after approval to continue:

- All five target brands and sixteen model families now have Arabic/English buying/navigation routes. Existing catalog models are retained. Chevrolet has a text-based card until an approved brand image/logo is supplied.
- Model metadata and headings use localized names and Egypt-specific search copy. Each target model has a tailored buying note, configuration selection where actual configurations exist, links to buying guides and installment information, and a parts-inquiry path where configuration data is missing.
- Navigation coverage is independent of vehicle configuration/fitment records. This batch creates no years, engines, stock claims or compatibility relationships.
- Three bilingual buying guides cover part compatibility, item brand versus manufacturing origin, and comparing complete order/financing costs. The guide index links these alongside published CMS guides. Published merchant CMS content can override the built-in guide at the same slug.
- Sitemaps include target navigation routes, the guide index and the three guide pages, while retaining the launch approval gate.

Remaining execution work: populate verified vehicle configurations and actual product fitments for missing models, complete merchant images/identifiers/origin data, develop stock-backed model/category landing pages, publish the remaining reviewed editorial briefs, onboard payment providers, and establish live Search Console/analytics/performance baselines. Navigation coverage is not evidence of product availability. Card/finance processing is not activated by these content changes.

Second-batch validation: TypeScript, all 23 tests and the production build passed. Local production browser/request checks confirmed all 32 target model URLs and eight guide URLs (index plus three articles in each language) return HTTP 200 with headings and canonical metadata. Sample Arabic/English model and guide pages passed 390px mobile overflow and installment-link checks. An unknown model renders the 404 UI with noindex. As documented by this Next.js version, a not-found response detected after streaming starts may retain HTTP 200; strict pre-stream HTTP 404 handling remains a technical follow-up. No production deployment or external payment activation was performed.

## 17. Admin data-entry phase

Added vehicle fuel/powertrain, turbo/induction and transmission options alongside the existing model, generation/chassis designation, generation year range, exact year, engine description/capacity/code, body and trim. Generation choices are filtered by the selected model; unknown optional values remain blank. A configuration still represents one exact year. Existing database checks enforce generation/model/year consistency.

Registered the sixteen requested model identities and Chevrolet in the database, without creating engine/year configurations or product-fitment claims. Added Chevrolet to admin model entry, vehicle lookup and unlisted-vehicle inquiry handling. The optional-column migration was applied to the linked Mansokar project and confirmed in migration history.

Saved-product pages now include exact compatibility selection. Product fields include fitting position and bilingual exclusions, plus direct SEO title/description and alternative-name inputs. Blank localized SEO values fall back to automatic product metadata. Exclusions appear in the matching language in visible specifications and product answers; Excel imports/exports preserve them. The workbook vehicle reference includes configuration details for matching IDs.

Added a fourth bilingual guide, `guides/identify-vehicle-configuration`, explaining model/year, generation, engine, fuel, turbo, transmission and private VIN handling. Existing guide-index, model links and sitemap generation include it automatically.

Data entry order: Admin → Vehicles → model, then generation/year range, then exact configuration; Admin → Products → product details, save, then select verified compatible configurations and save compatibility. Generation is optional when unknown; exact year and engine description are required before a configuration can be saved. Keep products as drafts until the data and images are reviewed.

Validation: TypeScript and production build passed; 25 automated tests passed, including database round trips for the new fields, separate manual/automatic configurations, duplicate rejection, invalid-option rejection, generation checks and Chevrolet inquiries. Existing RLS tests still pass. Supabase Management API advisory/query endpoints returned account-permission 403 responses, so hosted advisor results were unavailable; direct migration deployment/history and application/database tests were used for verification. The connected Supabase plugin account does not list this project; deployment used the CLI link matching the application's configured project.

Authenticated acceptance checks passed against the updated database using the local production build: saved/reloaded fuel, turbo, transmission, capacity, code, body and trim through Admin → Vehicles; saved/reloaded product fitting position, restrictions, SEO text and exact compatible configuration through Admin → Products; checked the fourth guide in both languages. Disposable QA user, draft product, vehicle configuration, fitments and audit rows were removed. Application files remain local and have not been deployed.

## 18. Shipping, returns, warranty and callback support

Prepared original Arabic/English policy drafts using Zait & Filters' shipping and return pages as references and cross-checking return rights against Egyptian Consumer Protection Agency guidance. Owner approved a 2–5 working-day shipping estimate and supplier-specific product warranties, with a callback contact form instead of a published phone number/email.

Three records are saved in CMS at `policies/shipping`, `policies/returns` and `policies/warranty`. Detailed review text and research sources are in `docs/policies/POLICY_DRAFTS.md`. Drafts are intentionally unpublished until the application containing the callback form is deployed; the merchant terms themselves have been confirmed. Existing published pages are preserved by the import script.

Added `/ar/contact` and `/en/contact` callback forms with Egyptian mobile number, topic, inquiry and required consent. The rate-limited, validated endpoint saves requests privately in `part_requests`, labeled as callback requests in Admin → Inquiries. It does not require a vehicle configuration and does not send an email/SMS or promise an immediate response. Contact URLs are included in sitemap generation; published policy pages link to the form, and warranty links are added to the footer and product information.

Before public cutover, deploy the application, verify callback submission on the deployed domain, then publish the approved CMS policies. Do not publish callback-form instructions against the older frontend that does not yet contain the form.

## 19. Governorate delivery methods

Owner confirmed express means **48 hours**, with normal shipping within **2–5 business days**. Added 27 bilingual governorate identities and 54 independently configurable delivery options (normal plus express for each). Rates are blank and disabled initially, and cannot be enabled without an explicitly configured rate. Existing rates remain intact. Admin entry uses EGP, including the optional free-shipping threshold.

Checkout and product delivery estimates use the governorate, method and delivery-window labels. Existing server-side quote/order calculations use the selected option's stored rate; order snapshots retain its method and timing. Updated the unpublished shipping policy to reflect the confirmed service windows and governorate-based availability. The two migrations are applied to the linked database; application changes still require deployment.

Governorate count checked against [Egypt State Information Service](https://africa.sis.gov.eg/english/egypt/basic-information/). No governorate shipping prices or nationwide express availability were invented. Delivery methods become publicly selectable only after the merchant configures and enables them.

Governorate shipping validation completed: TypeScript, production build and all 27 automated tests passed. Database tests cover all 54 disabled/unpriced defaults, the 27 express 48-hour windows, rejecting enabled rates without amounts, and using a configured server-side rate in the checkout quote. Browser checks verified all 27 admin governorate links and independent normal/express EGP saves and reloads using future-dated QA rates. The timestamp validation issue found in acceptance testing was fixed and covered by a regression assertion. Disposable rates, audit rows and QA account were removed. No application deployment was performed.

## 20. Sitemap and indexing audit — 28 October 2026

Direct requests to `https://mansokar.vercel.app/sitemap.xml` and `/robots.txt` returned HTTP 200. The deployed XML sitemap exists; the site also returns `X-Robots-Tag: noindex, nofollow`. Database inspection found eight demonstration products and zero published real products at the time of this audit. Sitemap presence alone therefore does not establish product search visibility. The local generator additionally had a launch-flag condition that returned an empty sitemap and a build-time cache, so the deployed and local versions differed.

Implemented in this batch:

- Request-time `/sitemap.xml` backed by a shared inventory of canonical public routes. Both languages use absolute canonical URLs and reciprocal language alternates. Demo and draft products, unpublished policies, private CMS paths and arbitrary CMS slugs without supported routes are excluded. No artificial last-modified dates are generated.
- `/ar/site-map` and `/en/site-map` provide ordinary links to brands, models, categories, guides, approved policies and published real products, with bounded product-list pagination. Footer links make the pages discoverable.
- **Admin → SEO** shows sitemap URL counts, real versus demo product totals, canonical origin, launch indexing status, and missing product photos, compatibility, country of origin, part numbers or bilingual descriptions. It links directly to the corresponding editors and explains Search Console submission.
- Stable `Organization`/`WebSite` entity IDs and bilingual site identity markup; guide `Article` markup without invented authors, review dates or ratings. Optional `GOOGLE_SITE_VERIFICATION` supports an owner-provided Search Console verification token.
- A bilingual FAQ with practical answers about compatibility, EGP prices, normal/express shipping, actual finance availability, callback support and supplier-specific warranty. Published merchant FAQ content still takes precedence.
- Public filtered/listing pages remain noindex but allow link following. Removed catalog-query robots blocks so crawlers can read page-level noindex directives; private account/order/admin/API routes remain restricted.

The XML inventory can be reviewed before launch; it no longer disappears solely because the launch flag is off. The separate page-level/sitewide noindex launch control remains unchanged. The developer workflow must not pretend this code change enables search indexing or submits a sitemap to a user's search account.

Next priorities: load reviewed real product data/images/fitments; deploy this batch and the preceding admin/contact/shipping work; publish the owner-approved policies after callback verification on the deployed domain; make the deliberate indexing cutover; verify/submit the sitemap in Search Console; measure Egypt search queries, conversions and mobile field performance. Review stable crawlable delivery for catalog images, whose current storage URLs expire, before treating product-image SEO as complete. Split sitemaps before inventory exceeds protocol limits; a single sitemap is appropriate for the current small catalog.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google AI feature guidance](https://developers.google.com/search/docs/appearance/ai-features). No ranking or answer-citation guarantees.

Batch validation: TypeScript, production build and all 29 tests passed. Browser checks confirmed nonempty XML, canonical/localized URLs, immediate sitemap inclusion/removal after publishing/unpublishing a temporary non-orderable product, mobile HTML site maps, FAQ answers, WebSite/Article markup and the authenticated SEO dashboard. Temporary QA product, account and admin records were removed. No application deployment, indexing cutover or Search Console submission was performed.

## 21. Stable product-image discovery — 28 October 2026

Public product pages, social metadata and Product structured data now use stable `/product-media/{image-id}` URLs instead of storage signatures that expire after ten minutes. The endpoint returns an image only while its related product is real and published; draft, deleted and demonstration-product media remain unavailable. The underlying catalog storage bucket stays private. Responses identify the media type, prevent MIME sniffing and use bounded public caching.

The XML sitemap includes these stable image URLs for published real products that have merchant photos. This supports image discovery without inventing product imagery or exposing inquiry uploads. Product publication status remains authoritative, and a product without a verified photo simply has no image sitemap entry.

Validation for this batch: TypeScript, the production build and all 30 automated tests passed. A local production request confirmed that an unknown or ineligible media ID returns HTTP 404 while the request-time sitemap remains available. No application deployment, indexing cutover or Search Console submission was performed.
