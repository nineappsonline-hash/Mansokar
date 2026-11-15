import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

async function fixture(){
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(`
    create table public.admins(user_id uuid primary key,enabled boolean);
    create table public.products(id text primary key,sku text);
    create table public.order_items(id uuid,product_id text);
    create table public.product_images(id uuid,product_id text references public.products(id) on delete cascade,path text);
    create table public.analytics_events(id uuid,product_id text);
    create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
  `);
  await db.exec(readFileSync("docs/sql/staged-admin-delete-product-atomic.sql","utf8"));
  await db.exec(readFileSync("docs/sql/staged-product-image-cleanup-worker.sql","utf8"));
  await db.exec("insert into public.product_image_cleanup_jobs(bucket,path,source_product_id) values('catalog-images','abc.jpg','p1')");
  return db;
}
type Job={id:number;lease_token:string;attempts:number;status:string};
test("claim gives each job a lease and does not reissue active leases",async()=>{
  const db=await fixture();
  try{
    const first=await db.query<Job>("select id,lease_token,attempts,status from public.claim_product_image_cleanup_jobs(10)");
    assert.equal(first.rows.length,1);
    assert.equal(first.rows[0].attempts,1);
    assert.equal(first.rows[0].status,"processing");
    assert.equal((await db.query("select * from public.claim_product_image_cleanup_jobs(10)")).rows.length,0);
    await assert.rejects(db.query("select * from public.claim_product_image_cleanup_jobs(51)"),/Invalid batch size/);
  }finally{await db.close();}
});
test("stale tokens cannot complete jobs and failure is retryable after backoff",async()=>{
  const db=await fixture();
  try{
    const first=(await db.query<Job>("select id,lease_token,attempts,status from public.claim_product_image_cleanup_jobs(1)")).rows[0];
    const wrong="00000000-0000-4000-8000-000000000099";
    assert.equal((await db.query<{finish_product_image_cleanup_job:boolean}>("select public.finish_product_image_cleanup_job($1,$2::uuid,false,'oops')",[first.id,wrong])).rows[0].finish_product_image_cleanup_job,false);
    assert.equal((await db.query<{finish_product_image_cleanup_job:boolean}>("select public.finish_product_image_cleanup_job($1,$2::uuid,false,'temporary')",[first.id,first.lease_token])).rows[0].finish_product_image_cleanup_job,true);
    assert.equal((await db.query("select * from public.claim_product_image_cleanup_jobs(1)")).rows.length,0);
    await db.exec("update public.product_image_cleanup_jobs set next_attempt_at=now()-interval '1 minute'");
    const next=(await db.query<Job>("select id,lease_token,attempts,status from public.claim_product_image_cleanup_jobs(1)")).rows[0];
    assert.equal(next.attempts,2);
    assert.notEqual(next.lease_token,first.lease_token);
    assert.equal((await db.query<{finish_product_image_cleanup_job:boolean}>("select public.finish_product_image_cleanup_job($1,$2::uuid,true,null)",[next.id,next.lease_token])).rows[0].finish_product_image_cleanup_job,true);
    assert.equal((await db.query("select * from public.claim_product_image_cleanup_jobs(1)")).rows.length,0);
  }finally{await db.close();}
});
test("expired leases are reclaimable but previous worker cannot acknowledge",async()=>{
  const db=await fixture();
  try{
    const first=(await db.query<Job>("select id,lease_token,attempts,status from public.claim_product_image_cleanup_jobs(1)")).rows[0];
    await db.exec("update public.product_image_cleanup_jobs set leased_until=now()-interval '1 second'");
    const next=(await db.query<Job>("select id,lease_token,attempts,status from public.claim_product_image_cleanup_jobs(1)")).rows[0];
    assert.equal(next.attempts,2);
    assert.equal((await db.query<{finish_product_image_cleanup_job:boolean}>("select public.finish_product_image_cleanup_job($1,$2::uuid,true,null)",[first.id,first.lease_token])).rows[0].finish_product_image_cleanup_job,false);
  }finally{await db.close();}
});
