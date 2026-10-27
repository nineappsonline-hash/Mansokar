create function public.normalize_search(value text) returns text language sql immutable strict parallel safe set search_path='' as $$select lower(regexp_replace(translate(replace(value,'ـ',''),'أإآى','اااي'),'[^0-9A-Za-zء-ي٠-٩]','','g'))$$;
create index products_search_fts_idx on public.products using gin(to_tsvector('simple'::regconfig,coalesce(name->>'ar','')||' '||coalesce(name->>'en','')||' '||"partNumber"));
create function public.search_products(p_query text default '',p_vehicle text default null,p_category text default null,p_manufacturer text default null,p_type text default null,p_min bigint default null,p_max bigint default null,p_offers boolean default false,p_sort text default '',p_page integer default 1,p_size integer default 12) returns jsonb language sql stable set search_path='' as $$
with filtered as (
 select p.id,p.sku,p.slug,p.name,p.description,p.manufacturer,p.category,p.family,p.type,p.price,p.sale,p."partNumber",p.demo,p.orderable,p.status,p.specs,p.warranty,p.editorial,p.created_at as sort_date,
 (public.normalize_search(p."partNumber")=public.normalize_search(left(p_query,100)))::integer as exact_match,
 ts_rank(to_tsvector('simple'::regconfig,coalesce(p.name->>'ar','')||' '||coalesce(p.name->>'en','')||' '||p."partNumber"),plainto_tsquery('simple'::regconfig,left(p_query,100))) as rank
 from public.products p where p.status='published'
 and (coalesce(p_query,'')='' or public.normalize_search(coalesce(p.name->>'ar','')||' '||coalesce(p.name->>'en','')||' '||p."partNumber"||' '||p.sku) like '%'||public.normalize_search(left(p_query,100))||'%')
 and (p_vehicle is null or exists(select 1 from public.product_fitments f where f.product_id=p.id and f.vehicle_config_id=p_vehicle))
 and (p_category is null or p.category=p_category) and (p_manufacturer is null or p.manufacturer=p_manufacturer) and (p_type is null or p.type=p_type)
 and (p_min is null or coalesce(p.sale,p.price)>=p_min) and (p_max is null or coalesce(p.sale,p.price)<=p_max)
 and (not p_offers or p.sale is not null)
),paged as (
 select * from filtered order by exact_match desc,
 case when p_sort='price-asc' then coalesce(sale,price) end asc,
 case when p_sort='price-desc' then coalesce(sale,price) end desc,case when p_sort='newest' then sort_date end desc,rank desc,id asc
 limit least(greatest(p_size,1),48) offset ((least(greatest(p_page,1),10000)-1)*least(greatest(p_size,1),48))
)
select jsonb_build_object('total',(select count(*) from filtered),'products',coalesce((select jsonb_agg(to_jsonb(paged)-'exact_match'-'rank'-'sort_date') from paged),'[]'::jsonb))
$$;
revoke execute on function public.normalize_search(text),public.search_products(text,text,text,text,text,bigint,bigint,boolean,text,integer,integer) from public,anon,authenticated;
grant execute on function public.normalize_search(text),public.search_products(text,text,text,text,text,bigint,bigint,boolean,text,integer,integer) to service_role;
