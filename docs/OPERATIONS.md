# Mansokar operations

## Health and scheduled maintenance

- `/api/health` checks process liveness; `/api/health?ready=1` also checks the configured database. Monitor readiness from an external uptime service when the merchant chooses one.
- `/api/maintenance` requires `Authorization: Bearer <CRON_SECRET>`. The credential is server-only, configured on Vercel and in the ignored local environment. A signed-in administrator without the bearer credential is also denied.
- Vercel is configured to invoke the job daily at `02:17 UTC`. Scheduled invocation timing depends on the hosting plan. First scheduled execution must still be observed in Vercel's Cron Jobs logs; a manual authorized acceptance invocation is separately verified.
- `?dryRun=1` reports candidate counts without deleting records or images.
- Each run considers up to 100 unclaimed inquiry-upload records older than 24 hours. Upload claims already expire after 15 minutes. Any image referenced by an inquiry is preserved. Storage deletion happens before registry deletion so failures retain a retryable registry entry.
- Stale rate-limit counters and expired tracking challenges older than 24 hours are pruned. Orders, payments, customer profiles, inquiry records, referenced photos and notification history are retained. This housekeeping is not the merchant's customer-data retention/deletion policy.
- On a maintenance error the endpoint responds 503; review Vercel runtime logs and retry. No email/SMS alert transport is configured because the provider remains unchosen.

## Credentials and owner access

Application credentials are in Vercel's production environment and an ignored, mode-600 `.env.local`. Public clients receive only the publishable Supabase key. Management tokens and database maintenance credentials must never be placed in `NEXT_PUBLIC_` variables.

The designated owner must sign up at `/en/account`, verify `mo.dowaik@gmail.com` and then open `/admin`. The first admin entry is created only for that verified email. Disabling an existing admin entry prevents bootstrap from re-enabling it. Runtime role checks ignore user-editable metadata.

## Backups and recovery still requiring acceptance

The current Supabase project uses the Free plan. A production backup destination, retention schedule and isolated restore environment have not been approved or verified. Do not claim automatic backups/PITR or a successful restore from the presence of migrations alone.

Before taking real orders, configure an approved private backup destination, include both PostgreSQL and Storage objects, and rehearse restoring them into an isolated environment. Verify Auth configuration, migration history, order totals, private buckets, signed media, admin/member isolation and application readiness there. Keep a dated recovery report and measure restore duration. Do not copy a production server secret into a public recovery artifact.

## Launch gates

Online payments, installments, transaction messaging/OTP and refunds need actual approved providers and sandbox reconciliation. Public checkout also requires real catalog/fitments, approved policies, shipping coverage/rates and merchant tax/COD rules. Production continues to reject demo products.

## Search indexing cutover

The preview sends `X-Robots-Tag: noindex, nofollow`. Keep `STORE_LAUNCH_APPROVED` unset/false while merchant data and policies are unapproved. At the approved production cutover, set it to `true` and redeploy. Private/filter pages and demo products continue to use noindex independently; unapproved placeholder CMS pages also remain noindex. Homepage canonical URLs match `/ar` and `/en` without an extra redirect.
## Homepage hero slideshow

Open `/admin?module=hero-slideshow` as an enabled administrator. Upload landscape images, add both Arabic and English descriptions, and save. Enable at least two images for automatic rotation; one enabled image remains static. You can reorder, disable or remove images and choose a 3–30 second interval. The original hero image configured in Branding is displayed whenever no slideshow images are enabled. Uploads are private and presented through signed URLs. The editor previews unsaved changes, while the public page changes only after saving.


## Vehicle and product compatibility data

Product creation now uses the simplified form: bilingual spare-part names, searchable item brand with an explicit add-new action, car make/model/year and exact configurations, origin, part number, EGP prices, type, status and warranty months. SKU, initial URL, descriptions and SEO are generated server-side. Existing SKU and URL are preserved on edit. Vehicle selections save atomically with the product. Warranty months must come from the supplier; blank does not claim a warranty period. Categories and part families are handled internally and have no inputs in the simplified form. New vehicle years/configurations must first be registered in Admin → Vehicles. The optional `simple-product-check.mjs` acceptance check creates and removes disposable draft/admin/brand records.

In **Admin → Vehicles**, follow the numbered steps: choose a make, choose or add a model, then click **Add year & engine**. Enter a single model year and its engine description, then save. Internal identifiers and model slugs are generated automatically. Saved cars appear as readable year/engine rows with an Edit button. Transmission, fuel, engine code/capacity, body and trim are under **More details (optional)**. Generations and chassis codes have a separate optional section for the selected model. Do not use a generation year range as evidence that all years share the same part.

**Admin → Products** is the single product workspace. Its sections are **Products**, **Item brands**, and **Excel import & export**. Search and select a product once, then switch between **Product details**, **Cars & years**, and **Photos**. Select multiple models across makes and tick individual years or add year ranges; year choices do not require pre-existing engine configurations. Model/year applications are stored with the product and used for automatic descriptions and SEO. Exact engine fitments remain optional and must be selected explicitly. Vehicle selections save with the product; photos can be uploaded after the first product save. Drag and drop multiple JPG, PNG or WebP images (up to 10 photos, 5 MB each), or choose files; add image descriptions and save. Unsaved details stay in place while switching workspace tabs. Add brands from the brand section or directly in the product form. Excel tools provide template download, export, file checking and import; raw parsed data is optional. Old images, fitments, taxonomy and import admin URLs redirect into the combined workspace. New product categories and families are handled internally rather than entered by the merchant.

The `vehicle_configuration_details` migration adds optional powertrain fields and registers Chevrolet plus the requested model identities. It does not create real engine/year configurations or assign fitments. The migration has been applied to the linked Mansokar database; deploy the application build separately.

## Approved policy drafts and callback requests

Shipping, returns and warranty drafts are saved in **Admin → CMS** at `policies/shipping`, `policies/returns`, and `policies/warranty`. The owner approved 2–5 working days and product-specific supplier warranties; support uses a callback form. See `docs/policies/POLICY_DRAFTS.md` for the full bilingual wording and sources.

Deploy the application containing `/ar/contact`, `/en/contact` and `/api/contact` before publishing those CMS drafts, then verify a callback reaches **Admin → Inquiries**. The form stores the phone number, topic, inquiry and consent privately. Staff must review and follow up manually; no email/SMS transport or callback schedule is configured. Do not mark callback inquiries as vehicle-fitment requests.

`scripts/save-policy-drafts.mjs` previews the supplied content by default. `--save-drafts` inserts missing drafts without overwriting existing pages; `--update-drafts` explicitly updates only existing unpublished drafts. It never publishes a page. `scripts/policy-check.mjs` checks draft visibility, CMS content and a disposable callback inquiry when run with `CONFIRM_LIVE_QA=mansokar` and the server environment.

## Governorate shipping rates

**Admin → Shipping** lists all 27 Egyptian governorates. Select a governorate, enter separate normal and express rates in **EGP**, then enable each option you offer. Rates begin blank and disabled; zero is an explicit free-delivery rate, not an unset value. Existing custom/local delivery areas and prices are preserved under the expandable list.

Normal delivery is **2–5 business days**; express delivery is **within 48 elapsed hours**, measured from order confirmation and product availability. Normal business days exclude Fridays and public holidays. Checkout and the product delivery estimator show the selected governorate, method, window and rate. The selected area's server-side rate is used by the checkout quote and order transaction and included in the order's shipping snapshot.

Both governorate migrations have been applied to the linked database. The shipping policy draft has been updated with the confirmed windows. New governorate options remain unavailable to shoppers until their rate is set and they are enabled. The existing optional free-shipping threshold applies to all enabled methods, including express; its admin editor now accepts EGP.

`scripts/shipping-check.mjs` verifies governorate coverage and independent EGP rate saves/reloads using future-dated disposable rates that are never offered to shoppers. Run it only with `CONFIRM_LIVE_QA=mansokar` and the server environment.

## Sitemap and SEO diagnostics

`/sitemap.xml` now runs at request time and shares its inventory with `/ar/site-map` and `/en/site-map`. It remains available for review while launch indexing is disabled. Demo/draft products and unpublished CMS policies are excluded. Only supported public CMS routes are included. The XML lists both locales with absolute canonical URLs and language alternates; the HTML map provides crawlable links, with product pagination.

**Admin → SEO** shows the canonical origin, indexing flag, real-product count and data gaps. To verify Google Search Console ownership using a meta tag, configure the owner-supplied `GOOGLE_SITE_VERIFICATION` token and redeploy. This does not submit the sitemap automatically. After production validation and the deliberate indexing cutover, submit the canonical site's `/sitemap.xml` in the verified Search Console property.

The 28 October live audit found `/sitemap.xml` already returned 200, but the deployed site still sent `noindex, nofollow`; the database contained eight demo products and no published real products. Do not remove the indexing launch control merely to get demonstration products into search. The new XML/HTML sitemap and dashboard changes still require application deployment.
