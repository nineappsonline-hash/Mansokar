alter table public.products add column created_at timestamptz not null default now(), add column cost bigint check(cost>=0), add column warranty jsonb, add column editorial jsonb not null default '{}';
create table public.saved_addresses(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text not null,phone text not null,area_id text references public.shipping_areas(id),details text not null);
create index addresses_user_idx on public.saved_addresses(user_id);
alter table public.saved_addresses enable row level security;
revoke all on public.saved_addresses from anon,authenticated;
grant select,insert,update,delete on public.saved_addresses to authenticated;
grant all on public.saved_addresses to service_role;
create policy own_addresses on public.saved_addresses for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create table public.member_carts(user_id uuid primary key references auth.users(id),items jsonb not null default '[]',updated_at timestamptz not null default now());
alter table public.member_carts enable row level security;
revoke all on public.member_carts from anon,authenticated;
grant all on public.member_carts to service_role;
create function public.reconcile_cod(p_order uuid) returns void language plpgsql set search_path='' as $$
declare o public.orders;
begin select * into o from public.orders where id=p_order for update;
if not found or o.status<>'delivered' then raise exception 'COD can be collected only after delivery';end if;
if o.payment_status='paid' then return;end if;
insert into public.payments(order_id,provider,amount,status,idempotency_key) values(p_order,'cod',o.total,'paid','cod:'||p_order::text) on conflict(idempotency_key) do nothing;
update public.orders set payment_status='paid' where id=p_order;
if not o.demo and coalesce((o.customer->>'analytics_consent')::boolean,false) then insert into public.analytics_events(event,amount,dedupe_key) values('purchase',o.total,'purchase:'||o.id::text) on conflict(dedupe_key) do nothing;end if;
end $$;
create function public.record_payment_event(p_provider text,p_event text,p_order uuid,p_amount bigint,p_status text,p_reference text) returns boolean language plpgsql set search_path='' as $$
declare n integer;o public.orders;
begin
-- Internal adapter boundary. The HTTP application currently exposes no online webhook endpoint.
if p_status not in ('paid','failed','refunded') then raise exception 'Invalid payment status';end if;
select * into o from public.orders where id=p_order for update;
if not found or p_amount<>o.total then raise exception 'Payment amount mismatch';end if;
insert into public.payment_events(provider,event_id,metadata) values(p_provider,p_event,jsonb_build_object('order_id',p_order,'status',p_status,'amount',p_amount)) on conflict do nothing;
get diagnostics n=row_count;if n=0 then return false;end if;
insert into public.payments(order_id,provider,reference,amount,status,idempotency_key) values(p_order,p_provider,p_reference,p_amount,p_status,p_provider||':'||p_event);
update public.orders set payment_status=p_status where id=p_order;
return true;end $$;
revoke execute on function public.reconcile_cod(uuid),public.record_payment_event(text,text,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_cod(uuid),public.record_payment_event(text,text,uuid,bigint,text,text) to service_role;

-- Column grants prevent direct Data API clients from reading merchant costs.
revoke select on public.products from anon,authenticated;
grant select(id,sku,slug,name,description,manufacturer,category,family,type,price,sale,"partNumber",demo,orderable,status,specs,warranty,editorial,created_at) on public.products to anon,authenticated;
