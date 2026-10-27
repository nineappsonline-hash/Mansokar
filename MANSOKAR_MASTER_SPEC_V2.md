# MANSOKAR — Automotive E-commerce Master Specification

> Version 1.0 | Market: Egypt | Working brand: **Mansokar** | Temporary visual logo: **DriveParts** | Primary language: Arabic (RTL), secondary English (LTR).
>
> This document is an implementation brief for an AI coding agent. Build a working commerce application, not a static mockup. Never assume an integration is live without credentials, onboarding and tests.

## 1. Product vision and fixed decisions

A premium, cinematic, single-merchant automotive parts store for **Opel, Peugeot, Citroën and MG only**. Sell **new genuine OEM and new aftermarket** parts. All products have visible prices. Products from different manufacturers are separate SKUs/product pages. No multi-vendor marketplace, no customer-facing inventory counts and **no stock-management system in v1**. Orders can be placed without an account. Offer optional accounts and My Garage.

Launch with clearly labeled **demo products**, with a safe switch preventing fake demo checkout in production. Ship nationwide across Egypt; shipping fees are configured by governorate and area. Accept cash on delivery, bank cards, InstaPay, wallets and installment providers **only through properly integrated, approved providers**. Payment providers and installment companies remain to be selected; do not invent API capabilities or mark a transfer paid automatically.

### Non-negotiable scope
- Four brands only. Admin cannot add a fifth without an explicit future product decision.
- Home page: **four cinematic brand cards**, replacing category cards; **no brand/model/year dropdowns in the homepage hero**.
- Brand card → **model selection page**, with a photographic card for each car model → year selection → compatible products. Variant/engine selection is required where compatibility demands it.
- A product can map to many vehicles in admin, but customer copy displays **only compatibility with their selected/saved vehicle**; never list all cross-compatible vehicles to customers. For visitors without a selected vehicle, show “Select your car to check fitment”, not an unsupported compatibility assertion.
- Search by part name, part number, car selection and category browsing. **Image-based search is out of scope**.
- Products from different manufacturers are separate listings. Support comparison and discounts.
- No staff role tiers in v1: one administrator role, but enforce secure admin access.
- Arabic/English bilingual, responsive, accessible, SEO-oriented.

## 2. Visual direction and reference

Use the previously approved **DriveParts sunset mountain road / SUV** mockup as the visual reference (provided in the conversation). Do not hard-code that composite screenshot as the UI; rebuild all text, controls, brand cards and responsive layouts as real accessible components. The generated image is a *concept*, not a license for trademarked imagery. Use licensed photography and approved logos/brand assets.

### Design tokens (proposed; configurable)
- Charcoal background `#101116`, deep surface `#191B21`, elevated surface `#25262C`.
- Warm amber primary `#F6A800`, amber highlight `#FFC247`, warm off-white `#F8F6F2`.
- Muted text `#B8B5B0`, subtle borders `rgba(255,255,255,.12)`, error `#D84A42`, success `#27B37D`.
- Search button: amber by default (avoid an unrelated bright red accent from concept art unless approved).
- Fonts: Arabic **Cairo** or **IBM Plex Sans Arabic**, Latin **Inter**; self-host where licensing allows. Avoid rasterized Arabic text.
- Desktop hero: cinematic full-bleed photo, dark scrim for contrast, brand story, one search field, clear CTA. Header with logo, catalog, offers, guides, account, cart and language toggle.
- Four equal-weight photo cards: **Opel / Peugeot / Citroën / MG**; use correct licensed logo, realistic matching vehicle photo, hover zoom/amber outline, accessible CTA. Mobile: 2-column cards or single-column if readability requires.
- Microinteractions: 150–300ms; restrained parallax only on capable devices, `prefers-reduced-motion` support, lazy loading and no scroll-jank.
- Secondary sections: popular parts, current offers, how it works, trust/delivery info, “Can't find your part?”, FAQs and footer. These do not replace the four brand cards.
- Consistent cinematic premium treatment for catalog, product pages, checkout and admin (admin prioritizes legibility over decorative photography).

## 3. Information architecture and routes

Use locale-aware URLs: `/ar/...` and `/en/...`; preserve equivalent page on language switch. All slugs stable, ASCII where practical.

| Route pattern | Purpose |
|---|---|
| `/[locale]` | Home hero + four brand cards + discovery |
| `/[locale]/brands/[brand]` | **Photo model cards** (Astra, Corsa etc. only if valid for selected brand); search within models |
| `/[locale]/brands/[brand]/[model]` | Select production year; if necessary engine/generation/trim |
| `/[locale]/catalog` | Search results, filters, sort, category browsing |
| `/[locale]/categories/[slug]` | Category landing and product grid |
| `/[locale]/products/[slug]` | SKU detail, price, maker, OEM/aftermarket, photos, fitment status, compare, cart |
| `/[locale]/compare` | Side-by-side comparable products |
| `/[locale]/offers` | Active offers |
| `/[locale]/cart` | Cart |
| `/[locale]/checkout` | Guest/member checkout, delivery and payment |
| `/[locale]/order/confirmation/[publicToken]` | Secure order confirmation (no personal details exposed by predictable IDs) |
| `/[locale]/track-order` | Guest tracking via order number plus verification (OTP or other secure proof) |
| `/[locale]/account` | Account profile, addresses, orders |
| `/[locale]/garage` | Saved vehicles |
| `/[locale]/request-part` | Unavailable part inquiry + photo |
| `/[locale]/guides`, `/[locale]/guides/[slug]` | Optional editorial SEO guides (CMS-managed) |
| `/[locale]/about`, `/[locale]/contact`, `/[locale]/faq` | Informational |
| `/[locale]/policies/{privacy,terms,shipping,returns}` | Policies |
| `/admin` | Protected admin overview and modules |

All navigation, filtering, deep links and back button behavior must function. Breadcrumbs and Arabic RTL layout on every public page.

## 4. Core customer flows

### 4.1 Vehicle-first shopping
1. Home → choose one of four brand cards.
2. Brand page → model cards with accurate model images and names.
3. Model page → choose year. If year alone does not disambiguate fitment, request engine displacement/code, generation, body type or trim as needed.
4. Store selection in session and optionally Garage. Show compatible catalog only when fitment is verified against the selected vehicle configuration; label uncertainty explicitly.
5. Filter by category, part manufacturer, OEM/aftermarket, price, availability of offers; sort by relevance, price, newest.
6. Product detail → show “Fits your selected [brand/model/year/config]” only when compatibility mapping is explicit. Do **not** show other compatible models even though admin supports them.
7. Add to cart → checkout → shipping fee calculation → payment → confirmation/tracking.

### 4.2 Other discovery flows
- Global search: Arabic/English name synonyms, exact and partial part numbers, normalized punctuation/spaces; suggest matching SKUs/categories.
- Category browsing: choosing a category without a car allows browsing, but fitment stays “Not yet checked”.
- Part-number search: prioritize exact normalized matches and avoid assuming a part number alone guarantees fitment.
- Can't find part: form includes contact, brand, model, year, optional engine/trim, part description, optional image, consent, and admin inquiry queue; send status updates when communication provider is configured.

### 4.3 My Garage
Members can save multiple vehicles with brand/model/year plus relevant engine/generation configuration, choose an active vehicle, edit/delete, and view relevant parts. Guests may maintain a temporary selected vehicle in a cookie/session. Account merge on login must avoid duplicates.

### 4.4 Comparison
Compare 2–4 products from the same meaningful product family; show price, manufacturer, genuine/aftermarket, warranty (if provided), specs and **fitment for active vehicle only**. No misleading cross-family comparisons.

## 5. Product catalog and compatibility data

### Product data
- Internal SKU (unique), bilingual name/description, slug, category, part number(s), manufacturer, condition=new, classification=OEM/aftermarket, list price EGP, sale price (optional), tax handling, photos/alt text, specifications, warranty details, shipping attributes (optional), published/draft, SEO fields.
- Product manufacturer and car brand are **different concepts** (e.g. Bosch part for Opel).
- Each manufacturer offering is a distinct product with its own SKU and price; optionally group related alternatives by `part_family_id` for comparison.
- No quantity-on-hand fields, low-stock alerts, reservations or stock deductions in v1. The merchant must operationally confirm fulfillment. Avoid “in stock” claims without reliable availability data. Optional admin `orderable` toggle can disable ordering a SKU without constituting inventory management.

### Fitment model
`vehicle_brand → vehicle_model → vehicle_generation (optional) → vehicle_configuration (year, engine code/displacement, body/trim where needed)`; map products via `product_fitments` to configurations or carefully scoped compatibility rules with inclusive year ranges. Validate overlaps, ensure a product's claim is backed by a matching rule, and preserve exact configuration on each order item. **Never infer fitment solely from model + year if engine/trim matters.**

### Categories (editable seeds)
Filters, brakes, engine, cooling, suspension, electrical, ignition, belts, lighting, oils/fluids (only if shipping rules permit), body/accessories. Do not present unsupported category inventory as real.

## 6. Checkout, pricing, shipping and payment

- Cart supports quantities, delete/update, persistent guest cart, merge on sign-in; server calculates totals from database, not browser prices.
- Guest checkout: full name, verified contact channel as needed, phone, governorate, area, detailed address, delivery notes; account creation optional.
- Shipping rates: admin-configured governorate + area price table, effective dates and enabled/disabled coverage; fail closed with clear message when area not configured. Free shipping thresholds/promos configurable.
- Discounts: fixed/percentage coupon, scope, dates, max redemptions, per-customer rules, stacking policy, server-side validation and idempotent redemption.
- Payment method selection: **COD**, **card**, **InstaPay**, **wallet**, **installments**. Online methods require a chosen licensed payment partner and merchant account; build a provider adapter and feature flags. No fabricated payment screens that pretend to charge.
- For manual InstaPay or wallet transfers, if approved, use pending-verification status, collect reference/proof securely, and require admin reconciliation; never auto-mark paid on customer screenshot alone.
- Installment availability, fees, down payment, eligibility and refund handling must come from the actual contracted provider; do not promise installments until integration approved.
- Payment webhooks: verify signatures, use idempotency keys, immutable transaction records, replay defense, secure reconciliation. COD order is `payment_pending` until collection.
- Orders: `pending_confirmation → confirmed → processing → shipped → delivered` with `cancelled/returned` branches; separate payment state `unpaid/pending/paid/failed/refunded/partially_refunded`. Maintain audit history.
- Prevent duplicate orders from repeated clicks, refreshes or webhook retries. Protect guest tracking with verification; never expose order details through guessable identifiers.
- Define merchant-approved cancellation, return and warranty policies before production launch; display clearly during checkout. Shipping carrier integration optional; manual tracking numbers supported.

## 7. Admin panel (one administrator role)

Admin-only routes guarded on server with verified admin identity; all mutations authorized server-side. Modules:

1. Dashboard: orders, revenue, AOV, coupon impact, sales trends, top categories/manufacturers, estimated margin **only if product cost data exists**; clearly distinguish paid vs placed orders and exclude demo data.
2. Products: create/edit/duplicate/publish, photos, OEM/aftermarket, manufacturer, categories, prices, discounts, searchable part numbers, `orderable` toggle.
3. Fitment matrix: select one or many brands/models/years/configurations for each SKU; bulk mapping, validation and preview of customer fitment result; admin sees all mappings, customer sees only selected vehicle.
4. Vehicle catalog: manage model photo cards, years, generations, engine configurations under the four locked brands.
5. Orders: statuses, customer/delivery details, payment reconciliation, shipping fees, notes, refund/cancel workflows, export.
6. Customer records: guest/member orders and support requests with privacy controls.
7. Part requests: view photo, contact requester, mark pending/quoted/resolved/closed; quoted price does not create a public product automatically.
8. Promotions: coupons, sale prices, campaign banners, eligibility rules.
9. Shipping: governorates, areas, rates, coverage, free shipping settings.
10. CMS: home hero assets/copy, brand/model cards, FAQs, policies, guides, SEO metadata.
11. Reporting: date ranges, revenue, orders, average order, gross margin only when cost captured, cancellation/return metrics, CSV export.
12. Settings: language strings, brand/logo, notification templates, payment provider flags, contact details.

### Bulk import/export
CSV/XLSX template with bilingual product fields, prices, manufacturer, OEM/aftermarket, category, part numbers and multiple vehicle-fitment rows. Preview → validate → dry run → import in transaction/batches → detailed error report; idempotent upsert keyed by SKU, no accidental deletion. Export same format. Use demo data seed isolated from live data.

## 8. Technical architecture

Recommended stack: **Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui + Motion**, PostgreSQL via **Supabase**, Supabase Auth for members/admin, Supabase Storage for images, deployment to Vercel or comparable platform. Use a typed ORM/query layer with SQL migrations, Zod validation, React Hook Form, next-intl (or equivalent) for localization. Use server components where beneficial, and server actions/API routes with explicit authorization and validation. Avoid storing secret keys in client code.

### Suggested relational schema
- `profiles` (user_id, name, phone, locale, timestamps)
- `admins` (user_id, enabled, created_at) — locked-down server-side authorization
- `vehicle_brands` (id, slug, display_name, logo, enabled; seed four only)
- `vehicle_models` (id, brand_id, slug, bilingual name, image, sort_order)
- `vehicle_generations` (id, model_id, name, year_start, year_end)
- `vehicle_configs` (id, model_id, generation_id nullable, year, engine_code nullable, engine_capacity nullable, body nullable, trim nullable)
- `garage_vehicles` (id, user_id, vehicle_config_id, nickname, is_active)
- `manufacturers` (id, name, logo)
- `categories` (id, parent_id nullable, slug, bilingual names, sort_order)
- `part_families` (id, category_id, bilingual name)
- `products` (id, sku unique, slug, part_family_id nullable, manufacturer_id, category_id, type, bilingual fields, price_egp, sale_price_egp, cost_egp nullable, orderable, status, timestamps)
- `product_part_numbers` (id, product_id, part_number, normalized_number, number_type)
- `product_images` (id, product_id, storage_path, alt_ar, alt_en, position)
- `product_fitments` (id, product_id, vehicle_config_id, fitment_note nullable; unique pair)
- `addresses` (id, user_id nullable, governorate_id, area_id, details, phone)
- `governorates`, `shipping_areas`, `shipping_rates` (enabled, amount_egp, validity)
- `carts`, `cart_items` (anonymous token/user_id, product_id, qty)
- `orders` (id, public_token, order_number, user_id nullable, customer snapshot, shipping snapshot, totals snapshot, status, payment_status, timestamps)
- `order_items` (order_id, product_id, SKU/name/manufacturer/price snapshots, selected_vehicle_config_id nullable, quantity)
- `payments` (order_id, provider, method, provider_reference, amount, status, idempotency_key, timestamps)
- `payment_events` (provider_event_id unique, verified_payload_metadata, processed_at)
- `coupons`, `coupon_redemptions`, `promotions`
- `part_requests` (contact, vehicle fields, description, private image path, status)
- `cms_pages`, `hero_banners`, `guides`, `site_settings`
- `order_status_events`, `admin_audit_logs`

Use integer minor currency units (piasters) or exact decimal; **never floating point for money**. Create foreign keys, unique constraints, CHECK constraints, indexes on slug/SKU/normalized part numbers/fitment keys, and transactional order writes. Apply RLS where using Supabase directly: public only published catalog, member only own garage/orders, admin privileged through server-only operations, guest access through verified server endpoints. Private buckets for invoices, customer uploads and transfer proofs.

## 9. Search, SEO, i18n and performance

- Search uses PostgreSQL full-text/trigram where suitable, Arabic normalization (hamza/alef variants, tatweel/diacritics), Latin casefolding, part-number normalization and relevance ranking. Debounce autocomplete, paginate server-side, prevent heavy unrestricted queries.
- Index useful evergreen brand, model, category and published product pages with localized titles, meta descriptions, canonical URLs, hreflang, sitemap, robots, breadcrumbs and Product/Offer schema **only with accurate price/availability claims**.
- Noindex checkout, cart, account, admin, internal search combinations, order confirmation and private data. Avoid thin SEO pages for nonexistent combinations.
- RTL/LTR layouts are first-class: icons, breadcrumbs, paddings, form fields and numbers render correctly; translated validation/errors, transactional messages and accessible labels.
- Optimize LCP hero and model photos, responsive image formats, blur placeholders, route-level loading states, caching with invalidation on product edits, no heavy animations on mobile.
- Target WCAG 2.2 AA where practical: contrast, focus rings, keyboard navigation, semantic forms, alt text, motion reduction, screen-reader error announcements.
- Analytics: consent-aware GA4 or privacy-conscious equivalent; track `view_item`, `search`, `select_item`, `add_to_cart`, `begin_checkout`, `purchase` (only on verified successful order event), and part requests; never send PII to analytics.

## 10. Security and operations

- Use server-side authentication and authorization, rate limits on auth, search, checkout, order tracking and inquiries; CAPTCHA/abuse controls where needed.
- Validate all input; parameterized queries, XSS protection, CSRF protections as appropriate, secure cookies, CSP, webhook signature verification, secret management, audit logs.
- Upload validation: MIME/content checks, file size limits, malware scanning where feasible, signed private URLs, no executable content.
- Do not store card data or sensitive payment credentials; use hosted/approved provider flow.
- Backups and restore drills, monitoring/alerts, error reporting with PII redaction, migrations, staging environment and automated tests.
- Data privacy: minimum necessary collection, retention policy, deletion/export workflow and Egyptian legal review of privacy, consumer protection, taxes and payment terms before launch.

## 11. Demo content and go-live gates

Seed all four brands with *accurate* model examples and licensed/placeholder photos; several model/year/engine combinations and **clearly marked fictional demo SKUs** across categories, manufacturers and fitment scenarios. Do not invent genuine OEM numbers or advertise demo products as real. Demo order checkout uses sandbox/test mode; production orderability requires merchant approval and real product catalog. Use placeholder payment adapters in development only, labeled unavailable until activated.

Go-live prerequisites: confirmed brand identity/logo, real catalog and validated fitment, shipping area/rate table, merchant-approved returns/warranty policy, provider contracts/credentials for each online payment method, real photos/licensing, legal pages, domain, customer support details, operational fulfillment process, security review, and end-to-end live/sandbox reconciliation tests.

## 12. Delivery roadmap and acceptance criteria

### Phase 0 — Foundation
Set up repository, environments, migrations, auth, i18n, design tokens, CI, admin bootstrap. **Accept:** fresh environment starts with one documented command, migrations pass, admin access restricted.

### Phase 1 — Storefront design
Recreate approved cinematic home, four photo brand cards, brand→model cards→year/config selection, responsive header/footer. **Accept:** all four brands and model cards navigate correctly; no dropdowns in home hero; AR/EN and mobile pass visual review.

### Phase 2 — Catalog and fitment
Products, manufacturers, categories, search, filters, product pages, compare, Garage, part requests. **Accept:** one SKU maps to multiple cars in admin but public fitment displays only the active selected car; incorrect engine variant does not get a green compatibility badge.

### Phase 3 — Admin and bulk import
CRUD, images, vehicle matrix, CSV/XLSX import preview, offers, shipping rates, inquiries, dashboard. **Accept:** invalid imports produce errors and no partial silent corruption; admin can edit a SKU and see storefront update.

### Phase 4 — Checkout and orders
Guest/member cart, shipping pricing, promotions, COD, secure order statuses, guest tracking. **Accept:** totals recalculate on server; duplicate submissions cannot create duplicate paid orders; delivery rate resolves by area.

### Phase 5 — Online payments
Integrate each approved provider one at a time; reconcile webhooks/refunds, installment conditions, pending manual transfers. **Accept:** sandbox success/failure/retry/refund cases pass; no unsupported payment method appears as available.

### Phase 6 — Launch quality
SEO, accessibility, analytics, security testing, load testing, monitoring, policy content, production readiness checklist. **Accept:** no broken routes, no leaking customer data, tested RTL/LTR and responsive breakpoints, working operational order workflow.

### Mandatory automated test scenarios
- A shared product fits Opel configuration A and Peugeot configuration B; each buyer sees **only their own selected vehicle** in the compatibility message.
- Same model/year but different engine does not silently pass compatibility.
- Guest checkout works without login; account Garage persists.
- Discounts cannot drive negative totals; expired/invalid coupons rejected.
- Unknown shipping area blocks checkout with helpful error.
- Repeated checkout click and repeated payment webhook do not duplicate orders/payments.
- A guest cannot guess another guest's order details.
- A regular member cannot reach admin APIs.
- Demo SKU is not sold as real inventory in production.
- Switching Arabic↔English preserves product and active vehicle where possible.

## 13. AI coding-agent execution rules

1. Inspect the existing repository before changes; if none exists, scaffold the stack above.
2. Maintain an implementation checklist and short architecture decision record; work in phases and verify each phase before proceeding.
3. Build **real functional components and backend integration**; no fake buttons, placeholder analytics presented as real, or hard-coded checkout success.
4. Where provider credentials or commercial decisions are missing, implement a clean adapter/interface, feature-flag the feature off, and document the required setup; **never fabricate credentials or successful transactions**.
5. Keep all site content and image assets configurable from admin where specified; preserve the cinematic look while prioritizing fast mobile performance.
6. Provide migration scripts, seed data, environment variable example, setup instructions, test commands and deployment checklist.
7. Never silently expand scope into marketplace, inventory management, additional car brands or image search.
8. Ask only genuinely blocking questions; otherwise use documented safe defaults and continue.
9. End each phase with changed files, working features, tests run, remaining blockers and next steps.

## 14. Pending merchant choices (do not block foundation work)

- Final logo/name treatment: **Mansokar** is project name, **DriveParts** is temporary visual logo; never imply both are separate stores.
- Actual merchant contact information, domain and support channels.
- Specific payment gateway(s), wallet/InstaPay flows and installment partner(s).
- Shipping rates per governorate/area and carrier/process.
- Cancellation/returns/warranty wording, taxes and invoice rules.
- Product catalog import format and final approved images.
- Whether prices shown include applicable taxes, and minimum/maximum COD limits.

**Definition of done:** A secure, bilingual, visually distinctive, fully navigable and operational single-merchant car-parts store, with accurate vehicle fitment, real checkout behavior for enabled methods, a usable admin console, and an explicit safe transition from demo to real data.

## 15. Premium product detail pages — automotive editorial experience (required)

**Goal:** Make every product page feel like a high-end automotive parts catalog while remaining faster and clearer than a conventional marketplace page. The aesthetic must be distinctive, not a generic image/price/buy template. Keep the approved charcoal + warm amber cinematic identity. Product photography should be the hero, not distracting background effects.

### 15.1 Desktop composition
- Use a deliberate asymmetric 12-column layout: ~7 columns for an immersive media gallery and ~5 for a sticky purchasing panel; stack naturally on mobile.
- Media area: large studio-lit product cutout on a charcoal-to-graphite gradient, soft realistic contact shadow, restrained amber rim light. Secondary thumbnails for front, side, detail, packaging and dimensions; only display actual available media. Zoom/lightbox with keyboard controls, swipe on mobile, meaningful alt text. Never invent an image or depict a different manufacturer/part as the SKU.
- Above fold purchasing panel: breadcrumb (brand → selected model → category), category eyebrow, prominent readable bilingual product name, manufacturer badge, OEM/Aftermarket type, part number with copy control, current price in EGP, struck-through previous price only for valid promotions, transparent discount label, quantity selector, prominent **Add to cart** CTA, and optional save/compare controls.
- Show genuine vs aftermarket as an explicit factual attribute; avoid unsupported claims like “100% genuine” unless documented. Add shipping estimation via governorate/area selector and COD/online-payment badges without promising an unavailable payment method.
- A concise trust strip may display verified warranty/return terms and support channel; content must reflect actual merchant policies, never invented assurances.

### 15.2 Vehicle compatibility module — signature differentiator
- Place a visually strong **FIT CHECK** card near the price/CTA, with a subtle technical grid/vehicle silhouette and a clear state:
  1. **Confirmed:** green indicator + “Compatible with your [selected make, model, year, engine/variant when needed]”.
  2. **Not confirmed:** amber indicator + “Compatibility has not been confirmed for your selected vehicle”; allow contacting support.
  3. **No vehicle selected:** “Choose your car to check compatibility” with a button to pick from the four supported makes, model, year, and required configuration.
- Never infer a confirmed fit from make/model/year alone when an engine, trim, VIN or other qualifier is required. No false red “incompatible” badge solely due to missing mapping; distinguish unknown from explicitly incompatible if the data model supports both.
- The customer must **never see a list of all other vehicles that share the part**. Display only the current selected/saved car and its verified status. The admin may attach one product to multiple vehicle fitment records.
- Switching the selected vehicle must refresh the fit-check state and relevant search/filter context without duplicating the product record.

### 15.3 Product storytelling and technical details
- Beneath the hero, use an editorial, modular sequence rather than a long plain table:
  - **Why this part:** short factual use case, only where reliable product data exists.
  - **Technical specifications:** compact, scannable cards or a clean accordion (manufacturer, part number, dimensions, material, included items, warranty when known).
  - **Product gallery detail:** high-resolution macro shots or diagrams only when supplied and rights-cleared.
  - **Installation notes / care:** factual manufacturer-provided guidance; avoid unsafe mechanical instructions or claims that installation is simple without evidence.
  - **Shipping, returns and warranty:** policy-backed content with expandable detail.
- Use bilingual copy fields or reliable translation workflows; preserve technical identifiers and OEM numbers verbatim. RTL/LTR layouts must be individually polished, not just CSS mirroring.

### 15.4 Cross-sell, alternatives and comparison
- Show **Other manufacturers for this part** as *separate products/SKUs*, with a clear manufacturer, part number, type, price and verified fitment for the current vehicle. Do not merge them as variants of one SKU.
- Offer **Compare alternatives** for genuinely comparable products: columns for brand/manufacturer, OEM/aftermarket, price, verified specifications, warranty and current-car compatibility. Never fill unknown specs with guesses.
- Add **Often purchased together** only when merchant-curated or supported by actual purchase data. Exclude items not confirmed for the selected car.
- Related-product cards use premium product imagery, restrained motion, visible prices and an explicit Add to cart or View details action.

### 15.5 Motion and interaction
- Gallery thumbnail transition 180–250ms; hover product-image magnification and soft amber border highlight; subtle card elevation. No auto-rotating 3D product if no genuine 3D assets exist.
- Optionally use a **scroll-linked technical line-art reveal** between sections on desktop, but it must never obscure content, delay shopping, or harm Core Web Vitals. Disable on reduced-motion devices and low-power/mobile contexts.
- On mobile use a compact sticky bottom action bar with **price + Add to cart**, respecting safe-area insets and avoiding overlap with payment widgets.
- Loading states use tasteful skeletons; errors and unavailable media have graceful fallbacks. All buttons, gallery controls and accordions must work with keyboard and screen readers.

### 15.6 Admin content requirements
- Admin product editor must support multiple ordered photos with alt text, product type, manufacturer, SKU, part numbers, structured specifications, bilingual descriptions, optional verified warranty details, policy references, promotional pricing and cross-sell/alternative relationships.
- Compatibility mapping remains many-to-many and private in its full scope; expose only the current-car fitment result to the customer-facing UI/API. Enforce this server-side, not just by hiding a front-end list.
- Allow curated editorial content blocks, but provide clean defaults for sparse demo products. Do not invent manufacturer claims, fitment, warranty, dimensions or product imagery.

### 15.7 Acceptance criteria
- A customer can open a product page from a selected Opel/Peugeot/Citroën/MG model and see **only that selected vehicle** in the fit-check UI, even if the admin mapped the SKU to multiple vehicles.
- The page clearly distinguishes confirmed, unconfirmed and unselected vehicle states; it never silently claims compatibility.
- Distinct manufacturers appear as separate purchasable products, and the comparison UI compares real fields without fabricated values.
- All prices and promotions use server-validated EGP values; cart and checkout totals are recomputed on the server.
- Desktop, tablet and mobile are visually polished; Arabic RTL and English LTR work; gallery, zoom, keyboard access, reduced-motion behavior and sticky mobile CTA are tested.
- The premium presentation does not degrade load performance: optimized images, responsive sizes, lazy-loaded below-fold media, and no blocking animations.

**Implementation priority:** Treat this section as part of **Phase 2 — Catalog and fitment** (not a post-launch enhancement). Build one complete product detail page with demo data and test its fitment/privacy states before mass-populating the catalog.
