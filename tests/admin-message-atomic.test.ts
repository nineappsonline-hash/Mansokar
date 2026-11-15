import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create table public.admins(user_id uuid primary key, enabled boolean not null);
    create table public.contact_messages(id uuid primary key, status text not null);
    create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
  `);
  await db.exec(readFileSync("docs/sql/staged-admin-message-atomic.sql","utf8")
    .replace(/^revoke all on function.*$/gm,"")
    .replace(/^grant execute on function.*$/gm,""));
  const actor="00000000-0000-4000-8000-000000000051";
  const message="00000000-0000-4000-8000-000000000052";
  await db.query("insert into public.admins values($1,true)",[actor]);
  await db.query("insert into public.contact_messages values($1,'new')",[message]);
  return {db,actor,message};
}

test("admin message status and audit event commit together",async()=>{
  const {db,actor,message}=await fixture();
  try {
    await db.query("select public.admin_update_message_atomic($1::uuid,$2::uuid,'read')",[actor,message]);
    assert.equal((await db.query<{status:string}>("select status from public.contact_messages")).rows[0].status,"read");
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,1);
  } finally {await db.close();}
});

test("audit insert failure rolls back message status update",async()=>{
  const {db,actor,message}=await fixture();
  try {
    await db.exec("alter table public.admin_audit_logs add constraint audit_never check (false)");
    await assert.rejects(db.query("select public.admin_update_message_atomic($1::uuid,$2::uuid,'read')",[actor,message]),/audit_never/);
    assert.equal((await db.query<{status:string}>("select status from public.contact_messages")).rows[0].status,"new");
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,0);
  } finally {await db.close();}
});

test("non-admin and missing message cannot create audit records",async()=>{
  const {db,actor,message}=await fixture();
  try {
    await assert.rejects(db.query("select public.admin_update_message_atomic($1::uuid,$2::uuid,'read')",["00000000-0000-4000-8000-000000000053",message]),/Forbidden/);
    await assert.rejects(db.query("select public.admin_update_message_atomic($1::uuid,$2::uuid,'read')",[actor,"00000000-0000-4000-8000-000000000054"]),/Message not found/);
    await assert.rejects(db.query("select public.admin_update_message_atomic($1::uuid,$2::uuid,'invalid')",[actor,message]),/Invalid message status/);
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,0);
  } finally {await db.close();}
});
