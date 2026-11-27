# MOPC field Core Web Vitals (real visitors)

Customer storefronts (`/ar` and `/en`) use the Next.js `useReportWebVitals` browser hook. Only consenting visitors generate metrics. Tracking is separate from synthetic Lighthouse/Playwright runs and never runs during SSR.

## Privacy and data collection

The consent banner uses the existing `analytics-consent` preference (yes/no). Users can change their choice through the existing privacy control. No identifying URLs, product IDs, cookies, user IDs, contact information, search terms, IP addresses or referrers are included in the application telemetry payload. Fields: metric name (LCP, INP, CLS, FCP, TTFB), numeric value, rating, page category, locale and mobile/desktop category.

The endpoint is `POST /api/web-vitals`. It validates a strict schema, requires same-origin traffic when Origin/Sec-Fetch-Site are provided, and writes valid events as `[mopc-web-vital] {...}` to Vercel Runtime Logs in production only. No database is used. Requests without consent are suppressed by the browser client. As with any public telemetry endpoint, a malicious client can send fabricated measurements; never use these records for billing or authorization. Vercel platform-level logging may retain technical request metadata according to the site's hosting settings.

## Reading the results

1. Open Vercel → **mansokar** → **Logs** for **Production**.
2. Filter for `[mopc-web-vital]`; select a time range with actual consenting visitors.
3. For a p75 report, export matching text logs and run: `node scripts/summarize-web-vitals.mjs web-vitals.log`.
4. Compare **mobile** and **desktop** separately. Focus on p75: good LCP ≤2.5 seconds, INP ≤200 milliseconds and CLS ≤0.1. Don't interpret 1–2 synthetic measurements as real-user performance.

## Vercel Speed Insights dashboard (prepared, requires activation)

The storefront has a consent-gated Vercel Speed Insights script using the first-party route `/_vercel/speed-insights/script.js` (documented script-tag integration; no extra dependency). It is **off by default** so it never triggers 404s before project activation.

To finish activation:

1. Open Vercel → project **mansokar** → **Speed Insights** → **Enable**. This is a Vercel product activation, not a GitHub merge or environment change. Check any plan/usage prompt before proceeding.
2. In Vercel → **Settings → Environment Variables**, set `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED=true` for **Production**, and redeploy the latest `main` commit. Vercel needs a deployment after activation to configure the script endpoint.
3. Visit `https://mopc.store/ar`, grant analytics consent, then in browser Network confirm the Speed Insights script request returns HTTP 200. It will submit measurements after an interaction/pagehide; dashboard data might take time to accumulate.
4. Filter Speed Insights by Production / mobile / page route. Compare p75 LCP, INP and CLS over a representative window; do not compare a single session with lab benchmarks.

Consent applies before loading the Speed Insights script. Existing custom `/api/web-vitals` logging remains independent and continues to work regardless of the dashboard setting. The Vercel hosted script may collect Vercel-defined performance metadata: review [Vercel Speed Insights privacy documentation](https://vercel.com/docs/speed-insights/privacy-policy) before enabling it.

**Limitations:** Runtime log retention and access depend on Vercel plan. The custom collector does not provide a managed long-term trends dashboard or automatic alerts. A dashboard requires the Vercel activation step above. No new database or payment configuration is required.
