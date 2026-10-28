create or replace function public.admin_save_hero_slides(p_actor uuid,p_slides jsonb,p_interval integer,p_autoplay boolean) returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.admins where user_id=p_actor and enabled) then raise exception 'Forbidden';end if;
 if p_slides is null or jsonb_typeof(p_slides)<>'array' or jsonb_array_length(p_slides)>10 or p_interval not between 3 and 30 or p_interval is null or p_autoplay is null then raise exception 'Invalid slideshow settings';end if;
 perform pg_advisory_xact_lock(5502141);
 delete from public.hero_slides where position between 0 and 9;
 insert into public.hero_slides(id,path,alt,enabled,position) select (s->>'id')::uuid,s->>'path',s->'alt',(s->>'enabled')::boolean,(n-1)::integer from jsonb_array_elements(p_slides) with ordinality as t(s,n);
 insert into public.site_settings(key,value) values('hero_slideshow',jsonb_build_object('intervalSeconds',p_interval,'autoplay',p_autoplay)) on conflict(key) do update set value=excluded.value;
 insert into public.admin_audit_logs(user_id,action,details) values(p_actor,'admin-hero-slides',jsonb_build_object('slides',jsonb_array_length(p_slides),'intervalSeconds',p_interval,'autoplay',p_autoplay));
end $$;
