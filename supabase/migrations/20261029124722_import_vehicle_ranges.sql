alter table public.vehicle_brands drop constraint vehicle_brands_slug_check;
alter table public.vehicle_brands add constraint vehicle_brands_slug_check check(slug ~ '^[a-z0-9-]+$');
-- Model/year registrations have no invented engine configuration or fitment.
create table public.vehicle_model_years(model_id text not null references public.vehicle_models(id) on delete cascade, year integer not null check(year between 1950 and 2100), primary key(model_id,year));
alter table public.vehicle_model_years enable row level security;
grant select on public.vehicle_model_years to anon,authenticated;
create policy model_years_read on public.vehicle_model_years for select using(true);
grant all on public.vehicle_model_years to service_role;
create function public.register_product_model_years() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.vehicle_model_years(model_id,year)
 select substring(s.key from 11),y::integer from jsonb_each_text(new.specs) s cross join lateral unnest(string_to_array(s.value,',')) y
 where s.key like 'car_years:%' and y ~ '^[0-9]{4}$' and exists(select 1 from public.vehicle_models m where m.id=substring(s.key from 11))
 on conflict do nothing;
 return new;
end $$;
create trigger register_product_model_years after insert or update of specs on public.products for each row execute function public.register_product_model_years();
insert into public.vehicle_model_years select distinct model_id,year from public.vehicle_configs on conflict do nothing;
insert into public.vehicle_model_years select substring(s.key from 11),y::integer from public.products p cross join lateral jsonb_each_text(p.specs) s cross join lateral unnest(string_to_array(s.value,',')) y where s.key like 'car_years:%' and y ~ '^[0-9]{4}$' and exists(select 1 from public.vehicle_models m where m.id=substring(s.key from 11)) on conflict do nothing;
create or replace function public.import_products(p_rows jsonb) returns void language plpgsql set search_path='' as $$
declare m jsonb;r jsonb;v public.products;pid text;
begin
for r in select * from jsonb_array_elements(p_rows) loop
 for m in select * from jsonb_array_elements(coalesce(r->'_vehicle_models','[]'::jsonb)) loop
 insert into public.vehicle_brands(slug,name) values(m->>'brand',m->>'make_name') on conflict(slug) do nothing;
 insert into public.vehicle_models(id,brand,slug,name) values(m->>'id',m->>'brand',m->>'slug',m->'name') on conflict(brand,slug) do nothing;
 if not exists(select 1 from public.vehicle_models where id=m->>'id' and brand=m->>'brand' and slug=m->>'slug') then raise exception 'Car model changed during import. Preview again.';end if;
 end loop;
 select * into v from public.products where sku=r->>'sku' for update;
 if found then r:=to_jsonb(v)||r;else r:=jsonb_build_object('id',gen_random_uuid()::text,'created_at',now(),'specs','{}'::jsonb,'editorial','{}'::jsonb,'partNumbers','[]'::jsonb,'synonyms','{"ar":[],"en":[]}'::jsonb,'seo','{}'::jsonb,'policy_refs','[]'::jsonb,'condition','new')||r;end if;
 insert into public.products select * from jsonb_populate_record(null::public.products,r) on conflict(sku) do update set slug=excluded.slug,name=excluded.name,description=excluded.description,manufacturer=excluded.manufacturer,category=excluded.category,family=excluded.family,type=excluded.type,price=excluded.price,sale=excluded.sale,"partNumber"=excluded."partNumber",demo=excluded.demo,orderable=excluded.orderable,status=excluded.status,specs=excluded.specs,cost=excluded.cost,warranty=excluded.warranty,editorial=excluded.editorial,"partNumbers"=excluded."partNumbers",synonyms=excluded.synonyms,seo=excluded.seo,policy_refs=excluded.policy_refs returning id into pid;
 if r ? 'fitments' then perform public.replace_fitments(pid,array(select jsonb_array_elements_text(r->'fitments')));end if;
 if r ? 'images' then perform public.replace_product_images(pid,r->'images');end if;
end loop;end $$;
