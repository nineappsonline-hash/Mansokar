# MOPC SEO / AI search audit

This audit precedes implementation of MOPC_SEO_AIO_IMPLEMENTATION_PLAN.md. The live database is authoritative; the read-only discovery command and its exports are in `scripts/seo-discovery.mjs` and `docs/seo/`. Do not infer fitment, stock, condition or manufacturer origin from a vehicle name or orderability.

## Stack, infrastructure and data

- Next.js 16.4.3 App Router / React 19, request-rendered public pages, metadata APIs, Next proxy, Vercel project `9apps/mansokar`.
- Supabase: `products`, `product_images`, `product_fitments`, `vehicle_brands`, `vehicle_models`, `vehicle_generations`, `vehicle_configs`, `vehicle_model_years`, `manufacturers`, `categories`, `cms_pages`, `site_settings`, `shipping_areas`, `analytics_events`.
- Product prices are integer minor units; public EGP output must match schema/feed amounts. There is no authoritative inventory counter in the existing Product interface. Do not manufacture InStock or NewCondition.
- Live database counts and unknown fields are recorded in `docs/seo/catalog-baseline.json`; full requested inventory matrices are CSV files beside it. No customer/contact data, costs or credentials are exported.
- Existing merchant-authenticated Excel exports, checkout, callback verification and data-entry workflows remain unchanged.

## Route matrix / baseline

| Template | Existing route | Rendering | Baseline defect / action |
|---|---|---|---|
| Home | `/ar`, `/en` | Server HTML | P0: live noindex; P1 duplicate short title and demonstration fallback description |
| Brand | `/{locale}/brands/{make}` | Server HTML / interactive cards | P1: model anchor only inside collapsed year panel; preserve expansion, add normal browse link |
| Model | `/{locale}/brands/{make}/{model}` | Server HTML / paginated products | P1: same description across models; empty/unsupported combinations need deliberate eligibility |
| Product | `/{locale}/products/{slug}` | Server HTML | P1: unconditional NewCondition; locale alternates include untranslated names; name-derived URL aliases need 308 normalization |
| Guide | `/{locale}/guides/{slug}` | Server HTML | P1: incomplete Article JSON-LD; missing product/model links and maintenance metadata |
| Search / facets | `/{locale}/catalog?...` | Server HTML | P1: noindex exists; keep crawlable so crawlers can see it |
| Pagination | model listing `?page=N` | Server HTML anchors | P1: canonical currently drops page, collapsing every page to page one |
| Private flows | cart, checkout, account, garage, orders | Noindex / auth | Preserve authentication; remove conflicting robots exclusions where public noindex must be seen |
| Discovery | `/sitemap.xml`, `/robots.txt` | Dynamic | P1: flat inventory includes every model and language; needs eligible partitions and actual update dates |

Representative HTTP/title/H1/canonical/robots/JSON-LD baselines are in `docs/seo/http-baseline.json`.

## P0 release gates

1. `mopc.store` and `www.mopc.store` both fail DNS resolution in preflight; domain is not attached to the accessible Vercel account. Do not switch canonicals, enable host redirects or change DNS until ownership/TLS/routes pass and owner approves cutover (spec sections 10 and 16).
2. Existing production response sends `X-Robots-Tag: noindex, nofollow`. Keep preview protection; make indexing explicitly depend on approved host/launch configuration.
3. Terms and Privacy are missing and Returns is a draft. Checkout deliberately refuses orders before any payment-provider request. This is a separate merchant policy approval gate; do not publish or change policies in this SEO release.
4. Merchant feed must remain gated until country/program eligibility, actual condition/availability, merchant policies and merchant account are verified.

## P1 implementation / affected files

- Central site origin and domain migration feature flag: site URL helpers, proxy, next.config, metadata, structured data, sitemap, auth redirects.
- Locale/page eligibility helpers: seo-inventory, seo-pages, product-seo, public-product, locale page metadata.
- Sitemap index and child routes with actual content timestamps; robots crawler policies.
- Crawlable model links, useful data-backed model content, generic canonical product copy, guide evidence and internal links.
- Admin SEO health/report export, authenticated feed scaffold, consent-aware measurement and repeatable tests/CI.

## P2 / external account assumptions

No connected Search Console, GA4 or Merchant Center tool/account was discovered. No search-volume provider is connected. Record SERP intent samples and actual supported keyword destinations, but leave historical clicks, ranks, volumes, revenue and AI citations unknown. DNS/domain cutover, service account setup, paid tools, crawler training preferences and merchant-policy publication remain owner-controlled. No synthetic reviews, compatibility or repair guidance will be added.
