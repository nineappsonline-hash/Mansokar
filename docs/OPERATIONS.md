# Mansokar operations

## Health and scheduled maintenance

- `/api/health` checks process liveness; `/api/health?ready=1` also checks the configured database. Monitor readiness from an external uptime service when the merchant chooses one.
- `/api/maintenance` requires `Authorization: Bearer <CRON_SECRET>`. The credential is server-only, configured on Vercel and in the ignored local environment. A signed-in administrator without the bearer credential is also denied.
- Vercel is configured to invoke the job daily at `02:17 UTC`. Scheduled invocation timing depends on the hosting plan. First scheduled execution must still be observed in Vercel's Cron Jobs logs; a manual authorized acceptance invocation is separately verified.
- `?dryRun=1` reports candidate counts without deleting records or images.
- Each run considers up to 100 unclaimed inquiry-upload records older than 24 hours. Upload claims already expire after 15 minutes. Any image referenced by an inquiry is preserved. Storage deletion happens before registry deletion so failures retain a retryable registry entry.
- Stale rate-limit counters and expired tracking challenges older than 24 hours are pruned. Orders, payments, customer profiles, inquiry records, referenced photos and notification history are retained. This housekeeping is not the merchant's customer-data retention/deletion policy.
- On a maintenance error the endpoint responds 503; review Vercel runtime logs and retry. No email/SMS alert transport is configured because the provider remains unchosen.

## Credentials and owner access

Application credentials are in Vercel's production environment and an ignored, mode-600 `.env.local`. Public clients receive only the publishable Supabase key. Management tokens and database maintenance credentials must never be placed in `NEXT_PUBLIC_` variables.

The designated owner must sign up at `/en/account`, verify `mo.dowaik@gmail.com` and then open `/admin`. The first admin entry is created only for that verified email. Disabling an existing admin entry prevents bootstrap from re-enabling it. Runtime role checks ignore user-editable metadata.

## Backups and recovery still requiring acceptance

The current Supabase project uses the Free plan. A production backup destination, retention schedule and isolated restore environment have not been approved or verified. Do not claim automatic backups/PITR or a successful restore from the presence of migrations alone.

Before taking real orders, configure an approved private backup destination, include both PostgreSQL and Storage objects, and rehearse restoring them into an isolated environment. Verify Auth configuration, migration history, order totals, private buckets, signed media, admin/member isolation and application readiness there. Keep a dated recovery report and measure restore duration. Do not copy a production server secret into a public recovery artifact.

## Launch gates

Online payments, installments, transaction messaging/OTP and refunds need actual approved providers and sandbox reconciliation. Public checkout also requires real catalog/fitments, approved policies, shipping coverage/rates and merchant tax/COD rules. Production continues to reject demo products.

## Search indexing cutover

The preview sends `X-Robots-Tag: noindex, nofollow`. Keep `STORE_LAUNCH_APPROVED` unset/false while merchant data and policies are unapproved. At the approved production cutover, set it to `true` and redeploy. Private/filter pages and demo products continue to use noindex independently; unapproved placeholder CMS pages also remain noindex. Homepage canonical URLs match `/ar` and `/en` without an extra redirect.
