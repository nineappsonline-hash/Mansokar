# MOPC Admin Security Review — 2026-11-15

## Scope
Read-only production inspection of the Supabase administrative RPC grants, live manual-transfer RPC, and security advisor. No production schema or order/payment data was changed.

## Confirmed observations
- `admin_commit(uuid,text,jsonb)`, `admin_customer_accounts(uuid,text,integer,uuid)`, and `verify_manual_transfer(uuid,uuid,text)` are SECURITY INVOKER (`prosecdef=false`), and their explicit EXECUTE grants are to `postgres` and `service_role`. Application endpoints must therefore guard service-role access.
- `src/app/api/[action]/route.ts` checks `requireAdmin()` for `admin-*` operations before catalog loading (feature-branch commit a62e5a3).
- The production `verify_manual_transfer` RPC records the **order total** as paid even when the submitted transfer amount differs. It does not enforce transfer payment-method equality or reject an already-paid order inside the transaction. The API currently performs a non-atomic preflight for approvals, but a race remains possible.
- Rejecting one transfer proof currently sets the entire order's payment status to `failed`, even if another proof is pending.
- The security advisor reports leaked-password protection disabled. It also lists 30 RLS-enabled tables without policies; this is not automatically a vulnerability when service-role-only access is intended, but must be audited per table.

## Staged mitigation (NOT deployed)
`docs/sql/staged-verify-manual-transfer-hardening.sql` enforces matching transfer amount and method under row locks, rejects previously paid orders or recorded paid payments, and preserves the order payment status while another proof is pending.

## Release gates
1. Test staged RPC in an isolated transaction database: unauthorized actor, amount mismatch, method mismatch, duplicate approval, existing paid payment, rejection with/without another pending proof, and simultaneous approvals.
2. Review whether rejected proof should mark an order failed or leave it awaiting an alternative payment; align checkout UI, order state, and accounting.
3. Verify all admin RPC callers use server-side service credentials and independently validate administrator identity; review `admin_commit` actions for cross-record authorization and audit logging.
4. Enable leaked-password protection through Supabase Auth configuration after confirming plan support and user impact.
5. Review each no-policy RLS table for expected client access, confirm explicit grants and service-only flows.
6. Re-run security advisors and authenticated/non-admin integration tests before production promotion.

## References
- Supabase Security Advisor, 2026-11-15.
- Live `pg_get_functiondef('public.verify_manual_transfer(uuid,uuid,text)'::regprocedure)`, read-only inspection, 2026-11-15.
- `src/app/api/[action]/route.ts`, feature branch.
