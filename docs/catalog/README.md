# Catalog data improvements — 11 November 2026

This pass corrects saved product data using the merchant's existing Arabic names and registered vehicle applications. It does not infer inventory, manufacturer identity, country of manufacture, engine-specific fitment or new warranty terms.

## Applied changes

- 187 English names improved: 177 Arabic-filled English names translated, plus 10 records corrected for clear translation errors or missing engine-code detail. Left/right follows the original Arabic label; a tank cap remains a cap, and an engine mount is not relabeled as a transmission mount.
- Automatic descriptions and SEO copy refreshed for these products with their recorded make, model and year ranges. Manual SEO overrides are protected.
- Existing canonical product URLs frozen before renaming, so saved links continue to work.
- The invalid country-of-origin value “أصلي”/original removed from all 424 published products. Genuine status is not a country; actual country remains unknown until confirmed.
- Commercial prices, part numbers, vehicle applications, manufacturers, warranty terms and orderability preserved.

`improvement-plan.json` records each affected item and changed fields. `improvement-result.json` records successful database read-back. A full before/after rollback snapshot is stored outside Git at `/home/jimmy/.local/state/mopc-catalog/backup-1794409762257.json` with restricted permissions.

## Verification

The complete saved-image audit checked 350 records; all passed HTTP/image-type availability checks, including retry where HEAD was unsupported. This verifies availability, not visual part identity or image licensing. See `../seo/image-validation.json`.

The vehicle metadata audit is rerun for all 424 published products (848 localized sets). TypeScript validates the update tooling. Live product pages and sitemap locale counts are checked after applying the data changes.

## Remaining verified gaps

- At the time of this audit, 13 English names required clarification. The merchant clarified them on 12 November; see [the resolved names](ambiguous-names.md). This report and its supplier worksheet are historical snapshots.
- 74 published products have no saved photograph.
- 186 products use the generic manufacturer value “Genuine Parts”; an actual manufacturer needs supplier evidence.
- 424 products lack recorded stock and country of origin. Stock must come from inventory, and origin from packaging/manufacturer documentation.
- 306 products have fractional EGP prices while current storefront presentation rounds to whole pounds. This pass does not change commercial prices; confirm the desired price precision before adjusting pricing or presentation.

`follow-up.json` contains the item-level gaps. `supplier-review.csv` is an Excel-compatible worksheet with blank fields for confirmed information. It is for review, not an automatic import format. Original ambiguous names are retained in the worksheet.

## Reproduction

- Dry run: `node --env-file=.env.local --import tsx scripts/improve-catalog-data.ts`
- Apply guarded corrections: append `--apply`. The tool snapshots changes first, compares fields against their original values, stops on concurrent edits, and verifies saved values and preserved URLs/compatibility afterward.
- Image check: `BASE_URL=https://mopc.store IMAGE_AUDIT_LIMIT=0 node --env-file=.env.local scripts/seo-image-audit.mjs`
- Vehicle metadata: `node --env-file=.env.local --import tsx scripts/audit-product-copy.ts`

Review the dictionary before applying it to future imports. It translates only known exact Arabic labels; it is not an automatic manufacturer lookup. Re-running the tool should produce no changes once the catalog is corrected. Run reports in a separate directory or retain existing applied reports if preserving historical evidence.

### Final result

All 424 updates were independently compared with the original before/after plan after a transient network error and safe resume. The full metadata audit passed all 848 locale copies with zero issues. Live product sitemap now contains 835 URLs: 424 Arabic and 411 English, up from 658 before the corrections. This adds 177 eligible English product URLs; it does not prove they have been indexed. Representative corrected English pages retain their old canonical URLs and return HTTP 200. Database changes are already live; no storefront application code change was required.
