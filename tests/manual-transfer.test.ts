import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// An isolated in-memory Postgres test. No live Supabase connection or real orders.
test("manual transfer approval is atomic, amount-safe, and idempotent", async () => {
  const db = new PGlite();
  const actor = "00000000-0000-4000-8000-000000000001";
  const orderId = "00000000-0000-4000-8000-000000000002";
  const transferId = "00000000-0000-4000-8000-000000000003";
  const otherId = "00000000-0000-4000-8000-000000000004";
  try {
    await db.exec(`
      create table public.admins(user_id uuid primary key,enabled boolean not null);
      create table public.orders(id uuid primary key,total bigint not null,payment_status text not null,payment_method text not null);
      create table public.manual_transfers(id uuid primary key,order_id uuid not null references public.orders(id),amount bigint not null,method text not null,status text not null,reference text);
      create table public.payments(order_id uuid,provider text,reference text,amount bigint,status text,idempotency_key text unique);
      create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
    `);
    await db.exec(readFileSync("docs/sql/staged-verify-manual-transfer-hardening.sql", "utf8"));
    await db.query("insert into public.admins values($1,true)", [actor]);
    await db.query("insert into public.orders values($1,10000,'pending','instapay')", [orderId]);
    await db.query("insert into public.manual_transfers values($1,$2,9000,'instapay','pending','ref-a')", [transferId,orderId]);
    const approve = (id: string, status: string, user = actor) =>
      db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,$3::text)", [user,id,status]);
    await assert.rejects(approve(transferId,"verified"),/amount does not match/);
    assert.equal((await db.query<{status:string}>("select status from public.manual_transfers where id=$1",[transferId])).rows[0].status,"pending");
    assert.equal((await db.query("select * from public.payments")).rows.length,0);
    await db.query("update public.manual_transfers set amount=10000,method='wallet' where id=$1",[transferId]);
    await assert.rejects(approve(transferId,"verified"),/method does not match/);
    await db.query("update public.manual_transfers set method='instapay' where id=$1",[transferId]);
    await assert.rejects(approve(transferId,"verified",otherId),/Forbidden/);
    await assert.rejects(approve(transferId,"invalid"),/Invalid transfer status/);
    await approve(transferId,"verified");
    await assert.rejects(approve(transferId,"verified"),/already reviewed/);
    assert.equal((await db.query("select * from public.payments")).rows.length,1);
    assert.equal((await db.query<{amount:number}>("select amount from public.payments")).rows[0].amount,10000);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.orders")).rows[0].payment_status,"paid");
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,1);
    await db.query("insert into public.manual_transfers values($1,$2,10000,'instapay','pending','ref-b')",[otherId,orderId]);
    await assert.rejects(approve(otherId,"verified"),/already paid/);
    assert.equal((await db.query("select * from public.payments")).rows.length,1);
  } finally {
    await db.close();
  }
});

test("rejecting a transfer does not create a payment", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.admins(user_id uuid primary key,enabled boolean not null);
      create table public.orders(id uuid primary key,total bigint,payment_status text,payment_method text);
      create table public.manual_transfers(id uuid primary key,order_id uuid,amount bigint,method text,status text,reference text);
      create table public.payments(order_id uuid,provider text,reference text,amount bigint,status text,idempotency_key text unique);
      create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
    `);
    await db.exec(readFileSync("docs/sql/staged-verify-manual-transfer-hardening.sql", "utf8"));
    const actor="00000000-0000-4000-8000-000000000011",order="00000000-0000-4000-8000-000000000012",transfer="00000000-0000-4000-8000-000000000013";
    await db.query("insert into public.admins values($1,true)",[actor]);
    await db.query("insert into public.orders values($1,10000,'pending','wallet')",[order]);
    await db.query("insert into public.manual_transfers values($1,$2,10000,'wallet','pending','ref-c')",[transfer,order]);
    await db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,'rejected')",[actor,transfer]);
    assert.equal((await db.query("select * from public.payments")).rows.length,0);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.orders")).rows[0].payment_status,"failed");
    await assert.rejects(db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,'verified')",[actor,transfer]),/already reviewed/);
  } finally {
    await db.close();
  }
});


test("rejecting one of multiple proofs preserves pending order until last proof", async () => {
  const db = new PGlite();
  const actor = "00000000-0000-4000-8000-000000000021";
  const order = "00000000-0000-4000-8000-000000000022";
  const first = "00000000-0000-4000-8000-000000000023";
  const second = "00000000-0000-4000-8000-000000000024";
  try {
    await db.exec(`
      create table public.admins(user_id uuid primary key,enabled boolean not null);
      create table public.orders(id uuid primary key,total bigint,payment_status text,payment_method text);
      create table public.manual_transfers(id uuid primary key,order_id uuid,amount bigint,method text,status text,reference text);
      create table public.payments(order_id uuid,provider text,reference text,amount bigint,status text,idempotency_key text unique);
      create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
    `);
    await db.exec(readFileSync("docs/sql/staged-verify-manual-transfer-hardening.sql", "utf8"));
    await db.query("insert into public.admins values($1,true)", [actor]);
    await db.query("insert into public.orders values($1,10000,'pending','wallet')", [order]);
    await db.query("insert into public.manual_transfers values($1,$2,10000,'wallet','pending','proof-1'),($3,$2,10000,'wallet','pending','proof-2')", [first,order,second]);
    await db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,'rejected')", [actor,first]);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.orders where id=$1",[order])).rows[0].payment_status,"pending");
    await db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,'verified')", [actor,second]);
    assert.equal((await db.query<{payment_status:string}>("select payment_status from public.orders where id=$1",[order])).rows[0].payment_status,"paid");
    assert.equal((await db.query("select * from public.payments")).rows.length,1);
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,2);
  } finally {
    await db.close();
  }
});

test("existing paid payment blocks approval even when order status is stale", async () => {
  const db = new PGlite();
  const actor = "00000000-0000-4000-8000-000000000031";
  const order = "00000000-0000-4000-8000-000000000032";
  const transfer = "00000000-0000-4000-8000-000000000033";
  try {
    await db.exec(`
      create table public.admins(user_id uuid primary key,enabled boolean not null);
      create table public.orders(id uuid primary key,total bigint,payment_status text,payment_method text);
      create table public.manual_transfers(id uuid primary key,order_id uuid,amount bigint,method text,status text,reference text);
      create table public.payments(order_id uuid,provider text,reference text,amount bigint,status text,idempotency_key text unique);
      create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
    `);
    await db.exec(readFileSync("docs/sql/staged-verify-manual-transfer-hardening.sql", "utf8"));
    await db.query("insert into public.admins values($1,true)", [actor]);
    await db.query("insert into public.orders values($1,10000,'pending','wallet')", [order]);
    await db.query("insert into public.manual_transfers values($1,$2,10000,'wallet','pending','proof-1')", [transfer,order]);
    await db.query("insert into public.payments values($1,'wallet','already-paid',10000,'paid','old-payment')", [order]);
    await assert.rejects(
      db.query("select public.verify_manual_transfer($1::uuid,$2::uuid,'verified')", [actor,transfer]),
      /Paid payment already recorded/,
    );
    assert.equal((await db.query<{status:string}>("select status from public.manual_transfers where id=$1",[transfer])).rows[0].status,"pending");
    assert.equal((await db.query("select * from public.payments")).rows.length,1);
  } finally {
    await db.close();
  }
});
