-- Catalog and merchant-controlled content. No live products, prices, tax rates or policies are seeded.
alter table public.products add column "partNumbers" jsonb not null default '[]',add column synonyms jsonb not null default '{"ar":[],"en":[]}',add column seo jsonb not null default '{}',add column policy_refs jsonb not null default '[]',add column condition text not null default 'new' check(condition='new');
update public.products set "partNumbers"=jsonb_build_array("partNumber");
alter table public.categories add column parent_slug text references public.categories(slug),add column sort_order integer not null default 0,add column description jsonb not null default '{}',add column seo jsonb not null default '{}';
alter table public.vehicle_models add column sort_order integer not null default 0;
create table public.vehicle_generations(id text primary key,model_id text not null references public.vehicle_models(id),name text not null,year_start integer not null,year_end integer not null,check(year_end>=year_start));
alter table public.vehicle_configs add column generation_id text references public.vehicle_generations(id),add column engine_code text,add column engine_capacity integer check(engine_capacity>0),add column body text,add column trim text;
alter table public.vehicle_configs drop constraint vehicle_configs_model_id_year_engine_key;
create unique index configs_exact_unique on public.vehicle_configs(model_id,year,engine,coalesce(engine_code,''),coalesce(body,''),coalesce(trim,''),coalesce(generation_id,''));
alter table public.garage_vehicles add column is_active boolean not null default false;
create unique index one_active_garage on public.garage_vehicles(user_id) where is_active;
create table public.product_relations(product_id text not null references public.products(id) on delete cascade,related_id text not null references public.products(id) on delete cascade,kind text not null check(kind in ('alternative','together')),primary key(product_id,related_id,kind),check(product_id<>related_id));
create table public.campaigns(id uuid primary key default gen_random_uuid(),title jsonb not null,body jsonb not null default '{}',image text,href text,starts_at timestamptz not null,ends_at timestamptz not null,enabled boolean not null default false,check(ends_at>starts_at));
alter table public.part_requests alter column vehicle_config_id drop not null;
alter table public.part_requests add column vehicle_details jsonb not null default '{}',add column quoted_amount bigint check(quoted_amount>=0),add column staff_notes text;
alter table public.cms_pages add column seo jsonb not null default '{}';
create sequence public.order_number_seq;
alter table public.orders add column order_number text unique default ('MKS-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.order_number_seq')::text,7,'0')),add column tracking_number text,add column carrier text,add column staff_notes text not null default '',add column tax_amount bigint not null default 0 check(tax_amount>=0);
alter table public.order_status_events add column note text,add column actor uuid references auth.users(id);
create table public.notification_outbox(id uuid primary key default gen_random_uuid(),kind text not null,recipient text not null,locale text not null default 'ar',payload jsonb not null,status text not null default 'pending' check(status in ('pending','sending','sent','failed')),attempts integer not null default 0,available_at timestamptz not null default now(),created_at timestamptz not null default now(),sent_at timestamptz,last_error text);
create index outbox_pending_idx on public.notification_outbox(available_at) where status in ('pending','sending');
create table public.tracking_challenges(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),code_hash text not null,attempts integer not null default 0,expires_at timestamptz not null,used_at timestamptz);
create table public.manual_transfers(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),method text not null check(method in ('instapay','wallet')),reference text not null,proof_path text,amount bigint not null check(amount>0),status text not null default 'pending' check(status in ('pending','verified','rejected')),created_at timestamptz not null default now());
create table public.refunds(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),amount bigint not null check(amount>0),reason text not null,status text not null default 'requested' check(status in ('requested','processing','refunded','failed')),reference text unique,idempotency_key uuid not null unique,actor uuid not null references auth.users(id),created_at timestamptz not null default now());
create index refunds_order_idx on public.refunds(order_id);
create index status_events_order_idx on public.order_status_events(order_id,created_at);
create index requests_date_idx on public.part_requests(created_at);
create index orders_date_idx on public.orders(created_at);
do $$declare t text;begin foreach t in array array['vehicle_generations','product_relations','campaigns','notification_outbox','tracking_challenges','manual_transfers','refunds'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
grant usage,select on sequence public.order_number_seq to service_role;
grant select on public.vehicle_generations to anon,authenticated;
create policy generations_public on public.vehicle_generations for select to anon,authenticated using(true);
grant select("partNumbers",synonyms,seo,policy_refs,condition) on public.products to anon,authenticated;
grant select(parent_slug,sort_order,description,seo) on public.categories to anon,authenticated;

create or replace function public.import_products(p_rows jsonb) returns void language plpgsql set search_path='' as $$
declare r jsonb;v public.products;pid text;
begin
for r in select * from jsonb_array_elements(p_rows) loop
 select * into v from public.products where sku=r->>'sku' for update;
 if found then r:=to_jsonb(v)||r;else r:=jsonb_build_object('id',gen_random_uuid()::text,'created_at',now(),'specs','{}'::jsonb,'editorial','{}'::jsonb,'partNumbers','[]'::jsonb,'synonyms','{"ar":[],"en":[]}'::jsonb,'seo','{}'::jsonb,'policy_refs','[]'::jsonb,'condition','new')||r;end if;
 insert into public.products select * from jsonb_populate_record(null::public.products,r) on conflict(sku) do update set slug=excluded.slug,name=excluded.name,description=excluded.description,manufacturer=excluded.manufacturer,category=excluded.category,family=excluded.family,type=excluded.type,price=excluded.price,sale=excluded.sale,"partNumber"=excluded."partNumber",demo=excluded.demo,orderable=excluded.orderable,status=excluded.status,specs=excluded.specs,cost=excluded.cost,warranty=excluded.warranty,editorial=excluded.editorial,"partNumbers"=excluded."partNumbers",synonyms=excluded.synonyms,seo=excluded.seo,policy_refs=excluded.policy_refs returning id into pid;
 if r ? 'fitments' then perform public.replace_fitments(pid,array(select jsonb_array_elements_text(r->'fitments')));end if;
end loop;end $$;

create or replace function public.normalize_search(value text) returns text language sql immutable strict parallel safe set search_path='' as $$select lower(regexp_replace(translate(replace(value,'ـ',''),'أإآىéèêëÉÈÊËáàäâÁÀÄÂöóôÖÓÔüúûÜÚÛ','ااايeeeeeeeeaaaaaaaaoooooouuuuuu'),'[^0-9A-Za-zء-ي٠-٩]','','g'))$$;
create index product_numbers_gin on public.products using gin("partNumbers");
create or replace function public.search_products(p_query text default '',p_vehicle text default null,p_category text default null,p_manufacturer text default null,p_type text default null,p_min bigint default null,p_max bigint default null,p_offers boolean default false,p_sort text default '',p_page integer default 1,p_size integer default 12) returns jsonb language sql stable set search_path='' as $$
with filtered as (
 select to_jsonb(p)-'cost' as product,p.id,p.created_at,coalesce(p.sale,p.price) as amount,
 (public.normalize_search(p."partNumber")=public.normalize_search(left(p_query,100)) or exists(select 1 from jsonb_array_elements_text(p."partNumbers") n where public.normalize_search(n)=public.normalize_search(left(p_query,100))))::integer exact_match,
 ts_rank(to_tsvector('simple'::regconfig,p.name::text||' '||p."partNumber"||' '||p.synonyms::text),plainto_tsquery('simple'::regconfig,left(p_query,100))) as rank
 from public.products p where p.status='published'
 and (coalesce(p_query,'')='' or public.normalize_search(p.name::text||' '||p."partNumber"||' '||p."partNumbers"::text||' '||p.synonyms::text||' '||p.sku) like '%'||public.normalize_search(left(p_query,100))||'%')
 and (p_vehicle is null or exists(select 1 from public.product_fitments f where f.product_id=p.id and f.vehicle_config_id=p_vehicle))
 and (p_category is null or p.category=p_category) and (p_manufacturer is null or p.manufacturer=p_manufacturer) and (p_type is null or p.type=p_type)
 and (p_min is null or coalesce(p.sale,p.price)>=p_min) and (p_max is null or coalesce(p.sale,p.price)<=p_max) and (not p_offers or p.sale is not null)
),paged as(select * from filtered order by exact_match desc,case when p_sort='price-asc' then amount end asc,case when p_sort='price-desc' then amount end desc,case when p_sort='newest' then created_at end desc,rank desc,id limit least(greatest(p_size,1),48) offset ((least(greatest(p_page,1),10000)-1)*least(greatest(p_size,1),48)))
select jsonb_build_object('total',(select count(*) from filtered),'products',coalesce((select jsonb_agg(product) from paged),'[]'::jsonb)) $$;

create function public.garage_change(p_user uuid,p_action text,p_vehicle text default null,p_id uuid default null,p_nickname text default null) returns jsonb language plpgsql set search_path='' as $$
declare selected text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,33));
 if p_action='delete' then delete from public.garage_vehicles where id=p_id and user_id=p_user;
 elsif p_action in ('save','active') then
  if p_action='active' then update public.garage_vehicles set is_active=false where user_id=p_user;end if;
  if p_id is not null then update public.garage_vehicles set vehicle_config_id=p_vehicle,nickname=p_nickname where id=p_id and user_id=p_user;if not found then raise exception 'Vehicle not found';end if;
  else insert into public.garage_vehicles(user_id,vehicle_config_id,nickname,is_active) values(p_user,p_vehicle,p_nickname,p_action='active') on conflict(user_id,vehicle_config_id) do update set nickname=coalesce(excluded.nickname,public.garage_vehicles.nickname),is_active=case when p_action='active' then true else public.garage_vehicles.is_active end;end if;
 else raise exception 'Invalid garage action';end if;
 if not exists(select 1 from public.garage_vehicles where user_id=p_user and is_active) then update public.garage_vehicles set is_active=true where id=(select id from public.garage_vehicles where user_id=p_user order by id limit 1);end if;
 select vehicle_config_id into selected from public.garage_vehicles where user_id=p_user and is_active;
 return jsonb_build_object('vehicle',selected);
end $$;
revoke execute on function public.garage_change(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.garage_change(uuid,text,text,uuid,text) to service_role;
