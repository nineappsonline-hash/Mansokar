# Deployment and operational launch gates

## Required merchant inputs

- Final Mansokar/DriveParts identity and approved hero/logo/media. Wikimedia model photo licenses are recorded and attribution is shown; validate the final chosen imagery and exact model/generation presentation.
- Real SKU prices, tax treatment, manufacturer claims, warranty, product photos and verified exact fitment. All seeded SKUs/configurations are fictional.
- Governorate/area coverage, rates, fulfillment process, support channel, return/cancellation/warranty terms and legal/privacy review. Publish approved policies through CMS.
- Selected/contracted online provider(s), merchant credentials, sandbox account and documented webhook signature/refund semantics. These are unavailable rather than simulated.
- Contact verification provider for OTP tracking and communication notifications. Until configured, tracking uses only an unguessable private status link.

## Staging setup

1. Provision a dedicated Supabase staging project or accessible local Docker stack. Apply all migrations in chronological order; seed demo data only on staging.
2. Set environment variables using the example. Keep secret credentials on the server. Restrict hosting access while reviewing.
3. Configure email confirmation templates and allowed callback URLs; verify sign-up, confirmation, login, refresh, logout and ordinary-member denial of admin APIs.
4. Bootstrap exactly the authorized administrator. Confirm disabling `admins.enabled` immediately blocks new admin mutations.
5. Run the private bucket setup script; ensure no public policies expose inquiry images. Test upload, image sanitization, short-lived admin preview and denied guest access.
6. Configure real delivery rates and publish merchant-approved policies. Enable COD only when fulfillment is ready. Development demo checkout requires explicit flags; production cannot order demo products.
7. Test product editing/storefront update, complete fitment privacy, wrong-engine behavior, Garage/account persistence, guest checkout, duplicate submissions, coupons, unknown areas, and COD collection/reconciliation through the actual stack.
8. Run all automated tests, production build and browser checks. Test keyboard, screen reader, RTL, reduced motion and representative phone/tablet/desktop devices.
9. Connect host error/uptime monitoring and redact private order capability paths from host access logs. `/api/health` is a basic process liveness endpoint, not a database readiness probe. `src/instrumentation.ts` emits error digests and route templates without request bodies, headers, contact details or public tokens.
10. Configure database backups and perform a staging restore drill. Set retention/deletion policies and implement the merchant-approved data-subject request process.

## Provider acceptance before enabling online payments

Implement one adapter with hosted checkout and provider-documented signature verification against the raw request body. Reject mismatched currency/amount/order/merchant, unknown references, stale signatures and invalid state transitions. Call the internal transactional event recorder only after verification. Test success, decline, cancellation, timeout, duplicate/reordered delivery, refund and partial refund. Reconcile against the provider dashboard. No online HTTP webhook is exposed in this implementation.

## Explicit remaining engineering / verification limits

- No connected Supabase project was named Mansokar, and unrelated projects were not modified. No live project was selected, and local Docker socket access is denied in this environment. Auth, Storage and database HTTP integration therefore require staging verification. SQL migrations/constraints/privileges are exercised using embedded PostgreSQL, not a fake repository.
- Admin uses validated JSON editors, not the final polished form-based editing experience. It supports core operations but not a complete customer CRM, scheduled campaigns, refund UI, analytical charts/date-range reporting or carrier integrations.
- Catalog results now use database-side normalized search, exact-number priority, filters, counts and bounded pagination, with a full-text index and debounced suggestions. The seed contains eight products; production query plans and throughput still need representative catalog/load tests. Auxiliary cart/compare/catalog exports currently use bounded reads and need pagination or ID-specific hydration for very large catalogs.
- Structured specs and optional bilingual warranty/editorial fields are supported. Curated cross-sell relationships, generation/trim hierarchies beyond exact engine configuration strings and full editorial guide listing remain to be expanded.
- First-party anonymous analytics is implemented and disabled by default (`ANALYTICS_ENABLED=false`). It requires visitor consent; it stores event names/product IDs/amounts without contact details, search text or session identifiers. Browser purchase events are rejected; non-demo COD purchase counts are written once after verified collection when the order captured consent. Validate consent/retention and dashboard counts on staging before enabling. No external GA4 destination is configured.
- Product-image decoding removes metadata and executable formats; no external malware scanner is configured. Private uploads require a scheduled cleanup/retention job for unclaimed/expired files.
- Distributed rate limits use PostgreSQL when configured; the no-database demo has process-local limits. Configure trusted proxy/IP headers and abuse controls on the deployment host.
- Current coupon rules cover one coupon/order, global and per-customer caps (account or supplied phone), category scope, dates, fixed/percentage values and product sale pricing. Phone-based limits are not identity verification. Tax/invoice rules await merchant decisions.
- No production deployment, production load certification, external security review, backup restore drill or accessibility certification has been performed.

Do not treat implementation or passing local checks as approval to launch a live store.
