# Live backend verification — 26 October 2026

Mansokar now uses its dedicated Supabase project `egcrsphvijzibaamwoes`, in the user-supplied account's existing Free-plan organization. The existing project was not changed. Region: `eu-west-1`.

Production: https://mansokar.vercel.app

- All eight checked-in migrations applied successfully; local and remote migration versions match.
- Existing fictional demonstration seed loaded. No real merchant policies or shipping rates were invented.
- Inquiry and catalog image buckets created as private, restricted to JPEG with a 5 MB limit.
- Production environment configured with a public publishable key and server-only secret key. No management token was deployed. The local ignored `.env.local` is mode 600.
- Auth site URL and exact confirmation redirects configured. Email confirmation remains required. The confirmation route supports PKCE code exchange and one-time token verification.
- Owner bootstrap configured for `mo.dowaik@gmail.com`. The account must sign up, verify its email and open `/admin` before receiving its first allowlist entry. Existing disabled administrator entries stay disabled. User-editable metadata cannot grant access.
- The live security advisor returned **no issues** at warning/error level.
- Production readiness and Arabic/English home/product pages return HTTP 200.

## Acceptance evidence

`CONFIRM_LIVE_QA=mansokar BASE_URL=https://mansokar.vercel.app node --env-file=.env.local scripts/live-backend-check.mjs` passes:

1. Published public catalog reads work; private costs, complete fitment mappings, orders, outbox and privileged mutations are denied to anonymous clients.
2. Real Supabase password authentication works, and one member cannot read or replace another member's profile.
3. Both buckets are private; anonymous download fails, while a short-lived signed URL works.
4. The website's one-time confirmation callback verifies a disposable email and establishes a session. The verification link is generated privately; no test email is sent.
5. Deployed HTTP login/logout, member admin denial (also after spoofing `user_metadata.role`), Garage selection, cart/address persistence, cross-member cart isolation and an audited admin shipping write work.

The test creates disposable QA users and an image, then removes them and their dependent records. The shipping fixture stays disabled and is removed. An actual route conflict was found: the dedicated `/api/cart` GET route shadowed POST saves handled by the generic route. POST now delegates to the authenticated, validated cart handler; the complete live check passes after deployment.

A separate transaction on real PostgreSQL verified server quotes, order snapshots and human numbers, separate guest tokens, fulfillment transitions and COD collection. Its test order/payment/shipping records were rolled back. This verifies database behavior; it is not a claim that public live checkout or payment-provider acceptance is complete.

## Remaining external setup

Custom SMTP, transactional email/SMS and payment gateways remain unchosen. Supabase's built-in Auth email configuration is present; broad public email delivery and production sender configuration are not verified. The owner still needs to register/verify the designated email. COD, demo checkout and analytics remain disabled in production. Approved merchant catalog, fitments, policies, shipping/tax rules and remaining project features are tracked in `COMPLETION_PROGRESS.md`.

## Update — 27 October 2026

Migration `20261026221333_merchant_workflows.sql` is applied (nine migrations total). It adds private immutable item-cost snapshots, category snapshots, reporting indexes, private support notes and audited campaign/recommendation management. Live security advisors remain clean at warning/error level.

The expanded live acceptance suite passes for report pages with temporary paid/unpaid order fixtures (both coupon and no-coupon joins), report CSV, product XLSX, private customer notes, nested bilingual CMS form saves, disabled campaign creation and recommendation/settings screens. It also verifies authenticated product-image upload, a private preview and saving bilingual image descriptions on a disposable draft SKU. Test records are deleted afterward; a separate cleanup check confirms no QA users, report orders, image products, CMS pages, shipping areas or coupons remain.

The protected maintenance acceptance test passes for unauthorized rejection, dry-run preservation, expired orphan upload deletion and recent upload preservation. Vercel reports the enabled cron definition `/api/maintenance` with schedule `17 2 * * *`. The first natural scheduled execution is still pending observation. Public bilingual browser checks and ten accessibility views also pass after deployment, with zero accessibility violations.

Owner registration/verification remains incomplete. No actual gateway, messaging provider, merchant catalog, shipping rate or legal policy was fabricated or enabled by this update.

## Further completion — 27 October 2026

Migrations `20261026223048_branding_categories_customers.sql` and `20261027063449_custom_vehicle_inquiries.sql` are applied (eleven migrations total). Customer Auth lookup runs through a narrowly projected private-schema function, checks the enabled administrator actor and is executable only through the service-only boundary; neither password hashes nor session credentials are returned. Ordinary/anonymous users are denied. Category cycles and incompatible generation/model/year edits are rejected by the database.

The expanded deployed suite passes email lookup for an account without a profile, ordinary-member lookup denial, support profile editing, private editorial-media assignment/restore through the Branding form, and optimization of a signed catalog image. It also passes a customer-described vehicle inquiry form submission (no exact vehicle/fitment mapping is created) and the shipping/coupon/vehicle screens. Public browser tests verify two-product comparison minimums, Arabic brand titles, breadcrumb schema and category autocomplete navigation. Ten accessibility views report zero violations; the security advisor remains clean at warning/error level.

The Branding selector originally failed an exact-label acceptance check because its label wrapped all option text. It now has an explicit label/field association and the live form-save test passes. Test fixtures are deleted, including the custom inquiry, unpublished editorial content, media assignment, draft image product, report orders and QA accounts.

The user confirmed approved catalog/policies/rates are not ready and backup/monitoring services are not chosen. Checkout and unapproved payment/notification providers stay disabled. No production launch, external restore drill, natural cron execution or real-device/security certification is claimed by these checks.

## Final acceptance for this update

The deployed authenticated suite passes optional English-only and Arabic-only SEO override saves and personal-data export. The export contains the signed-in account identity, own cart/order items and paginated selected records, while excluding private costs, staff notes and order-access tokens; anonymous export is denied. Public checks pass preview noindex headers and homepage canonical URL normalization. Production dependencies have zero reported vulnerabilities in `npm audit --omit=dev --audit-level=moderate`; this is dependency-advisory evidence, not an external penetration-test certification.

Checkout remains disabled because the user confirmed catalog/photos/fitments, rates and policies are not ready. Payment/messaging services remain unchosen, as do backup and monitoring providers. The owner still needs to register/verify the specified administrator email. Final launch data/legal review, external service configuration, isolated restore and representative production/manual acceptance remain outstanding.
