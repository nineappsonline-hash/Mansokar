-- STAGED ONLY: run after staged-admin-delete-product-atomic.sql.
-- A short lease prevents duplicate workers. Retry expired leases.
alter table public.product_image_cleanup_jobs
  add column if not exists lease_token uuid,
  add column if not exists leased_until timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now();

-- The worker must use the server-side service role, never browser credentials.
create or replace function public.claim_product_image_cleanup_jobs(
  p_limit integer default 10
) returns setof public.product_image_cleanup_jobs
language plpgsql set search_path to '' as $function$
begin
  if p_limit < 1 or p_limit > 50 then raise exception 'Invalid batch size'; end if;
  return query
    with picked as (
      select j.id from public.product_image_cleanup_jobs j
      where (
        (j.status in ('pending','failed') and j.next_attempt_at<=now())
        or (j.status='processing' and j.leased_until<now())
      )
      order by j.created_at,j.id
      for update skip locked limit p_limit
    )
    update public.product_image_cleanup_jobs j
    set status='processing',attempts=j.attempts+1,
        lease_token=gen_random_uuid(),leased_until=now()+interval '2 minutes',
        last_error=null
    from picked where j.id=picked.id
    returning j.*;
end $function$;

create or replace function public.finish_product_image_cleanup_job(
  p_id bigint,p_lease uuid,p_success boolean,p_error text default null
) returns boolean language plpgsql set search_path to '' as $function$
declare changed boolean;
begin
  update public.product_image_cleanup_jobs j
    set status=case when p_success then 'done' else 'failed' end,
        completed_at=case when p_success then now() else null end,
        last_error=case when p_success then null else left(coalesce(p_error,'Unknown cleanup error'),500) end,
        next_attempt_at=case when p_success then now()
          else now() + make_interval(secs=>least(3600,30*power(2,least(j.attempts,7))::integer)) end,
        lease_token=null,leased_until=null
    where j.id=p_id and j.status='processing' and j.lease_token=p_lease
      and j.leased_until>=now();
  changed=found;
  return changed;
end $function$;

revoke all on function public.claim_product_image_cleanup_jobs(integer) from public,anon,authenticated;
revoke all on function public.finish_product_image_cleanup_job(bigint,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_product_image_cleanup_jobs(integer) to service_role;
grant execute on function public.finish_product_image_cleanup_job(bigint,uuid,boolean,text) to service_role;
