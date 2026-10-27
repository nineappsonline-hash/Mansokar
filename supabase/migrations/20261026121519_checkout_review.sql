create function public.checkout_quote(p_items jsonb,p_customer jsonb,p_area text,p_coupon text,p_user uuid,p_demo_allowed boolean) returns jsonb language plpgsql set search_path='' as $$
declare a public.shipping_areas;c public.coupons;p public.products;line jsonb;q integer;sub bigint:=0;disc bigint:=0;is_demo boolean:=false;eligible_sub bigint:=0;free_threshold bigint;lines jsonb:='[]';
begin
if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>40 then raise exception 'Invalid cart';end if;
if coalesce(p_customer->>'phone','')!~'^01[0125][0-9]{8}$' then raise exception 'Invalid customer details';end if;
if (select count(distinct item->>'id') from jsonb_array_elements(p_items) item)<>jsonb_array_length(p_items) then raise exception 'Duplicate cart product';end if;
select * into a from public.shipping_areas where id=p_area and enabled and starts_at<=now() and (ends_at is null or ends_at>now()) for share;
if not found then raise exception 'Delivery area is not configured';end if;
for line in select * from jsonb_array_elements(p_items) loop
q:=(line->>'qty')::integer;if q<1 or q>99 then raise exception 'Invalid quantity';end if;
select * into p from public.products where id=line->>'id' and status='published' and orderable for share;
if not found then raise exception 'Product unavailable';end if;
if p.demo and not p_demo_allowed then raise exception 'Demo checkout prohibited';end if;
is_demo:=is_demo or p.demo;sub:=sub+coalesce(p.sale,p.price)*q;lines:=lines||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'quantity',q,'unit_price',coalesce(p.sale,p.price),'total',coalesce(p.sale,p.price)*q));
end loop;
if p_coupon is not null and p_coupon<>'' then
select * into c from public.coupons where code=upper(p_coupon) and starts_at<=now() and ends_at>now() and redemptions<max_redemptions for update;
if not found then raise exception 'Invalid or expired coupon';end if;
if c.per_customer_limit is not null and (select count(*) from public.coupon_redemptions r join public.orders ord on ord.id=r.order_id where r.code=c.code and ((p_user is not null and ord.user_id=p_user) or ord.customer->>'phone'=p_customer->>'phone'))>=c.per_customer_limit then raise exception 'Invalid or expired coupon';end if;
select coalesce(sum(coalesce(prod.sale,prod.price)*(item->>'qty')::integer),0) into eligible_sub from jsonb_array_elements(p_items) item join public.products prod on prod.id=item->>'id' where c.scope_category is null or prod.category=c.scope_category;
if eligible_sub=0 then raise exception 'Invalid or expired coupon';end if;
disc:=least(eligible_sub,case when c.kind='fixed' then c.amount else eligible_sub*c.amount/100 end);

end if;
select (value->>'free_shipping_threshold')::bigint into free_threshold from public.site_settings where key='shipping' and (value->>'free_shipping_threshold')::bigint>=0;
if free_threshold is not null and sub-disc>=free_threshold then a.amount:=0;end if;
return jsonb_build_object('items',lines,'subtotal',sub,'discount',disc,'shipping',a.amount,'total',sub-disc+a.amount,'area',jsonb_build_object('id',a.id,'name',a.name,'governorate',a.governorate),'currency','EGP');
end $$;
revoke all on function public.checkout_quote(jsonb,jsonb,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.checkout_quote(jsonb,jsonb,text,text,uuid,boolean) to service_role;

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
insert into public.order_items(order_id,product_id,snapshot,quantity,vehicle_config_id) values(oid,p.id,jsonb_build_object('sku',p.sku,'name',p.name,'manufacturer',p.manufacturer,'price',coalesce(p.sale,p.price),'vehicle',(select to_jsonb(cfg) from public.vehicle_configs cfg where cfg.id=p_vehicle)),(line->>'qty')::integer,p_vehicle);
end loop;
if c.code is not null then insert into public.coupon_redemptions values(oid,c.code);end if;
insert into public.order_status_events(order_id,status) values(oid,'pending_confirmation');
if p_user is not null then delete from public.member_carts where user_id=p_user;end if;
return jsonb_build_object('token',token);
end $$;
