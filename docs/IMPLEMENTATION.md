# Phase implementation and evidence

> Latest source-based review: [SPEC_GAP_AUDIT.md](SPEC_GAP_AUDIT.md). The progress descriptions below summarize implemented groundwork; they do not certify full phase acceptance.

The specification was followed in order: foundation, storefront, catalog, admin, checkout, provider boundaries, then launch hardening. The application is a working local implementation; complete production acceptance remains conditional on the items below.

## Phase 0 — Foundation: implemented, external integration verification pending

Files: package/lockfile, Next/TypeScript/Tailwind configuration, `.env.example`, `src/lib/db.ts`, `src/proxy.ts`, migrations, seeds, CI, admin/bootstrap scripts, README and architecture decisions.

Working: documented `npm run setup`; read-only demo without credentials; Supabase cookie clients and verified users; server allowlist for administrators; Arabic/English URLs and tokens. No role bypass, frontend secret or default admin password.

Verification: clean dependency installation, TypeScript, actual SQL migration/seed tests and production build. Full Supabase Auth integration is blocked by missing project configuration and inaccessible local Docker socket.

## Phase 1 — Storefront: implemented, final merchant visual review pending

Files: localized catch-all routes, shell/controls, CSS tokens, original demo illustrations, licensed model photography, Cairo font/license and image credits.

Working: cinematic sunset home, four equal brand photo cards, twelve model photo cards, year/engine configuration selection, responsive menus/footer, retained locale/query/vehicle state and reduced motion.

Verification: browser checks in AR/EN across all four brands; desktop and 390px mobile screenshots; no hero dropdowns or mobile overflow. The user subsequently supplied the approved visual reference. The homepage now uses the sunset/SUV composition, live brush-highlight heading, transparent header and four close-up grille cards; see REFERENCE_REDESIGN.md for assets and visual checks.

## Phase 2 — Catalog and fitment: core implemented

Files: public pages, catalog normalization/pricing, product media/gallery, comparison/cart controls, account/Garage and request forms, private upload handling.

Working: bilingual search/name/part-number normalization, filters and prices, premium product layout, actual-media-only thumbnails/zoom with keyboard/modal focus/swipe, explicit three-state fit check, same-family alternatives/comparison, member Garage/profile/addresses/orders, guest selection, private-photo inquiries, account export and an administrator-reviewed data-deletion request queue. Customer projections exclude cost and complete fitment mappings.

Verification: shared Opel/Peugeot SKU privacy, wrong-engine unknown state, no vehicle prompt, cart actions, mobile layouts and safe image decoding. Remaining scale/feature refinements are listed in LAUNCH.md; live Garage/account/Storage behavior needs configured staging.

## Phase 3 — Admin and imports: core implemented

Files: protected admin, authorized API handlers, spreadsheet parser/exporter, validation, operations/content migrations.

Working: product CRUD/publishing/sale prices; taxonomy; vehicle/configuration and exact multi-vehicle mapping; ordered image metadata/upload; shipping/free threshold; coupons; order and inquiry statuses; CMS/storefront copy; basic non-demo metrics; CSV/XLSX template, dry-run with row errors, grouped SKU/fitment rows, transactional upsert and formula-safe export.

Verification: ordinary Data API roles cannot access admins, full mappings or privileged functions; invalid import/fitment mapping rolls back; CSV round trip and conflicting duplicate detection pass. Admin is a functional JSON-editor interface. Detailed CRM/reporting/refund UI is not complete.

## Phase 4 — Checkout and orders: core implemented, end-to-end integration pending

Files: checkout controls, server input validation, order transaction, coupon/shipping configuration and COD reconciliation.

Working: guest/member checkout, persistent local cart and member-cart merge, server-derived integer prices, effective area rates, free-shipping threshold, coupon dates/limits/category scope, exact vehicle snapshots, random private confirmation tokens, idempotency and audited status history. COD is explicitly enabled, remains unpaid until collection, and cannot be marked collected before delivery. Published policies are required.

Verification: unknown area/invalid coupon/demo guard, server totals, repeated checkout token, mismatched idempotency payload denial, rollback and repeated COD reconciliation. Live browser order placement awaits configured staging data and policies.

## Phase 5 — Online payments: safely blocked by merchant/provider selection

Files: `src/lib/payments.ts`, internal payment-event function and tests.

Working: typed adapter boundary; unsupported online methods unavailable; no fake charge, signature or webhook endpoint; transactional verified-event replay deduplication prepared and tested. Actual provider success/failure/refund acceptance cannot run without contracts/credentials and provider-specific adapter implementation.

## Phase 6 — Launch quality: local hardening implemented, launch incomplete

Files: database search/analytics migrations, consent UI and anonymous event collection, locale metadata/canonicals/hreflang, robots/sitemap, security headers, body/upload bounds, private data grants/RLS, safe instrumentation/health endpoint, test suite/browser evidence, deployment and asset documentation.

Verification: TypeScript; ten AR/EN page audits with zero automated axe WCAG violations; a 20-request local production smoke run (not production load certification); eleven automated scenarios (including one multi-assertion PostgreSQL integration test); production build; AR/EN browser flows/mobile overflow; dependency audit. No customer PII is deliberately sent to analytics or error instrumentation. First-party analytics consent/collection and database-side search/pagination are implemented; representative scale validation, monitoring integrations, legal approval, restore drills, actual payment reconciliation and launch reviews remain in LAUNCH.md.

Next required environment step: configure a dedicated Supabase staging project and run the documented Auth/Storage/checkout acceptance flows. Merchant gates are not represented as completed features.
