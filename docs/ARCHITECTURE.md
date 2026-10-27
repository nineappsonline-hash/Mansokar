# Architecture decisions

1. The repository specification controls the stack: local Next.js App Router, TypeScript, PostgreSQL/Supabase. No separate hosted Sites project or substitute storage is created.
2. Arabic is default, English equivalent paths preserve query state. Server-rendered public pages; small interactive client controls.
3. Public catalog projection never contains all product fitments. Server checks the exact selected configuration and returns only its result.
4. Integer piasters throughout. Transactional PostgreSQL checkout owns price, shipping, coupon validation and idempotency.
5. Without database credentials, read-only fictional demo catalog works; writes and authentication fail closed. No local fake account/admin bypass.
6. Online payment adapters are unavailable pending provider contracts. COD requires explicit enablement. Production always rejects demo SKUs.
7. Model photos use labeled placeholders until approved brand/model photographs are supplied. No fabricated model-specific photo claims or OEM numbers.
