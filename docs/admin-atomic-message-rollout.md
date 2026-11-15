# Atomic admin message status rollout — STAGED ONLY

The `admin-message` API uses `admin_update_message_atomic` only when
`ADMIN_ATOMIC_MESSAGE_ENABLED=true`. It is disabled by default.
The existing legacy status update and audit remain in place otherwise.

## Before enabling
1. Apply `docs/sql/staged-admin-message-atomic.sql` to a disposable staging Supabase database.
2. Confirm `contact_messages.id` is UUID and `status` accepts `new`, `read`, `replied`, `closed`.
3. Verify `admin_audit_logs` and `admins` schema and service-role-only execute privileges.
4. Test authorized and unauthorized admins, missing message, invalid status, successful audit, and an intentionally failing audit insert.
5. With staging environment variable `ADMIN_ATOMIC_MESSAGE_ENABLED=true`, exercise the API from desktop and mobile admin UI. Verify that audit failure rolls back status changes.
6. Verify disabled flag uses existing path without requiring the staged RPC.
7. Only after staging sign-off, apply reviewed migration to production and enable the flag in a separate controlled release.

## Rollback
Unset `ADMIN_ATOMIC_MESSAGE_ENABLED` to stop using the new RPC. Do not remove
the function until any in-flight requests finish. The old path is not atomic,
so disabling the flag is a functional rollback, not a security-equivalent one.

No production SQL changes or flag changes were made in this work.
