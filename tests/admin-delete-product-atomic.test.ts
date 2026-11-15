import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
async function fixture(){
  const db=new PGlite();
  await db.exec(`
    create table public.admins(user_id uuid primary key,enabled boolean);
    create table public.products(id text primary key,sku text);
    create table public.order_items(id uuid,product_id text);
    create table public.product_images(id uuid,product_id text references public.products(id) on delete cascade,path text);
    create table public.analytics_events(id uuid,product_id text);
    create table public.admin_audit_logs(user_id uuid,action text,details jsonb);
  `);
  await db.exec(readFileSync("docs/sql/staged-admin-delete-product-atomic.sql","utf8").replace(/^revoke all on function.*$/gm,"").replace(/^grant execute on function.*$/gm,"").replace(/^grant (select,insert,update|usage,select) on .*$/gm,""));
  const actor="00000000-0000-4000-8000-000000000061";
  await db.query("insert into public.admins values($1,true)",[actor]);
  await db.exec(`
    insert into public.products values('p1','SKU-1');
    insert into public.product_images values('00000000-0000-4000-8000-000000000062','p1','products/image.jpg');
    insert into public.analytics_events values('00000000-0000-4000-8000-000000000063','p1');
  `);
  return {db,actor};
}
test("product deletion atomically records audit and returns image cleanup paths",async()=>{
  const {db,actor}=await fixture();
  try{
    const r=await db.query<{deleted_id:string;deleted_sku:string;image_paths:string[]}>("select * from public.admin_delete_product_atomic($1::uuid,'p1')",[actor]);
    assert.deepEqual(r.rows[0],{deleted_id:"p1",deleted_sku:"SKU-1",image_paths:["products/image.jpg"]});
    assert.equal((await db.query("select * from public.products")).rows.length,0);
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,1);
    const jobs=await db.query<{path:string;status:string}>("select path,status from public.product_image_cleanup_jobs");
    assert.deepEqual(jobs.rows,[{path:"products/image.jpg",status:"pending"}]);
    assert.equal((await db.query<{product_id:string|null}>("select product_id from public.analytics_events")).rows[0].product_id,null);
  }finally{await db.close();}
});
test("failed audit rolls back product delete and analytics unlink",async()=>{
  const {db,actor}=await fixture();
  try{
    await db.exec("alter table public.admin_audit_logs add constraint fail_audit check (false)");
    await assert.rejects(db.query("select * from public.admin_delete_product_atomic($1::uuid,'p1')",[actor]),/fail_audit/);
    assert.equal((await db.query("select * from public.products")).rows.length,1);
    assert.equal((await db.query("select * from public.product_images")).rows.length,1);
    assert.equal((await db.query("select * from public.product_image_cleanup_jobs")).rows.length,0);
    assert.equal((await db.query<{product_id:string}>("select product_id from public.analytics_events")).rows[0].product_id,"p1");
  }finally{await db.close();}
});
test("ordered product and unauthorized actor cannot delete",async()=>{
  const {db,actor}=await fixture();
  try{
    await assert.rejects(db.query("select * from public.admin_delete_product_atomic($1::uuid,'p1')",["00000000-0000-4000-8000-000000000069"]),/Forbidden/);
    await db.exec("insert into public.order_items values('00000000-0000-4000-8000-000000000064','p1')");
    await assert.rejects(db.query("select * from public.admin_delete_product_atomic($1::uuid,'p1')",[actor]),/belongs to an order/);
    assert.equal((await db.query("select * from public.products")).rows.length,1);
    assert.equal((await db.query("select * from public.admin_audit_logs")).rows.length,0);
  }finally{await db.close();}
});

test("shared image paths are not queued for deletion",async()=>{
  const {db,actor}=await fixture();
  try{
    await db.exec("insert into public.products values('p2','SKU-2')");
    await db.exec("insert into public.product_images values('00000000-0000-4000-8000-000000000065','p2','products/image.jpg')");
    await db.query("select * from public.admin_delete_product_atomic($1::uuid,'p1')",[actor]);
    assert.equal((await db.query("select * from public.product_image_cleanup_jobs")).rows.length,0);
    assert.equal((await db.query("select * from public.product_images where product_id='p2'")).rows.length,1);
  }finally{await db.close();}
});
