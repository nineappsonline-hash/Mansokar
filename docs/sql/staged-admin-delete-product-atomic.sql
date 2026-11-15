-- STAGED ONLY. Requires isolated integration tests and deployment review.
-- Database mutations and audit are one transaction. Storage cleanup is OUTSIDE it.
-- Returns former image paths for asynchronous/best-effort cleanup after commit.
create or replace function public.admin_delete_product_atomic(p_actor uuid,p_product text)
returns table(deleted_id text,deleted_sku text,image_paths text[])
language plpgsql set search_path to '' as $function$
declare v_sku text; v_paths text[];
begin
  if not exists(select 1 from public.admins where user_id=p_actor and enabled=true) then
    raise exception 'Forbidden';
  end if;
  select p.sku into v_sku from public.products p where p.id=p_product for update;
  if not found then raise exception 'Product not found'; end if;
  if exists(select 1 from public.order_items i where i.product_id=p_product) then
    raise exception 'Product belongs to an order; set to draft instead';
  end if;
  select coalesce(array_agg(distinct path),array[]::text[]) into v_paths
    from public.product_images where product_id=p_product;
  update public.analytics_events set product_id=null where product_id=p_product;
  delete from public.products where id=p_product;
  insert into public.admin_audit_logs(user_id,action,details)
    values(p_actor,'admin-delete-product',jsonb_build_object('record',p_product,'sku',v_sku));
  return query select p_product,v_sku,v_paths;
end $function$;
revoke all on function public.admin_delete_product_atomic(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_delete_product_atomic(uuid,text) to service_role;
