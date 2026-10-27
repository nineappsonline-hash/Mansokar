-- Service-only dispatcher: every successful admin write and its audit record share a transaction.
create function public.admin_commit(p_actor uuid,p_action text,p_payload jsonb) returns void language plpgsql set search_path='' as $$
declare tbl text;pk text;cols text;updates text;
begin
 if not exists(select 1 from public.admins where user_id=p_actor and enabled) then raise exception 'Forbidden';end if;
 case p_action
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
   when 'admin-product' then tbl:='products';pk:='sku';
   when 'admin-shipping' then tbl:='shipping_areas';pk:='id';
   when 'admin-cms' then tbl:='cms_pages';pk:='slug';
   when 'admin-settings' then tbl:='site_settings';pk:='key';p_payload:=jsonb_build_object('key','storefront','value',p_payload);
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
