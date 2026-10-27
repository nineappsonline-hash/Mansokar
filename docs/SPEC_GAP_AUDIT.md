# Master specification gap audit — 26 October 2026

> This is the original audit snapshot. Subsequent fixes, test evidence, deployment and outstanding work are tracked in [COMPLETION_PROGRESS.md](COMPLETION_PROGRESS.md). Several findings below have since been resolved in code; live backend acceptance remains pending.

Compared `MANSOKAR_MASTER_SPEC_V2.md` (sections 1–15) with the current application, migrations, scripts and test evidence. Later requested design, typography, offers and purchase-card changes are included in the current implementation; the original proposed font choices are not treated as outstanding requirements.

**Conclusion:** the storefront is a functioning demo with substantial backend code, but the master specification's operational-store definition of done has not been met. Earlier “core implemented” progress notes do not mean that the corresponding phases have complete acceptance coverage.

## Current local state

- Only `.env.example` is present; `.env` and `.env.local` are absent. This audit process has no Supabase URL, publishable key or server key configured. COD, demo checkout and analytics are not enabled.
- Consequently, account/admin/database writes, private uploads and order placement cannot be exercised against a real backend from this checkout as configured. Their implementation is present in varying degrees; this is different from saying those features are entirely absent.
- Demo products, illustrated product media and fictional fitments remain the supplied catalog. No real catalog, approved shipping coverage or merchant policy content has been supplied here.
- Remote infrastructure/deployment state was not independently audited. The local configuration finding is not a claim about every environment the merchant might have elsewhere.
- Fresh verification in this audit: `npm run typecheck` and `npm test` pass. There are eleven named tests, including one embedded-PostgreSQL test containing many assertions. Existing browser and accessibility reports were inspected; no real-provider or live Supabase integration test was performed in this audit.

## Phase status

| Phase | Current state | What prevents full acceptance |
|---|---|---|
| 0 — Foundation | Application, migrations, CI configuration and auth/admin code exist | Configure a dedicated backend, apply migrations/buckets, bootstrap the administrator and verify real authentication/session flows. Hosted CI execution is not evidenced. |
| 1 — Storefront | Reference-inspired bilingual responsive interface is built | Homepage FAQ block is absent. Complete merchant-managed media/content controls remain under Phase 3. |
| 2 — Catalog/fitment | Core browsing, fit checking, galleries, cards, cart actions, Garage and inquiries exist | Production catalog rendering, richer compatibility data, full Garage behavior, comparison details, shipping estimator and cross-sell/content features remain incomplete. |
| 3 — Administration/imports | Protected JSON editors, imports, coupons, shipping and basic metrics exist | Complete merchant-facing workflows, customer management, order operations, reporting, CMS/settings coverage and import field handling. |
| 4 — Checkout/orders | COD transaction/pricing/idempotency code exists | Live end-to-end checkout, pre-submission order review, human order numbers, verified guest tracking, fulfillment and customer communications. |
| 5 — Payments | Adapter interface and internal event recorder only | All actual online providers, hosted payments, signed webhooks, transfers, installments and refund reconciliation. |
| 6 — Launch quality | Local checks and several safeguards exist | Complete SEO/localization, production-scale/security testing, operational monitoring/backups/retention, staging acceptance and merchant launch approvals. |

## Fix these before loading a real catalog

1. **Regular product cards still use demo illustrations and labels for every product.** The normal `Card` renders `partArt(...)`, `DEMO / ...` and a demo-image description without checking `product.demo`. Special-offer cards already handle merchant photos, but the ordinary home/catalog/related grids do not. The product detail page also always adds the demo badge and demo warranty/availability wording. Real products need real media or honest unavailable-media placeholders and conditional demo copy. Evidence: [public routes](/home/jimmy/Mansokar/src/app/[locale]/[[...path]]/page.tsx:96).
2. **Supplied warranty text is ignored by comparison.** The comparison page always says “Warranty: not supplied”, even though the product model/editor supports warranty data. It also permits displaying only one selected product instead of requiring 2–4. Evidence: [comparison](/home/jimmy/Mansokar/src/components/controls.tsx:297).
3. **Large catalogs can lose products outside the initial result set.** Product detail, cart, comparison, home data and sitemap depend on `catalog()`, which does not paginate or fetch the requested SKU directly. Local Supabase configuration has a 1,000-row API maximum. Catalog search has a paginated RPC, but these auxiliary flows and exports need independent SKU/ID lookups or complete pagination. This becomes a correctness issue, including possible false 404s, when the catalog exceeds the API cap. Evidence: [catalog loader](/home/jimmy/Mansokar/src/lib/db.ts:43), [product lookup](/home/jimmy/Mansokar/src/app/[locale]/[[...path]]/page.tsx:625), [export](/home/jimmy/Mansokar/src/app/api/admin-export/route.ts:5).
4. **Import support does not fully preserve newer product fields.** The validator accepts cost, warranty and editorial data, but `import_products` does not update those fields on an existing SKU. The spreadsheet/export column set also omits them. A reproduction against the checked-in SQL and an ephemeral demo database confirmed that accepted cost/warranty/editorial changes are left unchanged on an existing SKU (see `AUDIT_REPRODUCTIONS.json`). Complete and explicitly document the supported round trip so accepted data is not silently ignored. Evidence: [import SQL](/home/jimmy/Mansokar/supabase/migrations/20261025234654_foundation.sql:71), [spreadsheet fields](/home/jimmy/Mansokar/src/lib/spreadsheets.ts:4).
5. **Checkout has no itemized final review or server-priced quote before submission.** The order transaction correctly recalculates totals, but the checkout form does not display the cart lines, final subtotal, validated coupon discount and shipping-adjusted grand total for review. A coupon field exists without a validation/preview action. Evidence: [checkout form](/home/jimmy/Mansokar/src/components/forms.tsx:200).

## Remaining implementation checklist

### Foundation and real backend — specification sections 8, 10, 12

- [ ] Configure the dedicated Supabase environment and run the migrations and private bucket setup there.
- [ ] Verify signup/email confirmation, login/logout, expired-session refresh and administrator bootstrap with real accounts.
- [ ] Verify a signed-in ordinary member is denied every admin mutation through the actual HTTP application.
- [ ] Verify deployment/CI from a clean environment; the workflow file exists, but an executed hosted pipeline and production deployment are not evidenced here.

### Catalog, fitment and account behavior — sections 4, 5, 15

- [ ] Support multiple part numbers per SKU and their normalization/search/import handling; the current model has one `partNumber` string.
- [ ] Add structured generation, engine code/capacity, body and trim qualifiers wherever real fitment needs them. The present configuration is model + year + a single engine string; explicit mapping exists and is privacy-protected.
- [ ] Complete editable category hierarchy/sort controls and category landing content. Flat categories and filtered grids already exist.
- [ ] Save the member's active Garage vehicle server-side and restore it across devices; current active selection is a browser cookie. Add Garage editing and the specified guest-to-account vehicle merge. Saved-vehicle upsert/delete exists and avoids duplicate saved configurations.
- [ ] Complete address editing and convenient saved-address use during checkout; saving/deleting addresses already exists.
- [ ] Finish comparison behavior and supplied warranty rendering; continue to show only the active vehicle's fitment.
- [ ] Add the product-page governorate/area shipping estimator. The current product page links to checkout instead.
- [ ] Link product policy/warranty modules to merchant-approved content rather than hard-coded demo wording.
- [ ] Support admin-curated cross-sell relationships and their fitment filtering. Same-family alternatives already exist; purchased-together recommendations must remain absent until backed by curated data.
- [ ] Improve part inquiries so customers can describe a vehicle not already in the configuration dropdown. Add quote data and configured communication/status-update delivery; the current queue supports contact/description/photo and status changes.
- [ ] Complete the optional editorial guide listing/detail workflow if guides are included at launch. Generic CMS routes can render a published page, but there is no full guide collection/editorial system.

### Administration, content and imports — section 7

- [ ] Provide usable form-based administration for routine merchant work. Current validated JSON editors are functional but are not a complete product form, image manager or vehicle-mapping matrix.
- [ ] Add product duplication and remaining administrative CRUD workflows; the product endpoint currently performs an upsert rather than the full specified product workflow.
- [ ] Add the visual multi-vehicle selection/mapping interface and customer-fitment preview.
- [ ] Complete customer-record/support-request management. There is no customer-management module.
- [ ] Complete order details: line items, delivery area/rate snapshot, staff notes, human order number, shipping/tracking data and exports. Current admin order cards show basic customer fields, state/payment state and total.
- [ ] Add cancellation/return/refund operational workflows beyond changing status. COD collection is implemented; refund processing is not.
- [ ] Expand reports beyond the latest 500 non-demo orders: date ranges, trends, category/manufacturer analysis, coupon impact, cancellation/return metrics, reporting exports and margin only when cost is available.
- [ ] Add campaign/banner management and promotion scheduling where required. Sale prices and basic coupon dates/scope/redemption limits already work in code.
- [ ] Make all specified media/copy editable: homepage brand-card photos, logos, language strings, FAQ entries, guides and SEO fields. Current homepage brand images/logos are static paths; hero/model media settings accept local `/images/...` paths rather than a complete upload-and-select flow.
- [ ] Complete merchant settings for branding/contact usage, notification templates and approved payment-method feature flags. Current settings expose a subset of storefront copy; payment flags are read from the deployment environment.
- [ ] Fix import field preservation, improve the full import preview/error presentation, and add XLSX export if the CSV/XLSX round-trip format is retained. Current CSV/XLSX parsing, validation, grouped fitment rows and transactional upsert are implemented; export is CSV only.
- [ ] Make admin changes and their audit records atomic, or safely handle audit-write failures. Mutations currently occur before a separate audit-log insert, so an audit failure can report an error after a change was already applied.

### Checkout and fulfillment — sections 6, 12

- [ ] Add the checkout review/quote described above, delivery notes and merchant-approved tax/invoice presentation and COD limits.
- [ ] Configure real governorate/area coverage and approved rates. The seed deliberately does not invent a live shipping table.
- [ ] Add a human-readable order number. The current orders schema has UUIDs, an idempotency key and a secure public token, but no order-number field.
- [ ] Implement order-number tracking with verified proof such as OTP. `/track-order` currently explains how to use the private status link; it is not the specified verified tracking flow.
- [ ] Complete confirmation/status content and customer order details. The private confirmation page exposes only status/payment state/total; the heading always says the order awaits confirmation.
- [ ] Add manual tracking-number entry and shipment information. Carrier integration itself is optional; manual tracking support was requested.
- [ ] Add configured transactional order/inquiry notifications and the real operational fulfillment process.
- [ ] Run full guest/member order placement against the real backend, including retries, coupon rules, member-cart merge, removal/quantity persistence and admin fulfillment through delivery/COD collection.

### Online payments — section 6 and Phase 5

- [ ] Select/contract the payment provider(s), then implement each provider's actual adapter and hosted checkout.
- [ ] Implement verified raw-body signatures, freshness/replay defense, merchant/order/currency/amount matching and safe payment state transitions.
- [ ] Build approved pending-verification manual transfer/proof/reconciliation flows for InstaPay or wallets if those are chosen.
- [ ] Implement contracted installment conditions, fees, eligibility, cancellations and refunds.
- [ ] Implement full and partial refunds and end-to-end reconciliation/sandbox cases. The internal event function currently accepts full-order amounts and directly writes payment state; this is not a finished provider integration or out-of-order-event state machine.

The adapter interface and a repeated-event SQL test are groundwork. There is no public online-payment webhook endpoint or implemented gateway. Keeping these methods unavailable is correct until implementation and merchant approval are complete.

### SEO, localization and operations — sections 9–11

- [ ] Finish localized metadata for brand/model/category/CMS pages and product SEO overrides; several current page titles are derived from URL slugs.
- [ ] Expand sitemap coverage to the published category/editorial content, remove missing/thin CMS pages appropriately, and complete breadcrumb links/structured data.
- [ ] Apply noindex consistently to internal filter/search combinations beyond `/catalog`.
- [ ] Complete Arabic/English validation messages, raw order/payment status labels, specification labels and transactional content. Most public labels are translated; several errors/admin/status strings remain English.
- [ ] Add search synonyms, consistent normalization across JavaScript and SQL, and category suggestions. Product autocomplete and part-number priority already exist.
- [ ] Tune search and fitment queries using realistic data and query plans. The search WHERE clause uses normalized substring matching; merely having a full-text index does not prove the active filtering query benefits from it. Batch repeated fitment lookups where needed and finish catalog/image cache behavior and responsive gallery media.
- [ ] Configure and verify opted-in analytics on staging. Consent UI/storage and event recording exist, but analytics is disabled in this checkout.
- [ ] Finish upload retention/cleanup, the approved data-retention policy and processing of deletion requests. Account export and a deletion-request queue exist; the queue does not execute a complete deletion workflow. Evaluate external malware scanning where feasible.
- [ ] Complete rate-limit/abuse coverage for catalog searches, private order/status access and sensitive exports, and configure trusted proxy/IP handling. Some API actions, suggestions and uploads already have limits.
- [ ] Configure monitoring/alerts, backups and a tested restore process; implement meaningful readiness checks beyond process liveness.
- [ ] Perform representative load/CWV checks, real-device/manual keyboard/screen-reader testing and external security review. Current evidence includes a 20-request local demo smoke run and automated axe checks, not production certification.
- [ ] Deploy staging/production, connect the domain and support channels, and approve the production cutover from demo data.

## Required merchant decisions and content

These are external inputs, not all coding tasks: final store identity/assets; the real catalog/photos/fitments; nationwide shipping coverage/rates; tax/invoice/COD rules; approved returns/warranty/privacy/terms/shipping text; support information; payment/installment-provider contracts and credentials; and an operational fulfillment process. Provider implementation still requires development after credentials are supplied.

## Acceptance tests still needing completion

The following mandatory scenarios are not fully demonstrated by the current test suite:

- Real HTTP guest checkout and member Garage/account persistence against Supabase Auth, PostgreSQL and Storage.
- Regular authenticated member denial of all admin APIs, not only simulated database-role checks and an unauthenticated browser denial.
- Two separate guest orders and attempts to retrieve another guest's protected details through the actual application.
- An existing coupon whose expiry has passed; the current test passes a missing code named `EXPIRED`, which does not independently prove the expiry condition was exercised.
- Payment-provider success/failure/retry/refund/signature cases; current replay testing invokes the internal SQL recorder directly.
- Large-catalog item retrieval, export completeness, concurrent requests/cart synchronization and production-scale behavior.

Already supported by local tests/evidence: selected-vehicle fitment privacy and engine mismatch, SQL totals/shipping/coupon handling, repeated order submission, transactional import rollback, upload sanitization, production demo guards, locale/vehicle preservation, distinct product cards, correct-item Add to cart/Buy now behavior and responsive browsing.

## Recommended completion order

1. Configure a dedicated staging backend and verify Auth/Storage/admin access.
2. Fix real-catalog rendering, SKU retrieval, comparison warranty and import field preservation.
3. Complete the checkout quote/review, order administration, human order numbers and verified tracking.
4. Complete practical admin/CMS/notification workflows and the remaining catalog/account requirements.
5. Integrate the approved payment provider(s), then verify reconciliation/refunds.
6. Load approved merchant content and run full staging, security, performance and operational launch checks.

No marketplace, inventory-count system, fifth brand or image-based search is required; those are explicitly outside v1 scope. Optional carrier integration, decorative motion and conditional purchased-together content should not be mistaken for mandatory launch blockers.
