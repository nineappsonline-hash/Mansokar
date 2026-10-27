# Mansokar / DriveParts

A bilingual, RTL-first automotive parts application built from `MANSOKAR_MASTER_SPEC_V2.md`. DriveParts is the temporary visual identity of Mansokar, not another merchant.

## Start

Requires Node.js 22.13+ and npm. From this directory:

```bash
npm run setup
```

Open http://localhost:3000. Arabic is the default; English is `/en`. Without Supabase configuration, the app is an explicitly labeled, read-only demo. Vehicle selection, search, compare and local cart work. Account, admin, inquiry and checkout writes fail closed; no fake successful orders are generated.

## Database and authentication

1. Copy `.env.example` to `.env.local`.
2. Use your own Supabase project, or start a local stack with `npm run db:start` (Docker required), then `npm run db:reset` to apply migrations and demo seeds. Do not reset a live database. For a new hosted project, review and apply `supabase/migrations/` in order and optionally `supabase/seed.sql` on staging only.
3. Fill the project URL, publishable key and **server-only** secret key. Never prefix the secret with `NEXT_PUBLIC_`.
4. In Supabase Auth configure site URL / redirect URLs. Set the confirmation email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
5. Create and verify an account. Enable its single admin role with:

```bash
node --env-file=.env.local scripts/bootstrap-admin.mjs VERIFIED_USER_UUID
```

Visit `/admin`. The server checks the verified Supabase user and `admins.enabled` on every operation. Customer-editable metadata never grants admin access. Remove/revoke access by disabling the database allowlist entry.

Demo configurations and SKUs are fictional test fixtures, not validated automotive fitment. Real brands and model names are for navigation examples. Photographs illustrate models rather than specific year/engine configurations. Credits: `/en/credits` and `docs/ASSETS.md`.

Private image storage setup:

```bash
node --env-file=.env.local scripts/setup-storage.mjs
```

Buckets remain private. The server decodes/re-encodes raster uploads and strips metadata. Inquiry previews require admin authorization and short-lived signed URLs. Configure scheduled removal of unclaimed uploads older than 24 hours before production.

## Checkout

COD is disabled until `COD_ENABLED=true`. Before enabling orders, publish merchant-approved privacy, terms and returns content through Admin CMS and configure enabled shipping areas/rates in Admin Shipping. Every product defaults to demo content; **production always refuses demo SKUs**, regardless of `ALLOW_DEMO_CHECKOUT`. Sandbox demo orders require development mode, a database and explicit `ALLOW_DEMO_CHECKOUT=true`.

The PostgreSQL transaction recalculates prices, discounts and delivery, snapshots order items, locks coupons, and handles idempotency. Unknown areas fail closed. A cryptographically random 64-character confirmation capability exposes only order status/payment state/total, not contact or address. Protect this link like a password. Order-number/OTP tracking remains unavailable until a contact provider is chosen.

Online cards, InstaPay, wallet and installment methods remain unavailable. `src/lib/payments.ts` defines the adapter boundary; no provider, transaction or webhook signature is fabricated. There is no exposed online webhook endpoint. The internal payment-event function deduplicates verified provider events for a future adapter. COD collection is an explicit admin action after delivery.

Optional first-party analytics is disabled by default. Enable `ANALYTICS_ENABLED=true` only after reviewing consent and retention. Visitor opt-in is required. Counts contain no contact details, search text or session identifiers; purchase counts come only from non-demo, consented, verified COD collection. No browser purchase event is accepted.

## Checks

```bash
npm run typecheck
npm test
npm run build
# With npm run dev running in another terminal:
node scripts/browser-check.mjs
node scripts/accessibility-check.mjs
```

Database tests apply the actual SQL migrations and seed to embedded PostgreSQL (PGlite), and exercise constraints, privileges, Garage RLS, rollback, coupons and idempotency. They do not substitute for a full Supabase Auth/Storage integration test. Browser evidence is in `docs/BROWSER_RESULTS.json` and `docs/screenshots/`.

Webpack is selected because this environment prevents Turbopack worker socket creation. All packages are pinned; lockfile and CI are included.

## Administration and imports

The admin supports product creation/editing/publishing and sale prices; manufacturer/category management; exact multi-vehicle mappings; model/configuration editing under four locked brands; orders/status transitions and COD collection; inquiry statuses; shipping; coupons; bilingual CMS; storefront copy; CSV/XLSX dry-run and transactional import; catalog CSV export; paid-versus-placed metrics excluding demo orders.

Editors use validated JSON as a first implementation of the admin interface. Prices are integer **piasters** (100 = EGP 1). Import templates are exported from Admin Import. Validate/dry-run before committing; the server always revalidates. SKU is the upsert key. A failing row rolls back the entire batch. Imports do not delete products. CSV/XLSX supports repeated SKU rows with a vehicle_config_id per row; identical product fields are grouped, conflicting repeated fields are rejected. Exact mappings commit in the same transaction. Avoid opening untrusted CSVs in software that automatically executes formulas; exports neutralize formula prefixes.

## Deployment and remaining work

Deploy the Next.js app on a compatible Node host (for example Vercel), add environment secrets, apply migrations and run staging checks. Do not deploy demo seeds to a live catalog. See `docs/LAUNCH.md`, `docs/IMPLEMENTATION.md` and `docs/ARCHITECTURE.md` for phase evidence, known limitations and merchant gates. Nothing is published automatically from this local checkout.
