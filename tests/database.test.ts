import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const migration = readdirSync("supabase/migrations")
  .sort()
  .map((f) => readFileSync("supabase/migrations/" + f, "utf8"))
  .join("\n");
const seed = readFileSync("supabase/seed.sql", "utf8");
test("migration, RLS boundaries, transactional checkout, coupons, idempotency and rollback", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(migration);
    await db.exec(seed);
    assert.equal(
      (
        await db.query<{ value: string }>(
          "select public.normalize_search('أَصْلِيّ ـ') as value",
        )
      ).rows[0].value,
      "اصلي",
    );
    const search = await db.query<{
      result: {
        products: { id: string; cost?: number; fitments?: unknown }[];
        total: number;
      };
    }>(
      "select public.search_products(p_query=>'DEMO-PART-1',p_vehicle=>'opel-astra-2021-0') as result",
    );
    assert.equal(search.rows[0].result.products[0].id, "demo-1");
    assert.equal(search.rows[0].result.products[0].cost, undefined);
    assert.equal(search.rows[0].result.products[0].fitments, undefined);
    const mismatch = await db.query<{ result: { total: number } }>(
      "select public.search_products(p_vehicle=>'opel-astra-2021-1') as result",
    );
    assert.equal(mismatch.rows[0].result.total, 0);

    await assert.rejects(
      db.exec("insert into public.vehicle_brands values('bmw','BMW')"),
    );
    const tables = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'",
    );
    assert.ok(tables.rows.every((t) => t.relrowsecurity));
    await db.exec("set role anon");
    await assert.rejects(db.query("select cost from public.products"));
    assert.ok(
      (await db.query("select sku from public.products")).rows.length > 0,
    );
    await assert.rejects(db.query("select * from public.product_fitments"));
    await assert.rejects(db.query("select * from public.orders"));
    await assert.rejects(db.query("select * from public.admins"));
    await assert.rejects(
      db.query(
        "select public.place_order(null,null,null,null,null,null,null,true)",
      ),
    );
    await db.exec("reset role");
    const fixture = `insert into public.shipping_areas(id,governorate,name,enabled,amount) values('test-area','Cairo','Test',true,10000);insert into public.coupons(code,kind,amount,starts_at,ends_at,max_redemptions,redemptions) values('SAVE','percentage',10,now()-interval '1 day',now()+interval '1 day',1,0);`;
    await db.exec(fixture);
    const key = "00000000-0000-4000-8000-000000000001";
    const customer = {
      name: "Test buyer",
      phone: "01012345678",
      address: "A detailed test address",
    };
    async function order(
      opts: {
        key?: string;
        area?: string;
        coupon?: string;
        allowDemo?: boolean;
        items?: unknown;
      } = {},
    ) {
      return db.query<{ result: { token: string } }>(
        "select public.place_order($1,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8) as result",
        [
          opts.key ?? key,
          JSON.stringify(opts.items ?? [{ id: "demo-1", qty: 2 }]),
          JSON.stringify(customer),
          opts.area ?? "test-area",
          opts.coupon ?? null,
          "opel-astra-2021-0",
          null,
          opts.allowDemo ?? true,
        ],
      );
    }
    await assert.rejects(
      order({ allowDemo: false }),
      /Demo checkout prohibited/,
    );
    await assert.rejects(order({ area: "unknown" }), /Delivery area/);
    await db.exec(
      "insert into public.coupons(code,kind,amount,starts_at,ends_at,max_redemptions) values('EXPIRED','fixed',100,now()-interval '2 days',now()-interval '1 day',10)",
    );
    await assert.rejects(order({ coupon: "EXPIRED" }), /Invalid or expired/);
    const quote = await db.query<{
      result: {
        subtotal: number;
        discount: number;
        shipping: number;
        total: number;
        items: unknown[];
      };
    }>(
      "select public.checkout_quote($1::jsonb,$2::jsonb,'test-area','SAVE',null,true) as result",
      [JSON.stringify([{ id: "demo-1", qty: 2 }]), JSON.stringify(customer)],
    );
    assert.equal(Number(quote.rows[0].result.total), 109000);
    assert.equal(quote.rows[0].result.items.length, 1);
    assert.equal(
      (await db.query("select * from public.orders")).rows.length,
      0,
    );
    assert.equal(
      Number(
        (
          await db.query<{ redemptions: number }>(
            "select redemptions from public.coupons where code='SAVE'",
          )
        ).rows[0].redemptions,
      ),
      0,
    );
    await assert.rejects(
      db.query(
        "select public.place_order($1,$2::jsonb,$3::jsonb,'test-area',null,null,null,true)",
        [
          key,
          JSON.stringify([{ id: "demo-1", qty: 2 }]),
          JSON.stringify({ ...customer, review_total: 1 }),
        ],
      ),
      /Order total changed/,
    );

    assert.equal(
      (await db.query("select * from public.orders")).rows.length,
      0,
    );
    const first = await order({ coupon: "SAVE" });
    const retry = await order({ coupon: "SAVE" });
    assert.equal(first.rows[0].result.token, retry.rows[0].result.token);
    assert.match(first.rows[0].result.token, /^[a-f0-9]{64}$/);
    const totals = await db.query<{
      subtotal: number;
      discount: number;
      total: number;
    }>("select subtotal,discount,total from public.orders");
    assert.equal(Number(totals.rows[0].subtotal), 110000);
    assert.equal(Number(totals.rows[0].discount), 11000);
    assert.equal(Number(totals.rows[0].total), 109000);
    assert.equal(
      (await db.query("select * from public.orders")).rows.length,
      1,
    );
    await assert.rejects(
      order({ items: [{ id: "demo-1", qty: 3 }], coupon: "SAVE" }),
      /Idempotency key reused/,
    );
    await assert.rejects(
      order({ key: "00000000-0000-4000-8000-000000000002", coupon: "SAVE" }),
      /Invalid or expired/,
    );
    await assert.rejects(
      db.query(
        "select public.replace_fitments('demo-1',array['opel-astra-2021-0','invalid-config'])",
      ),
    );
    assert.equal(
      (
        await db.query(
          "select * from public.product_fitments where product_id='demo-1'",
        )
      ).rows.length,
      2,
    );
    const before = (
      await db.query("select price from public.products where id='demo-1'")
    ).rows[0];
    const rows = JSON.parse(
      JSON.stringify(
        (await import("../src/lib/catalog")).demoProducts.slice(0, 2),
      ),
    );
    rows[0].price = 999999;
    rows[0].sale = null;
    rows[1].manufacturer = "DOES NOT EXIST";
    await assert.rejects(
      db.query("select public.import_products($1::jsonb)", [
        JSON.stringify(rows),
      ]),
    );
    assert.deepEqual(
      (await db.query("select price from public.products where id='demo-1'"))
        .rows[0],
      before,
    );
    const oid = (
      await db.query<{ id: string }>("select id from public.orders limit 1")
    ).rows[0].id;
    await assert.rejects(
      db.query("select public.reconcile_cod($1)", [oid]),
      /only after delivery/,
    );
    await db.query(
      "update public.orders set demo=false,customer=customer||'{\"analytics_consent\":true}'::jsonb where id=$1",
      [oid],
    );
    for (const status of ["confirmed", "processing", "shipped", "delivered"])
      await db.query("select public.transition_order($1,$2)", [oid, status]);
    await db.query("select public.reconcile_cod($1)", [oid]);
    await db.query("select public.reconcile_cod($1)", [oid]);
    assert.equal(
      (await db.query("select * from public.payments")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<{ payment_status: string }>(
          "select payment_status from public.orders",
        )
      ).rows[0].payment_status,
      "paid",
    );
    assert.equal(
      (
        await db.query(
          "select * from public.analytics_events where event='purchase'",
        )
      ).rows.length,
      1,
    );
    const event1 = await db.query<{ accepted: boolean }>(
      "select public.record_payment_event($1,$2,$3,$4,$5,$6) as accepted",
      ["sandbox", "event1", oid, 109000, "paid", "ref1"],
    );
    const event2 = await db.query<{ accepted: boolean }>(
      "select public.record_payment_event($1,$2,$3,$4,$5,$6) as accepted",
      ["sandbox", "event1", oid, 109000, "paid", "ref1"],
    );
    assert.equal(event1.rows[0].accepted, true);
    assert.equal(event2.rows[0].accepted, false);
    assert.equal(
      (await db.query("select * from public.payment_events")).rows.length,
      1,
    );
    await db.exec(
      "insert into auth.users values('00000000-0000-4000-8000-000000000010'),('00000000-0000-4000-8000-000000000011')",
    );
    await db.exec(
      "set role authenticated;set request.jwt.claim.sub='00000000-0000-4000-8000-000000000010'",
    );
    await db.exec(
      "insert into public.garage_vehicles(user_id,vehicle_config_id) values('00000000-0000-4000-8000-000000000010','opel-astra-2021-0')",
    );
    await assert.rejects(
      db.exec(
        "insert into public.garage_vehicles(user_id,vehicle_config_id) values('00000000-0000-4000-8000-000000000011','opel-astra-2021-0')",
      ),
    );
    await db.exec(
      "set request.jwt.claim.sub='00000000-0000-4000-8000-000000000011'",
    );
    assert.equal(
      (await db.query("select * from public.garage_vehicles")).rows.length,
      0,
    );
    await db.exec("reset role");
    const uid = "00000000-0000-4000-8000-000000000010";
    await db.query("insert into public.admins(user_id) values($1)", [uid]);
    await db.query(
      "select public.admin_commit($1,'admin-taxonomy',$2::jsonb)",
      [uid, JSON.stringify({ kind: "manufacturer", name: "Atomic Maker" })],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.manufacturers where name='Atomic Maker'",
        )
      ).rows.length,
      1,
    );
    await db.exec(
      "create function public.test_audit_failure() returns trigger language plpgsql as $$begin raise exception 'Audit failure';end$$;create trigger test_audit_failure before insert on public.admin_audit_logs for each row execute function public.test_audit_failure()",
    );
    await assert.rejects(
      db.query("select public.admin_commit($1,'admin-taxonomy',$2::jsonb)", [
        uid,
        JSON.stringify({ kind: "manufacturer", name: "Must Roll Back" }),
      ]),
      /Audit failure/,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.manufacturers where name='Must Roll Back'",
        )
      ).rows.length,
      0,
    );
    await db.exec(
      "drop trigger test_audit_failure on public.admin_audit_logs;drop function public.test_audit_failure()",
    );
    await db.query(
      "select public.garage_change($1,'active','opel-astra-2021-0')",
      [uid],
    );
    await db.query(
      "select public.garage_change($1,'save','opel-astra-2021-0',null,'My car')",
      [uid],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.garage_vehicles where user_id=$1",
          [uid],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<{ is_active: boolean }>(
          "select is_active from public.garage_vehicles where user_id=$1",
          [uid],
        )
      ).rows[0].is_active,
      true,
    );
    const row = (
      await db.query<Record<string, unknown>>(
        "select to_jsonb(p) as product from public.products p where id='demo-1'",
      )
    ).rows[0].product as Record<string, unknown>;
    const updated = {
      ...row,
      cost: 12345,
      warranty: { ar: "ضمان المورد", en: "Supplier warranty" },
      editorial: { why: { ar: "اختيار", en: "Selection" } },
      partNumbers: ["ABC-123"],
      synonyms: { ar: ["مرشح"], en: ["strainer"] },
    };
    await db.query("select public.import_products($1::jsonb)", [
      JSON.stringify([updated]),
    ]);
    const imported = (
      await db.query<{ cost: number; warranty: { en: string } }>(
        "select cost,warranty from public.products where id='demo-1'",
      )
    ).rows[0];
    assert.equal(Number(imported.cost), 12345);
    assert.equal(imported.warranty.en, "Supplier warranty");
    const alternate = await db.query<{
      result: { products: { id: string; cost?: number }[] };
    }>("select public.search_products(p_query=>'ABC123') as result");
    assert.equal(alternate.rows[0].result.products[0].id, "demo-1");
    assert.equal(alternate.rows[0].result.products[0].cost, undefined);
    const newKey = "00000000-0000-4000-8000-000000000099";
    await db.query(
      'select public.place_order($1,\'[{"id":"demo-1","qty":1}]\'::jsonb,$2::jsonb,\'test-area\',null,null,null,true)',
      [newKey, JSON.stringify(customer)],
    );
    const costLine = (
      await db.query<{
        cost_snapshot: number;
        snapshot: Record<string, unknown>;
      }>(
        "select i.cost_snapshot,i.snapshot from public.order_items i join public.orders o on o.id=i.order_id where o.idempotency_key=$1",
        [newKey],
      )
    ).rows[0];
    assert.equal(Number(costLine.cost_snapshot), 12345);
    assert.equal(costLine.snapshot.cost, undefined);
    assert.equal(costLine.snapshot.category, row.category);
    await db.exec("update public.products set cost=99999 where id='demo-1'");
    assert.equal(
      Number(
        (
          await db.query<{ cost_snapshot: number }>(
            "select i.cost_snapshot from public.order_items i join public.orders o on o.id=i.order_id where o.idempotency_key=$1",
            [newKey],
          )
        ).rows[0].cost_snapshot,
      ),
      12345,
    );
    const payload = {
      product: "demo-1",
      relations: [{ id: "demo-2", kind: "together" }],
    };
    await db.query(
      "select public.admin_commit($1,'admin-relations',$2::jsonb)",
      [uid, JSON.stringify(payload)],
    );
    await assert.rejects(
      db.query("select public.admin_commit($1,'admin-relations',$2::jsonb)", [
        uid,
        JSON.stringify({
          product: "demo-1",
          relations: [{ id: "missing-product", kind: "together" }],
        }),
      ]),
    );
    assert.equal(
      (
        await db.query(
          "select * from public.product_relations where product_id='demo-1'",
        )
      ).rows.length,
      1,
    );
    await db.query(
      "select public.admin_commit($1,'admin-customer-note',$2::jsonb)",
      [uid, JSON.stringify({ user_id: uid, body: "Private support note" })],
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select cost_snapshot from public.order_items"),
    );
    await assert.rejects(db.query("select body from public.customer_notes"));
    await db.exec("reset role");

    await db.query(
      "update auth.users set email='lookup@example.invalid',email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000011'",
    );
    const accounts = await db.query<{
      result: { total: number; members: { user_id: string; email: string }[] };
    }>(
      "select public.admin_customer_accounts($1,'lookup@example.invalid') as result",
      [uid],
    );
    assert.equal(accounts.rows[0].result.total, 1);
    assert.equal(
      accounts.rows[0].result.members[0].email,
      "lookup@example.invalid",
    );
    await assert.rejects(
      db.query(
        "select public.admin_customer_accounts('00000000-0000-4000-8000-000000000011')",
      ),
      /Forbidden/,
    );
    await db.exec(
      "insert into public.categories(slug,name) values('parent-category','{\"ar\":\"رئيسية\",\"en\":\"Parent\"}');update public.categories set parent_slug='parent-category' where slug='filters'",
    );
    await assert.rejects(
      db.exec(
        "update public.categories set parent_slug='filters' where slug='parent-category'",
      ),
      /cycles/,
    );
    const descendants = await db.query<{ result: { total: number } }>(
      "select public.search_products(p_category=>'parent-category') as result",
    );
    assert.ok(descendants.rows[0].result.total > 0);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.site_media"));
    await assert.rejects(
      db.query(
        "select public.admin_customer_accounts('00000000-0000-4000-8000-000000000010')",
      ),
    );
    await assert.rejects(
      db.query(
        "select private.customer_accounts('00000000-0000-4000-8000-000000000010','',1,null)",
      ),
    );
    await db.exec("reset role");

    const requested = await db.query<{ id: string }>(
      "select public.create_inquiry_v2('qa@example.invalid',null,'A customer-described part inquiry',null,null,$1::jsonb) as id",
      [
        JSON.stringify({
          make: "opel",
          model: "Customer-described model",
          year: 2023,
          engine: "Unlisted engine",
        }),
      ],
    );
    const inquiry = (
      await db.query<{
        vehicle_config_id: string | null;
        vehicle_details: { model: string };
      }>(
        "select vehicle_config_id,vehicle_details from public.part_requests where id=$1",
        [requested.rows[0].id],
      )
    ).rows[0];
    assert.equal(inquiry.vehicle_config_id, null);
    assert.equal(inquiry.vehicle_details.model, "Customer-described model");
    await assert.rejects(
      db.query(
        "select public.create_inquiry_v2('qa@example.invalid',null,'Missing vehicle description',null,null,'{}')",
      ),
      /Vehicle details required/,
    );
    await db.exec(
      "insert into public.vehicle_generations(id,model_id,name,year_start,year_end) values('qa-generation','opel-astra','QA generation',2020,2024);update public.vehicle_configs set generation_id='qa-generation' where id='opel-astra-2021-0'",
    );
    await assert.rejects(
      db.exec(
        "update public.vehicle_configs set generation_id='qa-generation' where id='peugeot-301-2021-0'",
      ),
      /Generation must match/,
    );
    await assert.rejects(
      db.exec(
        "update public.vehicle_generations set year_start=2022 where id='qa-generation'",
      ),
      /invalidate existing/,
    );

    const slides = [
      {
        id: "00000000-0000-4000-8000-000000000101",
        path: "00000000-0000-4000-8000-000000000201.jpg",
        alt: { ar: "شريحة أولى", en: "First slide" },
        enabled: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000102",
        path: "00000000-0000-4000-8000-000000000202.jpg",
        alt: { ar: "شريحة ثانية", en: "Second slide" },
        enabled: false,
      },
    ];
    await db.query(
      "select public.admin_save_hero_slides($1,$2::jsonb,6,true)",
      [uid, JSON.stringify(slides)],
    );
    const savedSlides = await db.query<{
      id: string;
      enabled: boolean;
      position: number;
    }>("select id,enabled,position from public.hero_slides order by position");
    assert.deepEqual(
      savedSlides.rows.map((s) => [s.enabled, s.position]),
      [
        [true, 0],
        [false, 1],
      ],
    );
    await assert.rejects(
      db.query(
        "select public.admin_save_hero_slides('00000000-0000-4000-8000-000000000011','[]',6,true)",
      ),
      /Forbidden/,
    );
    await assert.rejects(
      db.query("select public.admin_save_hero_slides($1,$2::jsonb,6,true)", [
        uid,
        JSON.stringify([slides[0], slides[0]]),
      ]),
    );
    assert.equal(
      (await db.query("select * from public.hero_slides")).rows.length,
      2,
    );
    await db.exec(
      "create function public.fail_hero_audit() returns trigger language plpgsql as $$begin raise exception 'Hero audit failure';end$$;create trigger hero_audit_failure before insert on public.admin_audit_logs for each row execute function public.fail_hero_audit()",
    );
    await assert.rejects(
      db.query("select public.admin_save_hero_slides($1,'[]',9,false)", [uid]),
      /Hero audit failure/,
    );
    assert.equal(
      (await db.query("select * from public.hero_slides")).rows.length,
      2,
    );
    await db.exec(
      "drop trigger hero_audit_failure on public.admin_audit_logs;drop function public.fail_hero_audit();set role anon",
    );
    await assert.rejects(db.query("select * from public.hero_slides"));
    await assert.rejects(
      db.query(
        "select public.admin_save_hero_slides('00000000-0000-4000-8000-000000000010','[]',6,true)",
      ),
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
