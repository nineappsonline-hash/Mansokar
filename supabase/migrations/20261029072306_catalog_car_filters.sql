create or replace function public.search_products_by_car(p_query text default '',p_vehicle text default null,p_category text default null,p_manufacturer text default null,p_type text default null,p_min bigint default null,p_max bigint default null,p_offers boolean default false,p_sort text default '',p_page integer default 1,p_size integer default 12,p_make text default null,p_model text default null,p_year integer default null) returns jsonb language sql stable set search_path='' as $$
with recursive category_scope as(select slug from public.categories where slug=p_category union select c.slug from public.categories c join category_scope parent on c.parent_slug=parent.slug),filtered as (
 select to_jsonb(p)-'cost' as product,p.id,p.created_at,coalesce(p.sale,p.price) as amount,
 (public.normalize_search(p."partNumber")=public.normalize_search(left(p_query,100)) or exists(select 1 from jsonb_array_elements_text(p."partNumbers") n where public.normalize_search(n)=public.normalize_search(left(p_query,100))))::integer exact_match,
 ts_rank(to_tsvector('simple'::regconfig,p.name::text||' '||p."partNumber"||' '||p.synonyms::text),plainto_tsquery('simple'::regconfig,left(p_query,100))) as rank
 from public.products p where p.status='published'
 and ((p_make is null and p_model is null and p_year is null)
 or exists(select 1 from public.vehicle_models m where (p_make is null or m.brand=p_make) and (p_model is null or m.slug=p_model)
 and coalesce(p.specs->>('car_years:'||m.id),'')<>'' and (p_year is null or p_year::text=any(string_to_array(p.specs->>('car_years:'||m.id),','))))
 or exists(select 1 from public.product_fitments f join public.vehicle_configs c on c.id=f.vehicle_config_id join public.vehicle_models m on m.id=c.model_id where f.product_id=p.id and (p_make is null or m.brand=p_make) and (p_model is null or m.slug=p_model) and (p_year is null or c.year=p_year)))
 and (coalesce(p_query,'')='' or public.normalize_search(p.name::text||' '||p."partNumber"||' '||p."partNumbers"::text||' '||p.synonyms::text||' '||p.sku) like '%'||public.normalize_search(left(p_query,100))||'%')
 and (p_vehicle is null or exists(select 1 from public.product_fitments f where f.product_id=p.id and f.vehicle_config_id=p_vehicle))
 and (p_category is null or p.category in(select slug from category_scope)) and (p_manufacturer is null or p.manufacturer=p_manufacturer) and (p_type is null or p.type=p_type)
 and (p_min is null or coalesce(p.sale,p.price)>=p_min) and (p_max is null or coalesce(p.sale,p.price)<=p_max) and (not p_offers or p.sale is not null)
),paged as(select * from filtered order by exact_match desc,case when p_sort='price-asc' then amount end asc,case when p_sort='price-desc' then amount end desc,case when p_sort='newest' then created_at end desc,rank desc,id limit least(greatest(p_size,1),48) offset ((least(greatest(p_page,1),10000)-1)*least(greatest(p_size,1),48)))
select jsonb_build_object('total',(select count(*) from filtered),'products',coalesce((select jsonb_agg(product) from paged),'[]'::jsonb)) $$;
revoke all on function public.search_products_by_car(text,text,text,text,text,bigint,bigint,boolean,text,integer,integer,text,text,integer) from public,anon,authenticated;
grant execute on function public.search_products_by_car(text,text,text,text,text,bigint,bigint,boolean,text,integer,integer,text,text,integer) to service_role;
