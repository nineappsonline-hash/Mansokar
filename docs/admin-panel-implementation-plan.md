# MOPC Admin Panel — Implementation Plan
Status: In progress · Branch: `design/mopc-figma-home-2026`
Scope: admin interface and operational functionality; **inventory management is explicitly excluded**.

## Non-negotiables
- Do not introduce stock quantities, reservations, inventory movements, low-stock alerts, or inventory deductions.
- Preserve existing products, orders, payments, and vehicle compatibility data. Do not create live orders or trigger payment captures during testing.
- Responsive admin for desktop, tablet and mobile; Arabic-first, clear terminology, accessible contrast, keyboard navigation, 44px touch targets.
- Preserve the MOPC palette: navy #101D29, lemon #C9E86D, pale #F5F7F8. Maintain existing public storefront.
- Deliver through feature branch, preview, test, then production approval. Never silently deploy to production.
- Existing `products.specs` keys `car_years:<model-id>` are the canonical product applications; do not assume `product_fitments` contains the live data.

## Phase 0 — Audit and acceptance baseline (P0)
1. Inventory all admin pages, actions, API handlers, database functions, and role checks.
2. Map each action: user entry → client validation → API authorization → database write → audit log → UI feedback.
3. Capture desktop/mobile states: default, empty, loading, error, success, forbidden, long tables, slow network.
4. Identify safe read-only checks versus mutations requiring isolated staging.
**Exit:** action matrix, prioritized confirmed bugs and unknowns, baseline screenshot set.

## Phase 1 — Admin design system and navigation (P0)
- Arabic-first admin terminology; consistent typography and spacing; no technical status strings exposed.
- Group nav by Daily work (overview, orders, messages, inquiries), Catalog (products, vehicles, recommendations), Marketing (campaigns, promotions, hero), Content (CMS, SEO), Reports, Settings (shipping, payment readiness, branding).
- Collapse groups; highlight active item; accessible nav search; responsive mobile drawer with focus management.
- Reusable badge, table, filters, empty/error state, confirmation dialog, form field, toast.
**Exit:** all existing modules reachable from desktop/mobile without broken deep links; no function lost.

## Phase 2 — Dashboard and actionable work queue (P0)
- KPI cards: new orders, pending payment verification, processing/shipping, completed, paid collections, unresolved inquiries.
- Clearly distinguish order value from confirmed collected revenue.
- Action queue links directly to relevant order, transfer or inquiry.
- Date range and timezone labels (Africa/Cairo); no invented or mixed totals.
**Exit:** figures reconcile with underlying read-only queries.

## Phase 3 — Orders, payment and fulfillment (P0)
- Search/filter/paginate orders by ID, phone, status, payment status, date.
- Dedicated order detail: customer, items, totals, payment proof, shipping, notes, event timeline.
- Human-readable order/payment statuses and guarded state transitions.
- Transfer approval/rejection: idempotency, authorization, audit trail; COD collection safeguards.
- Shipping changes must not retroactively change historical order totals.
- Add clear confirmation for irreversible actions and distinguish failure from success.
**Exit:** negative tests and authorized transitions pass in isolated environment.

## Phase 4 — Products and vehicle fitment (P0)
- Product list with search, filter, edit, image and publish states; no inventory controls.
- Editor tabs: essentials, pricing, fitment, images, details, SEO.
- Read/write compatibility through canonical `products.specs`; audit all import/export paths.
- Validate model/year coverage and warn on broken references.
- Preview before publish; spreadsheet import validation and row-level errors.
**Exit:** test fitment for existing supported models and years only.

## Phase 5 — Customers and inbox (P1)
- Customer profile, orders, addresses where available, inquiries and private notes.
- Unified inbox for contact messages and part requests; triage status and ownership where supported.
- Data minimization, export authorization and access logging.
**Exit:** users only see records/actions permitted by their role.

## Phase 6 — Marketing, content, reports, settings (P1)
- Consolidate banners, promotions, hero and recommendations with desktop/mobile preview.
- Coupons: dates, eligibility, limits and correct quote computation.
- Reports: orders vs paid collections vs contribution; avoid calling contribution net profit.
- Separate safe store settings from sensitive payment/provider settings; preserve secrets server-side.
**Exit:** reporting reconciles, preview states and validation pass.

## Phase 7 — Roles, security, observability (P0 before launch)
- Review `requireAdmin`, every API endpoint, DB RLS, RPC permissions, and authorization on sensitive actions.
- Review existing `admin_audit_logs`, `order_status_events`, `payment_events`; reuse them before adding new tables.
- Record actor/time/before-after where appropriate, without exposing secrets or sensitive payment data.
- Rate limits, input validation, CSRF/origin checks and idempotency on payment operations.
**Exit:** privilege escalation and duplicate payment tests fail safely.

## Phase 8 — QA and rollout (P0)
- Desktop 1440/1280, tablet 768, mobile 390/360, keyboard and screen reader smoke checks.
- Build/lint/typecheck; test with real read-only data and isolated mutation fixtures.
- Verify preview and rollback strategy; get explicit approval before production promotion.
**Exit:** all P0 criteria green, no unresolved critical bugs.

## Work log
- [x] Initial source audit of admin navigation, orders, products, customers, reports and checkout readiness.
- [x] Initial database read-only inspection of order/payment/audit tables and product fitment storage.
- [ ] Phase 0 full action matrix and permission audit.
- [ ] Phase 1 admin navigation and responsive terminology rollout.
- [ ] Phase 2 onward.

## Explicit exclusions
No inventory management module, stock counts, stock reservation, low-stock alert, or stock-related UI.
