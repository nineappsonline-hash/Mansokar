
create table public.admins(user_id uuid primary key references auth.users(id), enabled boolean not null default true);
create table public.profiles(user_id uuid primary key references auth.users(id),name text,phone text,locale text check(locale in ('ar','en')));
create table public.vehicle_brands(slug text primary key check(slug in ('opel','peugeot','citroen','mg')),name text not null);
create table public.vehicle_models(id text primary key,brand text not null references public.vehicle_brands(slug),slug text not null,name jsonb not null,image text,unique(brand,slug));
create table public.vehicle_configs(id text primary key,model_id text not null references public.vehicle_models(id),year integer not null check(year between 1950 and 2100),engine text not null,unique(model_id,year,engine));
create table public.categories(slug text primary key,name jsonb not null);
create table public.manufacturers(name text primary key);
create table public.products(id text primary key default gen_random_uuid()::text,sku text not null unique,slug text not null unique,name jsonb not null,description jsonb not null,manufacturer text not null references public.manufacturers(name),category text not null references public.categories(slug),family text not null,type text not null check(type in ('oem','aftermarket')),price bigint not null check(price>=0),sale bigint check(sale>=0 and sale<price),"partNumber" text not null,demo boolean not null default true,orderable boolean not null default false,status text not null check(status in ('draft','published')),specs jsonb not null default '{}');
create index product_number_idx on public.products(lower(regexp_replace("partNumber",'[^a-zA-Z0-9]','','g')));
create table public.product_images(id uuid primary key default gen_random_uuid(),product_id text references public.products(id) on delete cascade,path text not null,alt jsonb not null,position integer not null default 0);
create table public.product_fitments(product_id text references public.products(id) on delete cascade,vehicle_config_id text references public.vehicle_configs(id),primary key(product_id,vehicle_config_id));
create index fitment_vehicle_idx on public.product_fitments(vehicle_config_id,product_id);
create table public.garage_vehicles(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),vehicle_config_id text not null references public.vehicle_configs(id),nickname text,unique(user_id,vehicle_config_id));
create table public.shipping_areas(id text primary key,governorate text not null,name text not null,enabled boolean not null default false,amount bigint not null check(amount>=0),starts_at timestamptz not null default now(),ends_at timestamptz,check(ends_at is null or ends_at>starts_at));
create table public.coupons(code text primary key,kind text not null check(kind in ('fixed','percentage')),amount integer not null check(amount>0),starts_at timestamptz not null,ends_at timestamptz not null,max_redemptions integer not null check(max_redemptions>0),redemptions integer not null default 0,per_customer_limit integer check(per_customer_limit>0),scope_category text references public.categories(slug),check(ends_at>starts_at),check(kind<>'percentage' or amount<=100));
create table public.orders(id uuid primary key default gen_random_uuid(),public_token text not null unique default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),idempotency_key uuid not null unique,request_hash text not null,user_id uuid references auth.users(id),customer jsonb not null,shipping jsonb not null,subtotal bigint not null,discount bigint not null,shipping_amount bigint not null,total bigint not null check(total>=0),demo boolean not null,status text not null default 'pending_confirmation' check(status in ('pending_confirmation','confirmed','processing','shipped','delivered','cancelled','returned')),payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','failed','refunded','partially_refunded')),created_at timestamptz not null default now());
create index orders_user_idx on public.orders(user_id,created_at);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),product_id text not null references public.products(id),snapshot jsonb not null,quantity integer not null check(quantity between 1 and 99),vehicle_config_id text references public.vehicle_configs(id));
create table public.coupon_redemptions(order_id uuid primary key references public.orders(id),code text not null references public.coupons(code));
create table public.payments(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders(id),provider text not null,reference text unique,amount bigint not null check(amount>=0),status text not null,idempotency_key text not null unique,created_at timestamptz not null default now());
create table public.payment_events(provider text not null,event_id text not null,metadata jsonb not null,processed_at timestamptz not null default now(),primary key(provider,event_id));
create table public.order_status_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),status text not null,created_at timestamptz not null default now());
create table public.part_requests(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),contact text not null,vehicle_config_id text references public.vehicle_configs(id),description text not null,consent boolean not null check(consent),status text not null default 'pending' check(status in ('pending','quoted','resolved','closed')),image_path text,created_at timestamptz not null default now());
create table public.cms_pages(slug text primary key,title jsonb not null,body jsonb not null,published boolean not null default false);
create table public.site_settings(key text primary key,value jsonb not null);
create table public.admin_audit_logs(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),action text not null,details jsonb not null,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,count integer not null,window_at timestamptz not null);
create function public.consume_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin insert into public.rate_limits as r values(p_key,1,now()) on conflict(key) do update set count=case when r.window_at<now()-interval '1 minute' then 1 else r.count+1 end,window_at=case when r.window_at<now()-interval '1 minute' then now() else r.window_at end returning count into n; return n<=p_limit; end $$;
create function public.place_order(p_key uuid,p_items jsonb,p_customer jsonb,p_area text,p_coupon text,p_vehicle text,p_user uuid,p_demo_allowed boolean) returns jsonb language plpgsql set search_path='' as $$
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
insert into public.orders(idempotency_key,request_hash,user_id,customer,shipping,subtotal,discount,shipping_amount,total,demo) values(p_key,h,p_user,p_customer,to_jsonb(a),sub,disc,a.amount,sub-disc+a.amount,is_demo) returning id,public_token into oid,token;
for line in select * from jsonb_array_elements(p_items) loop
select * into p from public.products where id=line->>'id';
insert into public.order_items(order_id,product_id,snapshot,quantity,vehicle_config_id) values(oid,p.id,jsonb_build_object('sku',p.sku,'name',p.name,'manufacturer',p.manufacturer,'price',coalesce(p.sale,p.price),'vehicle',(select to_jsonb(cfg) from public.vehicle_configs cfg where cfg.id=p_vehicle)),(line->>'qty')::integer,p_vehicle);
end loop;
if c.code is not null then insert into public.coupon_redemptions values(oid,c.code);end if;
insert into public.order_status_events(order_id,status) values(oid,'pending_confirmation');
if p_user is not null then delete from public.member_carts where user_id=p_user;end if;
return jsonb_build_object('token',token);
end $$;
create function public.replace_fitments(p_product text,p_vehicles text[]) returns void language plpgsql set search_path='' as $$
begin delete from public.product_fitments where product_id=p_product;insert into public.product_fitments select p_product,unnest(p_vehicles);end $$;
create function public.import_products(p_rows jsonb) returns void language plpgsql set search_path='' as $$
declare row jsonb;
begin
for row in select * from jsonb_array_elements(p_rows) loop
insert into public.products select * from jsonb_populate_record(null::public.products,jsonb_build_object('id',coalesce(row->>'id',gen_random_uuid()::text),'created_at',now(),'specs','{}'::jsonb,'editorial','{}'::jsonb)||row) on conflict(sku) do update set slug=excluded.slug,name=excluded.name,description=excluded.description,manufacturer=excluded.manufacturer,category=excluded.category,family=excluded.family,type=excluded.type,price=excluded.price,sale=excluded.sale,"partNumber"=excluded."partNumber",demo=excluded.demo,orderable=excluded.orderable,status=excluded.status,specs=excluded.specs;
if row ? 'fitments' then perform public.replace_fitments((select id from public.products where sku=row->>'sku'),array(select jsonb_array_elements_text(row->'fitments')));end if;
end loop;end $$;
create function public.transition_order(p_id uuid,p_status text) returns void language plpgsql set search_path='' as $$
declare old_status text;
begin select status into old_status from public.orders where id=p_id for update;
if not found then raise exception 'Unknown order';end if;
if not ((old_status='pending_confirmation' and p_status in ('confirmed','cancelled')) or (old_status='confirmed' and p_status in ('processing','cancelled')) or (old_status='processing' and p_status in ('shipped','cancelled')) or (old_status='shipped' and p_status='delivered') or (old_status='delivered' and p_status='returned')) then raise exception 'Invalid order status transition';end if;
update public.orders set status=p_status where id=p_id;
insert into public.order_status_events(order_id,status) values(p_id,p_status);end $$;
-- Only the server credential can call privileged operations or read full fitment mappings.
revoke all on all tables in schema public from anon,authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
do $$ declare t record;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t.tablename);end loop;end $$;
grant select on public.products,public.vehicle_brands,public.vehicle_models,public.vehicle_configs,public.categories,public.manufacturers to anon,authenticated;
create policy published_products on public.products for select to anon,authenticated using(status='published');
create policy read_brands on public.vehicle_brands for select to anon,authenticated using(true);
create policy read_models on public.vehicle_models for select to anon,authenticated using(true);
create policy read_configs on public.vehicle_configs for select to anon,authenticated using(true);
create policy read_categories on public.categories for select to anon,authenticated using(true);
create policy read_manufacturers on public.manufacturers for select to anon,authenticated using(true);
grant select,insert,update,delete on public.garage_vehicles,public.profiles to authenticated;
create policy own_garage on public.garage_vehicles for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_profile on public.profiles for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index garage_user_idx on public.garage_vehicles(user_id);
create index items_order_idx on public.order_items(order_id);
create index requests_user_idx on public.part_requests(user_id);
