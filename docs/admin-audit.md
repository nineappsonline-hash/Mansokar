# Admin audit and checkout diagnostics

## Scope

Reviewed all 17 admin sections on desktop and mobile. Test accounts, drafts, images, disabled campaigns, quotes and coupons were disposable and removed automatically. Existing merchant records, payment credentials and policy publication states were preserved.

## Fixes

- Connected homepage headings, introductions, fallback images and slideshow timing to their admin settings; restored scheduled homepage campaigns.
- Prevented duplicate campaign creation during repeated saves and accepted database-returned UTC offsets when editing campaigns and coupons.
- Changed inquiry quotes and fixed discounts to EGP inputs. Kept monetary storage in integer minor units and validated coupon schedules and percentages.
- Removed legacy category controls from new coupons and the sales-report display. Existing restricted coupons retain their restriction unless explicitly changed.
- Made new CMS pages start blank rather than preselecting About. Missing policy links prefill the intended page path.
- Added checkout policy readiness to Overview and Settings. Unpublished policies are reported explicitly; publishing remains an admin decision.
- Kept product workspace tabs in the URL, preserved unsaved product details between tabs, separated brand search from brand creation and added a direct product-editor anchor.
- Disabled image saves and branding-slot changes while uploads are running.
- Restricted the COD collection action to COD orders, added queue empty states and timestamps, and surfaced database failures instead of presenting empty data.
- Corrected SEO compatibility checks to recognize saved model/year applications and reject part-type words as country-of-origin data.
- Added clear admin access errors, rejected admin signup attempts and retained the existing verified admin authorization/bootstrap rules.
- Improved mobile navigation focus handling, Escape behavior, text contrast, Arabic field direction, error feedback, loading and recovery screens.
- Changed export filenames to MOPC.

## Verification

- Production build and 51 automated tests.
- All 17 sections load at 1440px and 390px without horizontal overflow or browser errors.
- Draft product creation, automatic SKU, EGP prices, photo upload/save, Excel template generation and confirmed draft deletion.
- Whole-EGP coupon and quote persistence, repeat campaign saves, blank CMS creation, product-tab reloads and unsaved tab state.
- Mobile navigation and non-admin access rejection; admin signup rejected server-side.
- Accessibility checks on Products, Vehicles, CMS, Settings, Promotions, Inquiries and Orders.

## EasyKash diagnostic results

The supplied API key successfully created unpaid EGP 10 hosted checkout links (HTTP 200), including a request through the application's payment helper with its configured payment options. The hosted checkout loaded the expected base amount. No card details were entered and no payment was charged.

Production project settings match both supplied credentials. Local credentials are different; the local API key returns “API is not enabled.” No environment values were changed, printed or committed.

The live store's checkout currently returns HTTP 400: “Checkout is unavailable until the store policies are approved.” Terms and Privacy are missing; Returns is a draft. This prevents the live checkout from reaching EasyKash. The readiness panel now identifies the required pages. Policies were not published automatically.

HMAC configuration was compared, but a genuine successful-payment callback was not exercised. Payment settlement, refunds and fulfillment were not triggered by these diagnostics.
