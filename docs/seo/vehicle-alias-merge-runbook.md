# MOPC vehicle-model alias consolidation

## Scope

Two spelling aliases in the live catalogue currently have separate product sets:

| Car make | Legacy spelling | Canonical spelling |
| --- | --- | --- |
| Chevrolet | `cruz` | `cruze` |
| Opel | `insginia-a` | `insignia-a` |

Do **not** redirect the legacy URLs or delete their records while products are
still attached. Search pages, model years, full car configurations and product
fitments are stored separately. The legacy and canonical pages currently have
different products, so a naive URL redirect can make SKUs undiscoverable.

## Changes that may deploy now

- `src/lib/vehicle-model-aliases.ts` defines *only* these known misspellings.
- Excel/import planning preferentially assigns *new* applications to the already
  registered canonical model; if there is no registered target, it leaves the
  source unchanged. An `All` selection of existing models stays unchanged.
- Existing model IDs, product specs, cart/order rows, model/garage/config rows
  and public links are not modified by the import fix.

## Database preflight (read-only)

1. Connect the **MOPC** Supabase database, not Playza or Zait & Filters.
2. Back up the database and obtain a current model, product, fitment and garage
   snapshot before any write.
3. Run `scripts/seo/vehicle-model-alias-audit.sql` in the MOPC SQL editor.
4. Confirm exact source/target model IDs, all config collisions, and every
   foreign-key reference to `vehicle_models`.
5. If an old configuration has a collision with a new one, resolve its exact
   IDs and dependent `product_fitments` / `garage_vehicles` first. The merge
   deliberately raises an exception rather than silently losing records.

## Deferred migration (not run or deployed automatically)

`scripts/seo/vehicle-model-alias-merge.sql` is a **manual opt-in**,
transactional procedure. It preserves original vehicle-configuration IDs (and
therefore existing product-fitment and garage references), combines verified
product application years (empty list remains the model-wide `All` case),
transfers recorded model years and generations, and fails/rolls back if
configuration collision or unexpected foreign keys are present.

Use a session explicitly approved for MOPC only:

```sql
SET mopc.allow_vehicle_alias_merge = 'approved';
-- Execute the COMPLETE contents of scripts/seo/vehicle-model-alias-merge.sql
-- in this SAME session after a successful preflight and backup.
```

Do not apply this file to another Supabase database. A PR merge or Vercel
deployment must **not** execute this script. A real database verification is
mandatory before reporting the historical data migration as completed.

## After migration

1. Re-run the preflight and require zero old configs, old model-year rows,
   old generation rows, and old `car_years:<oldId>` product keys.
2. Compare total product-fitment and garage association counts before/after;
   require no disappearing products or exact configuration IDs.
3. Check original model image slots, import/export, admin model selection,
   model-without-years (`All`) behaviour, model pages and the product carousel.
4. Only when old SKU sets all resolve under canonical model search, add
   **308 redirects** for old make/model/category URLs, then remove old model
   records from navigation and the vehicle Sitemap.
5. Reinspect with Google Search Console. Google may retain the old URLs until
   it recrawls them; a 308 does not instantly guarantee reindexing.

**Status:** New-import alias protection can ship independently. Historical
MOPC database consolidation is NOT performed until the MOPC database is
connected and the preflight is inspected.
