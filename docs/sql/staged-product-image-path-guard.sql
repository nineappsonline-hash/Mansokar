-- STAGED ONLY. Apply before enabling image cleanup or atomic product deletion.
-- Storage object keys are immutable once queued (including completed jobs).
-- A transaction advisory lock coordinates new product_images references with
-- the same path's cleanup enqueue, closing the DB-level insert/delete race.
create or replace function public.guard_product_image_cleanup_path()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if tg_op='INSERT' or new.path is distinct from old.path then
      perform pg_advisory_xact_lock(hashtextextended('catalog-images:'||new.path,0));
      if exists (
        select 1 from public.product_image_cleanup_jobs j
        where j.bucket='catalog-images' and j.path=new.path
      ) then
        raise exception 'Image path is retired and cannot be reused';
      end if;
  end if;
  return new;
end $function$;

drop trigger if exists product_images_cleanup_path_guard on public.product_images;
create trigger product_images_cleanup_path_guard
before insert or update of path on public.product_images
for each row execute function public.guard_product_image_cleanup_path();

-- Ensure a concurrent insert that committed before the delete acquired
-- its path lock is observed by the queue insertion's NOT EXISTS check.
-- Requires the delete RPC to acquire the matching advisory lock before
-- evaluating its references (staged-admin-delete-product-atomic.sql).
