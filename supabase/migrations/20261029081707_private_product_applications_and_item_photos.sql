create or replace function public.import_products(p_rows jsonb) returns void language plpgsql set search_path='' as $$
declare r jsonb;v public.products;pid text;
begin
for r in select * from jsonb_array_elements(p_rows) loop
 select * into v from public.products where sku=r->>'sku' for update;
 if found then r:=to_jsonb(v)||r;else r:=jsonb_build_object('id',gen_random_uuid()::text,'created_at',now(),'specs','{}'::jsonb,'editorial','{}'::jsonb,'partNumbers','[]'::jsonb,'synonyms','{"ar":[],"en":[]}'::jsonb,'seo','{}'::jsonb,'policy_refs','[]'::jsonb,'condition','new')||r;end if;
 insert into public.products select * from jsonb_populate_record(null::public.products,r) on conflict(sku) do update set slug=excluded.slug,name=excluded.name,description=excluded.description,manufacturer=excluded.manufacturer,category=excluded.category,family=excluded.family,type=excluded.type,price=excluded.price,sale=excluded.sale,"partNumber"=excluded."partNumber",demo=excluded.demo,orderable=excluded.orderable,status=excluded.status,specs=excluded.specs,cost=excluded.cost,warranty=excluded.warranty,editorial=excluded.editorial,"partNumbers"=excluded."partNumbers",synonyms=excluded.synonyms,seo=excluded.seo,policy_refs=excluded.policy_refs returning id into pid;
 if r ? 'fitments' then perform public.replace_fitments(pid,array(select jsonb_array_elements_text(r->'fitments')));end if;
 if r ? 'images' then perform public.replace_product_images(pid,r->'images');end if;
end loop;end $$;
revoke select(description,specs,seo,editorial,synonyms) on public.products from anon,authenticated;

