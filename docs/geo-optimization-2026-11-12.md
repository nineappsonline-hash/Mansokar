# GEO / AI search discovery work — 12 November 2026

The objective is to help people and retrieval systems understand the store's real product and policy facts. This release adds customer-useful content in Egyptian Arabic and English. It does not claim an AI ranking or citation result.

## Changes

- Added a crawlable guide on genuine spare parts and warranties at `/ar/guides/genuine-parts-and-warranty` and `/en/guides/genuine-parts-and-warranty`. It explains what “أصلي” means when the actual maker name is unrecorded, how to check part number and model-year applications, where a photo is absent, and how agent/supplier warranties and exclusions work. It links to the published warranty and returns policies and the fitment guide. Its Article markup uses the existing MOPC organization identity and contains no invented publication date or author.
- Added visible product-specific warranty and authenticity answers. A recorded warranty month count is stated only when valid and present; otherwise the answer points to the product's own details or warranty document. The generic brand fallback is explained without portraying “أصلي” as a company or a manufacturing country.
- Added four unanswered Arabic/English evaluation prompts to the existing manual AI visibility worksheet. They record an expected relevant page and leave observed citations, dates and results unknown until actually tested.

## Existing technical foundation checked

The canonical domain is `mopc.store`; public pages have crawlable server-rendered content, Arabic/English URLs and hreflang, product descriptions with recorded make/model/year/part number, Product and Article data based on visible facts, and an XML sitemap. The robots file allows ordinary search retrieval. GPTBot and Google-Extended training crawlers remain disallowed by the existing owner-controlled preference; OAI-SearchBot is not blocked. The existing Google Search Console property is newly submitted, so there is no valid AI visibility baseline yet.

Google says AI Overviews and AI Mode use the same Search eligibility foundations and do not need a special `llms.txt` file, AI-only markup, or keyword-stuffed text. This release did not add those. It also did not add FAQ rich-result markup for product questions because visible answers are useful independently of that result type.

## Verification and next measurements

Run `npm test`, `npm run typecheck`, `npm run build`, and confirm both guide pages and a representative product return indexable, server-rendered text with matching canonical URLs. Check that the new guide appears in the guide sitemap. After deployment, record actual Search Console impressions and run the four new prompts in fresh sessions by platform, language and location; only count citations that are observed.

References: [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Google AI features technical requirements](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI crawler controls](https://developers.openai.com/api/docs/bots).
