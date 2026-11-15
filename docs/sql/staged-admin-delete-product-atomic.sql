-- STAGED ONLY. Requires isolated integration tests and deployment review.
-- Database mutations and audit are one transaction. Storage cleanup is OUTSIDE it.
-- Persist cleanup jobs in the same transaction as the deletion.
-- Storage deletion must be performed later by an authenticated service worker.
create table if not exists public.product_image_cleanup_jobs (
  id bigint generated always as identity primary key,
  bucket text not null default 'catalog-images',
  path text not null,
  source_product_id text not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(bucket,path)
);
alter table public.product_image_cleanup_jobs enable row level security;
revoke all on public.product_image_cleanup_jobs from public,anon,authenticated;
grant select,insert,update on public.product_image_cleanup_jobs to service_role;
grant usage,select on sequence public.product_image_cleanup_jobs_id_seq to service_role;
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
  -- Queue cleanup before deleting the product so rollback protects the jobs too.
  -- Never queue a path still referenced by another product.
  insert into public.product_image_cleanup_jobs(bucket,path,source_product_id)
    select 'catalog-images',img.path,p_product
    from unnest(v_paths) as img(path)
    where not exists (
      select 1 from public.product_images other
      where other.path=img.path and other.product_id<>p_product
    )
    on conflict(bucket,path) do nothing;
  delete from public.products where id=p_product;
  insert into public.admin_audit_logs(user_id,action,details)
    values(p_actor,'admin-delete-product',jsonb_build_object('record',p_product,'sku',v_sku));
  return query select p_product,v_sku,v_paths;
end $function$;
revoke all on function public.admin_delete_product_atomic(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_delete_product_atomic(uuid,text) to service_role;
