# Egyptian Arabic and product metadata

Customer-facing navigation, vehicle selection, cart, checkout, payment messages, FAQs and buying guidance use clear Egyptian Arabic. Use consistent terms such as «عربيتك», «ماركة العربية», «سنة الصنع», «الموتور», «إيصال التحويل» and «كمّل الطلب». Prefer direct instructions and helpful error messages to literal translations or technical implementation language.

Keep legal policy terms, proper names, recorded product names, part numbers and existing URL slugs intact. Do not infer compatibility, manufacturing origin or warranty duration from an item name.

Canonical product metadata now derives the make, localized model name and exact recorded year ranges from the product's applications. Non-consecutive years remain separate. Titles, meta descriptions, Open Graph/Twitter descriptions, visible product descriptions and Product structured data share that vehicle information. A selected-car context remains limited to that matching vehicle. Existing custom SEO copy is retained and supplemented with the recorded applications when needed.

No database records are changed by this update. The read-only audit verifies every published product in both languages:

```sh
node --env-file=.env.local --import tsx scripts/audit-product-copy.ts
```

Its summary and any missing mappings are written to `docs/seo/product-vehicle-metadata-audit.json`. The audit reads only public product and vehicle fields; credentials, customer data and costs are never exported.
