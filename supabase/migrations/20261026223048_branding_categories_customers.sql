create table public.site_media(slot text primary key check(slot ~ '^(hero|logo|brand-(opel|peugeot|citroen|mg)-(photo|logo)|model-[a-z0-9-]+|campaign-[a-f0-9-]+)$'),path text not null check(path ~ '^[a-f0-9-]+\.jpg$'),alt jsonb not null);
alter table public.site_media enable row level security;
revoke all on public.site_media from anon,authenticated;
grant all on public.site_media to service_role;
create function public.check_category_parent() returns trigger language plpgsql set search_path='' as $$begin
 perform pg_advisory_xact_lock(1228834);
 if new.parent_slug is not null and (new.parent_slug=new.slug or exists(with recursive ancestors as(select slug,parent_slug from public.categories where slug=new.parent_slug union select c.slug,c.parent_slug from public.categories c join ancestors a on c.slug=a.parent_slug) select 1 from ancestors where slug=new.slug)) then raise exception 'Category hierarchy cannot contain cycles';end if;
 return new;
end $$;
revoke execute on function public.check_category_parent() from public,anon,authenticated;
create trigger category_parent_check before insert or update of parent_slug on public.categories for each row execute function public.check_category_parent();
-- Auth account discovery is narrowly projected, service-only and restricted to enabled admins.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;
create function private.customer_accounts(p_actor uuid,p_query text,p_page integer,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.admins where user_id=p_actor and enabled) then raise exception 'Forbidden';end if;
 with accounts as(select u.id as user_id,u.email,u.email_confirmed_at is not null as verified,p.name,p.phone,p.locale from auth.users u left join public.profiles p on p.user_id=u.id where (p_id is null or u.id=p_id) and (coalesce(p_query,'')='' or position(lower(left(p_query,100)) in lower(coalesce(u.email,'')||' '||coalesce(p.name,'')||' '||coalesce(p.phone,'')))>0)),paged as(select * from accounts order by user_id limit 50 offset (least(greatest(coalesce(p_page,1),1),10000)-1)*50)
 select jsonb_build_object('total',(select count(*) from accounts),'members',coalesce((select jsonb_agg(to_jsonb(p)) from paged p),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function private.customer_accounts(uuid,text,integer,uuid) from public,anon,authenticated;
grant execute on function private.customer_accounts(uuid,text,integer,uuid) to service_role;
create function public.admin_customer_accounts(p_actor uuid,p_query text default '',p_page integer default 1,p_id uuid default null) returns jsonb language sql set search_path='' as $$select private.customer_accounts(p_actor,p_query,p_page,p_id)$$;
revoke all on function public.admin_customer_accounts(uuid,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_customer_accounts(uuid,text,integer,uuid) to service_role;

create or replace function public.admin_commit(p_actor uuid,p_action text,p_payload jsonb) returns void language plpgsql set search_path='' as $$
declare tbl text;pk text;cols text;updates text;
begin
 if not exists(select 1 from public.admins where user_id=p_actor and enabled) then raise exception 'Forbidden';end if;
 case p_action
 when 'admin-site-media' then
  if nullif(p_payload->>'path','') is null then delete from public.site_media where slot=p_payload->>'slot';
  else insert into public.site_media(slot,path,alt) values(p_payload->>'slot',p_payload->>'path',p_payload->'alt') on conflict(slot) do update set path=excluded.path,alt=excluded.alt;end if;
 when 'admin-customer-profile' then
  insert into public.profiles(user_id,name,phone,locale) values((p_payload->>'user_id')::uuid,p_payload->>'name',p_payload->>'phone',p_payload->>'locale') on conflict(user_id) do update set name=excluded.name,phone=excluded.phone,locale=excluded.locale;
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
 insert into public.admin_audit_logs(user_id,action,details) values(p_actor,p_action,jsonb_build_object('record',coalesce(p_payload->>'id',p_payload->>'sku',p_payload->>'slug',p_payload->>'code',p_payload->>'product',p_payload->>'slot',p_payload->>'user_id'),'rows',case when jsonb_typeof(p_payload)='array' then jsonb_array_length(p_payload) else null end));
end $$;
revoke all on function public.admin_commit(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit(uuid,text,jsonb) to service_role;

create index categories_parent_sort_idx on public.categories(parent_slug,sort_order,slug);
create or replace function public.search_products(p_query text default '',p_vehicle text default null,p_category text default null,p_manufacturer text default null,p_type text default null,p_min bigint default null,p_max bigint default null,p_offers boolean default false,p_sort text default '',p_page integer default 1,p_size integer default 12) returns jsonb language sql stable set search_path='' as $$
with recursive category_scope as(select slug from public.categories where slug=p_category union select c.slug from public.categories c join category_scope parent on c.parent_slug=parent.slug),filtered as (
 select to_jsonb(p)-'cost' as product,p.id,p.created_at,coalesce(p.sale,p.price) as amount,
 (public.normalize_search(p."partNumber")=public.normalize_search(left(p_query,100)) or exists(select 1 from jsonb_array_elements_text(p."partNumbers") n where public.normalize_search(n)=public.normalize_search(left(p_query,100))))::integer exact_match,
 ts_rank(to_tsvector('simple'::regconfig,p.name::text||' '||p."partNumber"||' '||p.synonyms::text),plainto_tsquery('simple'::regconfig,left(p_query,100))) as rank
 from public.products p where p.status='published'
 and (coalesce(p_query,'')='' or public.normalize_search(p.name::text||' '||p."partNumber"||' '||p."partNumbers"::text||' '||p.synonyms::text||' '||p.sku) like '%'||public.normalize_search(left(p_query,100))||'%')
 and (p_vehicle is null or exists(select 1 from public.product_fitments f where f.product_id=p.id and f.vehicle_config_id=p_vehicle))
 and (p_category is null or p.category in(select slug from category_scope)) and (p_manufacturer is null or p.manufacturer=p_manufacturer) and (p_type is null or p.type=p_type)
 and (p_min is null or coalesce(p.sale,p.price)>=p_min) and (p_max is null or coalesce(p.sale,p.price)<=p_max) and (not p_offers or p.sale is not null)
),paged as(select * from filtered order by exact_match desc,case when p_sort='price-asc' then amount end asc,case when p_sort='price-desc' then amount end desc,case when p_sort='newest' then created_at end desc,rank desc,id limit least(greatest(p_size,1),48) offset ((least(greatest(p_page,1),10000)-1)*least(greatest(p_size,1),48)))
select jsonb_build_object('total',(select count(*) from filtered),'products',coalesce((select jsonb_agg(product) from paged),'[]'::jsonb)) $$;
