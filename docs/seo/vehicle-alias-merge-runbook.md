# MOPC vehicle-model alias consolidation

# Production completion: 2026-11-26

**Status: completed and independently verified on MOPC Supabase `egcrsphvijzibaamwoes`.** The steps below remain a reusable recovery/audit reference, not an outstanding request to run the migration again.

- A restricted `mopc_maintenance.vehicle_alias_backup` snapshot (`mopc-aliases-20261126-v1`) was captured before the write, holding **4 model records, 385 product compatibility specs, 25 recorded model-year rows**, plus configurations, fitments, garage refs and the original Opel media row.
- The guarded merge was executed transactionally. **72 legacy applications were moved**: 4 Chevrolet `cruz` and 68 Opel `insginia-a`. Post-merge counts: **114 Cruze** and **271 Insignia A** product applications.
- Post-migration verification compared the original 72 year strings against the new canonical keys and found **zero mismatches**, zero legacy application references, zero legacy model years, and no config/garage/fitment row loss.
- The original Opel model image was re-associated with `model-opel-insignia-a`. The two empty legacy model records were deleted in a separate guarded transaction **after** the redirect build reached Production READY.
- PR #29 (commit `f8e114e32301b770edd74e779fd1e777da1799a5`) added 308 canonical redirects for the legacy make/model/category paths. Production checks show old paths resolve to canonical pages; the URL fetch tool follows same-origin redirects, so it reports final HTTP 200 and canonical target.
- Post-cleanup `/sitemaps/vehicles.xml` is HTTP 200 with **76 URLs**; none contain legacy `cruz` or `insginia-a` slugs, while both canonical make/models remain present. 12 changed URLs were submitted to IndexNow (Bing peers); this does **not** notify Google.
- Google Search Console URL Inspection currently still marks the brand/model pages as unknown to Google. Indexing/re-ranking is not verified and should be monitored separately.


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

**Historical note:** This was the rollout plan before MOPC Supabase was connected. The historical consolidation has since been performed and verified as recorded above.
