# Atomic product deletion rollout checklist (STAGED ONLY)

No production migrations, flags or cleanup scheduling should be enabled by this document alone.

## Prerequisites
1. Apply in a disposable staging Supabase project, in this order:
   - `docs/sql/staged-admin-delete-product-atomic.sql`
   - `docs/sql/staged-product-image-path-guard.sql`
   - `docs/sql/staged-product-image-cleanup-worker.sql`
2. Validate existing production schema, foreign keys, RPC privileges and image path conventions read-only.
3. Verify image writes through `admin-images` / `admin_commit` and direct `product_images` inserts; path guard must cover all database writes.
4. Run two independent PostgreSQL connections: concurrent product deletion vs image assignment, concurrent worker claims, and stale lease acknowledgment. PGlite tests alone do not establish this.
5. Test failures: audit insert rollback, FK rejection, storage 5xx, worker timeout, repeated job, referenced image and malformed path.
6. Keep `ADMIN_ATOMIC_PRODUCT_DELETE_ENABLED` unset until staging passes. When enabled, the API calls `admin_delete_product_atomic`; errors do not fall back to legacy deletion.
7. Keep `PRODUCT_IMAGE_CLEANUP_ENABLED` unset until staging passes. The POST `/api/admin-image-cleanup` endpoint also requires `CRON_SECRET` and is not scheduled in `vercel.json`.
8. Only after sign-off, enable atomic deletion first, verify audit and queued jobs, then enable cleanup worker and schedule an authenticated invocation.
9. Observe pending/failed job counts, retries, storage errors, and admin audit events. Revert flags to disable new execution if unexpected errors occur.

## Known constraints
- Existing non-atomic delete path remains active when the atomic feature flag is off.
- A successful DB transaction cannot be rolled back after a later storage deletion.
- Old image paths outside the worker's accepted UUID-jpg format remain queued and fail closed until reviewed.
- No production deletion or production SQL execution was performed as part of this staging work.
