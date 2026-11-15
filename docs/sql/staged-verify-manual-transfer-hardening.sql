-- STAGED ONLY. Do not apply to production without review and transaction tests.
-- Enforce exact transfer amount and matching payment method atomically.
-- Partial payments are intentionally unsupported.
create or replace function public.verify_manual_transfer(p_actor uuid, p_transfer uuid, p_status text)
returns void language plpgsql set search_path to '' as $function$
declare
  t public.manual_transfers;
  o public.orders;
begin
  if not exists(select 1 from public.admins where user_id=p_actor and enabled) then
    raise exception 'Forbidden';
  end if;
  if p_status not in ('verified','rejected') then
    raise exception 'Invalid transfer status';
  end if;
  select * into t from public.manual_transfers where id=p_transfer for update;
  if not found then raise exception 'Unknown transfer'; end if;
  if t.status <> 'pending' then raise exception 'Transfer already reviewed'; end if;
  select * into o from public.orders where id=t.order_id for update;
  if not found then raise exception 'Unknown order'; end if;
  if o.payment_status = 'paid' then raise exception 'Order already paid'; end if;
  if p_status='verified' then
    if t.amount <> o.total then raise exception 'Transfer amount does not match order total'; end if;
    if t.method <> o.payment_method then raise exception 'Transfer method does not match order'; end if;
  end if;
  update public.manual_transfers set status=p_status where id=p_transfer;
  if p_status='verified' then
    insert into public.payments(order_id,provider,reference,amount,status,idempotency_key)
      values(o.id,t.method,t.reference,t.amount,'paid','manual:'||p_transfer::text)
      on conflict(idempotency_key) do nothing;
    update public.orders set payment_status='paid' where id=o.id;
  else
    update public.orders set payment_status='failed' where id=o.id;
  end if;
  insert into public.admin_audit_logs(user_id,action,details)
    values(p_actor,'admin-verify-transfer',jsonb_build_object('transfer',p_transfer,'order',o.id,'status',p_status,'amount',t.amount));
end $function$;
