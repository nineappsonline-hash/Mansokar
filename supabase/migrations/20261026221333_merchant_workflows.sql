create table public.customer_notes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),author uuid not null references auth.users(id),body text not null check(length(body) between 1 and 3000),created_at timestamptz not null default now());
create index customer_notes_user_date_idx on public.customer_notes(user_id,created_at desc);
alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from anon,authenticated;
grant all on public.customer_notes to service_role;
alter table public.order_items add column cost_snapshot bigint check(cost_snapshot>=0);
-- Cost is private and immutable at order creation; historical missing costs stay unknown.
revoke all on public.order_items from anon,authenticated;
create index orders_reporting_idx on public.orders(created_at,id) where not demo;
create index campaigns_schedule_idx on public.campaigns(starts_at,ends_at) where enabled;
create or replace function public.place_order(p_key uuid,p_items jsonb,p_customer jsonb,p_area text,p_coupon text,p_vehicle text,p_user uuid,p_demo_allowed boolean) returns jsonb language plpgsql set search_path='' as $$
declare o public.orders; a public.shipping_areas; c public.coupons; p public.products; line jsonb; q integer; sub bigint:=0; disc bigint:=0; is_demo boolean:=false; eligible_sub bigint:=0;free_threshold bigint; h text; oid uuid; token text;
begin
h:=md5(jsonb_build_object('items',p_items,'customer',p_customer,'area',p_area,'coupon',p_coupon,'vehicle',p_vehicle,'user',p_user)::text);
perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
select * into o from public.orders where idempotency_key=p_key;
if found then if o.request_hash<>h then raise exception 'Idempotency key reused with different request';end if;return jsonb_build_object('token',o.public_token);end if;
if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>40 then raise exception 'Invalid cart';end if;
if length(coalesce(p_customer->>'name',''))<2 or coalesce(p_customer->>'phone','')!~'^01[0125][0-9]{8}$' or length(coalesce(p_customer->>'address',''))<10 then raise exception 'Invalid customer details';end if;
select * into a from public.shipping_areas where id=p_area and enabled and starts_at<=now() and (ends_at is null or ends_at>now()) for share;
if not found then raise exception 'Delivery area is not configured';end if;
for line in select * from jsonb_array_elements(p_items) loop
q:=(line->>'qty')::integer;if q<1 or q>99 then raise exception 'Invalid quantity';end if;
select * into p from public.products where id=line->>'id' and status='published' and orderable for share;
if not found then raise exception 'Product unavailable';end if;
if p.demo and not p_demo_allowed then raise exception 'Demo checkout prohibited';end if;
is_demo:=is_demo or p.demo;sub:=sub+coalesce(p.sale,p.price)*q;
end loop;
if p_coupon is not null and p_coupon<>'' then
select * into c from public.coupons where code=upper(p_coupon) and starts_at<=now() and ends_at>now() and redemptions<max_redemptions for update;
if not found then raise exception 'Invalid or expired coupon';end if;
if c.per_customer_limit is not null and (select count(*) from public.coupon_redemptions r join public.orders ord on ord.id=r.order_id where r.code=c.code and ((p_user is not null and ord.user_id=p_user) or ord.customer->>'phone'=p_customer->>'phone'))>=c.per_customer_limit then raise exception 'Invalid or expired coupon';end if;
select coalesce(sum(coalesce(prod.sale,prod.price)*(item->>'qty')::integer),0) into eligible_sub from jsonb_array_elements(p_items) item join public.products prod on prod.id=item->>'id' where c.scope_category is null or prod.category=c.scope_category;
if eligible_sub=0 then raise exception 'Invalid or expired coupon';end if;
disc:=least(eligible_sub,case when c.kind='fixed' then c.amount else eligible_sub*c.amount/100 end);
update public.coupons set redemptions=redemptions+1 where code=c.code;
end if;
select (value->>'free_shipping_threshold')::bigint into free_threshold from public.site_settings where key='shipping' and (value->>'free_shipping_threshold')::bigint>=0;
if free_threshold is not null and sub-disc>=free_threshold then a.amount:=0;end if;
if p_customer ? 'review_total' and (p_customer->>'review_total')::bigint<>sub-disc+a.amount then raise exception 'Order total changed. Review your order again.';end if;
insert into public.orders(idempotency_key,request_hash,user_id,customer,shipping,subtotal,discount,shipping_amount,total,demo) values(p_key,h,p_user,p_customer,to_jsonb(a),sub,disc,a.amount,sub-disc+a.amount,is_demo) returning id,public_token into oid,token;
for line in select * from jsonb_array_elements(p_items) loop
select * into p from public.products where id=line->>'id';
insert into public.order_items(order_id,product_id,snapshot,quantity,vehicle_config_id,cost_snapshot) values(oid,p.id,jsonb_build_object('sku',p.sku,'name',p.name,'manufacturer',p.manufacturer,'category',p.category,'price',coalesce(p.sale,p.price),'vehicle',(select to_jsonb(cfg) from public.vehicle_configs cfg where cfg.id=p_vehicle)),(line->>'qty')::integer,p_vehicle,p.cost);
end loop;
if c.code is not null then insert into public.coupon_redemptions values(oid,c.code);end if;
insert into public.order_status_events(order_id,status) values(oid,'pending_confirmation');
if p_user is not null then delete from public.member_carts where user_id=p_user;end if;
return jsonb_build_object('token',token);
end $$;

-- Service-only dispatcher: every successful admin write and its audit record share a transaction.
create or replace function public.admin_commit(p_actor uuid,p_action text,p_payload jsonb) returns void language plpgsql set search_path='' as $$
declare tbl text;pk text;cols text;updates text;
begin
 if not exists(select 1 from public.admins where user_id=p_actor and enabled) then raise exception 'Forbidden';end if;
 case p_action
 when 'admin-customer-note' then insert into public.customer_notes(user_id,author,body) values((p_payload->>'user_id')::uuid,p_actor,p_payload->>'body');
 when 'admin-relations' then
  perform 1 from public.products where id=p_payload->>'product' for update;
  if not found then raise exception 'Unknown product';end if;
  delete from public.product_relations where product_id=p_payload->>'product';
  insert into public.product_relations(product_id,related_id,kind) select p_payload->>'product',r->>'id',r->>'kind' from jsonb_array_elements(p_payload->'relations') r;
 when 'admin-fitments' then perform public.replace_fitments(p_payload->>'product',array(select jsonb_array_elements_text(p_payload->'vehicles')));
 when 'admin-import' then perform public.import_products(p_payload);
 when 'admin-images' then perform public.replace_product_images(p_payload->>'product',p_payload->'images');
 when 'admin-collect-cod' then perform public.reconcile_cod((p_payload->>'id')::uuid);
 when 'admin-order' then
  perform 1 from public.orders where id=(p_payload->>'id')::uuid for update;
  if not found then raise exception 'Unknown order';end if;
  if (select status from public.orders where id=(p_payload->>'id')::uuid)<>p_payload->>'status' then perform public.transition_order((p_payload->>'id')::uuid,p_payload->>'status');end if;
  update public.orders set carrier=coalesce(p_payload->>'carrier',carrier),tracking_number=coalesce(p_payload->>'tracking_number',tracking_number),staff_notes=coalesce(p_payload->>'staff_notes',staff_notes) where id=(p_payload->>'id')::uuid;
 when 'admin-inquiry' then update public.part_requests set status=p_payload->>'status',quoted_amount=coalesce((p_payload->>'quoted_amount')::bigint,quoted_amount),staff_notes=coalesce(p_payload->>'staff_notes',staff_notes) where id=(p_payload->>'id')::uuid;
 else
  case p_action
   when 'admin-campaign' then tbl:='campaigns';pk:='id';
   when 'admin-product' then tbl:='products';pk:='sku';
   when 'admin-shipping' then tbl:='shipping_areas';pk:='id';
   when 'admin-cms' then tbl:='cms_pages';pk:='slug';
   when 'admin-settings' then tbl:='site_settings';pk:='key';p_payload:=jsonb_build_object('key','storefront','value',coalesce((select value from public.site_settings where key='storefront'),'{}'::jsonb)||p_payload);
   when 'admin-free-shipping' then tbl:='site_settings';pk:='key';p_payload:=jsonb_build_object('key','shipping','value',p_payload);
   when 'admin-coupon' then tbl:='coupons';pk:='code';
   when 'admin-vehicle' then tbl:='vehicle_configs';pk:='id';
   when 'admin-generation' then tbl:='vehicle_generations';pk:='id';
   when 'admin-model' then tbl:='vehicle_models';pk:='id';
   when 'admin-taxonomy' then
    if p_payload->>'kind'='manufacturer' then tbl:='manufacturers';pk:='name';p_payload:=jsonb_build_object('name',p_payload->>'name');
    else tbl:='categories';pk:='slug';p_payload:=(p_payload-'kind'-'localized')||jsonb_build_object('name',p_payload->'localized');end if;
   else raise exception 'Unknown operation';
  end case;
  if p_payload->>pk is null then raise exception 'Missing record key';end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where not exists(select 1 from pg_attribute a where a.attrelid=('public.'||tbl)::regclass and a.attname=k and a.attnum>0 and not a.attisdropped)) then raise exception 'Invalid field';end if;
  select string_agg(format('%I',k),','),string_agg(format('%I=excluded.%I',k,k),',') filter(where k<>pk) into cols,updates from jsonb_object_keys(p_payload) k;
  execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(%I) %s',tbl,cols,cols,tbl,pk,case when updates is null then 'do nothing' else 'do update set '||updates end) using p_payload;
 end case;
 insert into public.admin_audit_logs(user_id,action,details) values(p_actor,p_action,jsonb_build_object('record',coalesce(p_payload->>'id',p_payload->>'sku',p_payload->>'slug',p_payload->>'code',p_payload->>'product'),'rows',case when jsonb_typeof(p_payload)='array' then jsonb_array_length(p_payload) else null end));
end $$;
revoke all on function public.admin_commit(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit(uuid,text,jsonb) to service_role;
