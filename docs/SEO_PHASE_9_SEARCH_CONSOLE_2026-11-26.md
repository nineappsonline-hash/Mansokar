# MOPC — Phase 9 Search Console indexing baseline

Date: **26 November 2026**  
Site: **https://mopc.store/**  
Verified Search Console property: **https://mopc.store/** (Owner).  
Source: live Google Search Console connection via OpenSEO; Google index inspection is a **cached crawl verdict**, not a live URL test.

## Search performance baseline

Period: **27 October–23 November 2026**, Google Search Console data with reporting lag.

- **37 impressions**, **0 clicks** from the dated Search performance report.
- **17 URLs with impressions**: one root URL and 16 product URLs.
- The observed searches mostly use exact part numbers, e.g. `23731594`, `23753349`, `9808155580`.
- These 17 pages are *not* the total number of indexed URLs; Search performance shows only pages with impressions in the chosen period.

## URL inspection — confirmed findings

| URL | Google's cached coverage | Last crawl | Action |
| --- | --- | --- | --- |
| `/` | Indexed; Google-selected canonical `/`, user canonical `/ar` | 13 Nov | Live code has a permanent `/ -> /ar` redirect. Verify it via external HTTP, then request Google to recrawl `/ar` and `/`. |
| `/ar` | Duplicate; Google chose `/` | 13 Nov | Same canonical cluster; avoid conflicting metadata and monitor recrawl. |
| `/en` | Unknown to Google | Not crawled | Check sitemap / discovery, do not force indexing without verification. |
| `/ar/catalog` | Unknown to Google | Not crawled | Intentionally `noindex` because the general filterable catalog is not an SEO landing page. |
| `/ar/guides` | Discovered, currently not indexed | Not crawled | Check internal links; request indexing for this useful public guide hub if live canonical and content check pass. |
| `/ar/products/coolant-overflow-tank-gm-p-c4c0ce8c-7060-4591-9e4e-64650dfc7f15` | Indexed, rich snippet fails: missing offer/review/rating | 18 Nov | Current code generates an Offer for orderable valid-price items; current DB shows orderable/in_stock, 1000 recorded, EGP price. Recheck live HTML and request re-crawl. |
| `/ar/products/genuine-parts-p-56655884-873c-4ef9-b30b-36492b20e61f` | Indexed, same product snippet error | 18 Nov | Same cached-versus-current check. |
| `/en/products/turbo-intercooler-gm-p-1f840aa9-ea09-4d10-b996-2282152fb18a` | Indexed, same product snippet error | 18 Nov | Same cached-versus-current check. |

Google also reports clean canonical alignment for the three indexed product URLs above. Page inspection reported that Googlebot was allowed, mobile crawl succeeded, and the Product/Breadcrumb structure was detected.

**Do not invent reviews or add ratings to suppress a snippet error.** The current implementation puts `offers` into structured data only for published, purchasable items with a valid price. All three inspected examples currently meet those conditions in Supabase. A new crawl is necessary to know whether Google has seen the update.

## Technical guard added to the repo

Run `npm run seo:live-audit` to check production HTTP responses for:

- Permanent `/ -> /ar` redirect.
- Public `robots.txt` with sitemap reference.
- Sitemap index and product sitemap.
- Arabic homepage 200, canonical, no `noindex`.
- Up to four indexed-eligible Arabic product sample pages from sitemap for 200, canonical, indexability and `Product` with EGP `Offer`.

The workflow `.github/workflows/mopc-seo-crawl-audit.yml` runs the check weekly, supports manual runs, and saves the results as an artifact. The scripted smoke audit does not query Search Console and does not submit URLs for indexing.

## Next operational steps

1. Inspect the workflow's first production report. Address any HTTP, sitemap or JSON-LD failures before asking Google for another crawl.
2. In Search Console → Sitemaps, confirm `https://mopc.store/sitemap.xml` shows **Success** and check its discovery counts.
3. In URL Inspection, test the live URL for `/ar` and the three example product pages. If live tests pass, use **Request indexing** for these priority URLs.
4. Review **Pages → Why pages aren't indexed**, prioritizing canonical discrepancies, errors, excluded product URLs and discovered-but-not-indexed important guides. Do not count intentionally noindexed cart/checkout/filter routes as defects.
5. After Google re-crawls, repeat index inspection. Note that crawl timing and indexing are controlled by Google, and a successful sitemap does not guarantee indexing.
6. Review last-28-day Search Console performance weekly for non-branded queries and pages, especially exact part-number queries.

## Caveats

- Live public HTTP cannot be independently fetched from the assistant's present environment, so the GitHub runner's report is needed to assert *live* status.
- Product stock quantity `1000` is an administrative placeholder in Supabase; a recorded status is not independently verified physical stock.
- GSC inspection is a snapshot and may describe crawl state before the 26 November stock and price changes.
