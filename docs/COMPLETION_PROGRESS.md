# Completion work — updated 27 October 2026

This records code completed after the original gap audit. It does not claim a launch-ready operational store. Dedicated backend provisioning and the live acceptance checks described below are now verified.

## Completed in code and locally verified

- [x] Regular product cards use uploaded photos or honest placeholders; demo illustrations/copy are conditional.
- [x] Product detail and cart/comparison fetch requested products independently of the initial catalog page. Exports and sitemap paginate through all records.
- [x] Comparison renders supplied warranty text and prompts for a second same-family product.
- [x] Spreadsheet round trip and existing-SKU imports preserve cost, warranty, editorial data, multiple part numbers, synonyms and SEO fields.
- [x] Structured vehicle generation, engine code/capacity, body and trim support, including admin API validation and generation editor.
- [x] Itemized server-priced checkout review: product quantities/prices, coupon discount, shipping and grand total. Final order creation recalculates and rejects a changed total.
- [x] Human order numbers, delivery notes, shipment fields and private staff notes; private confirmation shows ordered items and shipment details.
- [x] Active member Garage selection, nickname editing and guest selection merge on sign-in; saved-address editing and reuse at checkout.
- [x] Product form, draft duplication and searchable exact-vehicle checkbox mapping; advanced JSON editing remains available.
- [x] Admin changes and audit records commit atomically. Database tests prove an audit failure rolls back its mutation.
- [x] Product-page delivery estimator; merchant FAQ content on the homepage with useful default fitment guidance.
- [x] Published guide listing/detail routing, product/category/CMS SEO fields, expanded sitemap and filtered-page noindex.
- [x] Readiness endpoint checks database connectivity; public item lookup has a rate limit. Account exports exclude private staff notes.
- [x] Vercel project created in the **9apps** team and deployed at https://mansokar.vercel.app. Explicit Next.js framework configuration and the production canonical URL are set. HTTPS checks return 200 for Arabic/English homepages and liveness; readiness now returns 200 with the dedicated database connected.

## Added on 27 October

- [x] Date-range reports include all matching real orders, daily trends, manufacturer/category sales, coupon usage and cancellation/return counts. CSV exports use the same filters; the former latest-500 cap is removed.
- [x] New order items capture private historical cost and category snapshots. Product contribution is suppressed when historical costs are missing and is explicitly distinguished from net profit.
- [x] Member profile lookup, recent order/inquiry history and private, audited support notes.
- [x] Routine CMS and storefront settings forms, scheduled homepage campaigns and curated recommendation controls. Purchased-together suggestions still require exact selected-vehicle fitment.
- [x] Product XLSX export preserves supported import fields and stores formula-like text as text. CSV export remains available; exports are rate limited.
- [x] Product image manager supports private uploads/previews, cover ordering, removal from products and bilingual descriptions.
- [x] Arabic/English public order/payment status labels and forwarding refreshed session cookies to downstream server handlers.
- [x] Secured daily temporary-data housekeeping with a dry-run mode; see [OPERATIONS.md](OPERATIONS.md) for its bounded scope and remaining monitoring/backup requirements.

## Further outstanding work completed

- [x] Account lookup by email/name/phone includes accounts without saved profiles. Enabled administrators can edit name, phone and preferred language; privileged Auth fields and verification are not browser-editable.
- [x] Uploaded hero, store logo, brand-card photos/logos, model photos and campaign media can be assigned, previewed and restored through Branding. Images remain in private Storage and are served through short-lived signed URLs; image optimization is restricted to the configured project/catalog bucket.
- [x] Store name/contact/intro settings feed navigation, footer and metadata.
- [x] Category hierarchy, sorting, bilingual introductions and SEO forms; database cycle prevention; parent-category browsing includes descendant products.
- [x] Linked breadcrumbs and structured breadcrumb data; localized brand/model/page metadata and common public validation/accessibility labels. Unknown public errors no longer disclose database internals.
- [x] Comparison details require 2–4 same-family products; category autocomplete supports bilingual category names.
- [x] A buyer can describe an unlisted vehicle when requesting a part. The inquiry remains explicitly unconfirmed and does not create a fitment/configuration mapping.
- [x] Routine shipping-area/rate, free-delivery threshold, coupon, model, generation and exact-configuration forms replace JSON-only editing. Database guards prevent incompatible generation/model/year assignments and generation edits that invalidate existing configurations.

- [x] Optional CMS/category SEO overrides work independently by language and fall back to the approved localized title. Preview pages send `X-Robots-Tag: noindex, nofollow` until `STORE_LAUNCH_APPROVED=true`; homepage canonical URLs match the actual non-redirecting routes.
- [x] Personal data exports paginate all selected records and include the account identity, cart and own order lines. Private item costs, staff notes and order-access tokens are excluded; downloads are rate limited and unauthorized users are denied.

## Verification

`npm test` passes: domain, migrated embedded PostgreSQL and file/upload suites. Regression assertions cover a genuinely expired coupon, side-effect-free quoting, changed-total rejection, Garage deduplication/active selection, import updates, alternate part-number search, private cost exclusion and atomic audit rollback.

Production build/type checks pass. Browser checks pass for both locales, four brand pages, selected-vehicle catalog filtering, cart loading, gallery keyboard behavior, incorrect-engine handling, language preservation, admin denial and mobile overflow. Ten automated accessibility views report zero violations. The browser acceptance suite also passes against the deployed Vercel site. Embedded PostgreSQL regression suites remain in place. Dedicated live Auth/Storage/account/admin checks and rolled-back real PostgreSQL checkout/fulfillment checks now also pass; see [LIVE_BACKEND_VERIFICATION.md](LIVE_BACKEND_VERIFICATION.md). Public checkout/provider acceptance remains pending.

Live verification on 27 October passes for authenticated customer notes, report dates and CSV, XLSX downloads, draft CMS form saves, campaign creation, recommendation screens, private photo upload/preview and image-description saves. The maintenance test verifies unauthorized denial, dry-run preservation, removal of an expired unclaimed upload and preservation of a recent upload. Vercel confirms the daily schedule is registered; its first natural scheduled invocation remains to be observed. Disposable users/order/coupon/CMS/photo fixtures are removed after testing. The updated security advisor reports no warning/error issues; production browser checks pass and ten accessibility views report zero violations.

## Still required

- [x] Dedicated Supabase Free project, migrations, private buckets and Vercel connection. Live authentication/confirmation, member isolation, cart/Garage/address persistence, admin denial/audited mutation and private Storage checks pass.
- [ ] Owner registration/email verification for `mo.dowaik@gmail.com`; verified-email admin bootstrap is configured. Full public checkout/provider and remaining acceptance scenarios are still pending.
- [ ] Approved gateway and messaging providers. User confirmed none are chosen. Online payments, installments and OTP delivery remain unavailable.
- [ ] Complete payment/refund reconciliation and transactional messaging after providers are selected.

- [ ] Approved customer-data retention/deletion processing and legal review; external monitoring/alerts, private backups and an isolated restore drill; representative production-scale and manual acceptance. User confirmed backup/monitoring services are **not chosen**. Temporary-data housekeeping is implemented. A natural scheduled maintenance invocation still needs observation beyond manual invocation/configuration checks.
- [ ] Real merchant catalog/photos/fitments, approved shipping rates, policies, tax/invoice/COD rules, translated launch copy and support details. User confirmed on 27 October that these are **not ready yet**; checkout remains disabled.

Campaigns and product relationships now have merchant controls and storefront behavior. Outbox, tracking challenges, transfers and refunds remain schema groundwork; those tables alone are **not completed features**. The full historical checklist remains in [SPEC_GAP_AUDIT.md](SPEC_GAP_AUDIT.md).

Latest verification: all sixteen named local tests pass (one includes many migrated-PostgreSQL assertions). The deployed authenticated suite passes profile-less email lookup and its member-denial case, support profile edits, editorial media assignment/restoration, optimized private media, custom-vehicle inquiry form submission and the routine merchant screens. Public browser checks pass comparison minimums, Arabic brand metadata/breadcrumb schema and category autocomplete, plus the original storefront scenarios. Ten deployed accessibility views report zero violations. Security advisors return no warning/error issues. Both new migration versions match the remote history. Disposable test records are cleaned up.

Final source verification also passes English-only and Arabic-only optional SEO saves, own-account data export (identity/cart/order lines), export privacy boundaries, preview noindex headers and normalized canonical paths. `npm audit --omit=dev --audit-level=moderate` reports zero vulnerabilities. These checks do not replace a separate external security review or merchant launch approval.
