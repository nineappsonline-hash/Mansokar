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

**Limitations:** Runtime log retention and access depend on Vercel plan. This initial implementation does not provide a managed long-term trends dashboard or automatic alerts. Native Vercel **Speed Insights** is the recommended dashboard if it is enabled on the project in Vercel's Speed Insights page; enabling that product is separate from this code implementation. No extra npm packages, database schema changes, payment configuration or private visitor records are required.
