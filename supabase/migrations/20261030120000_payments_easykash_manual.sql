alter table public.orders
  add column payment_method text not null default 'cod'
    check (payment_method in ('cod','card','installments','instapay','wallet')),
  add column payment_reference text unique;

create or replace function public.verify_manual_transfer(
  p_actor uuid,
  p_transfer uuid,
  p_status text
) returns void language plpgsql set search_path='' as $$
declare t public.manual_transfers;o public.orders;
begin
  if not exists(select 1 from public.admins where user_id=p_actor and enabled) then
    raise exception 'Forbidden';
  end if;
  if p_status not in ('verified','rejected') then
    raise exception 'Invalid transfer status';
  end if;
  select * into t from public.manual_transfers where id=p_transfer for update;
  if not found then raise exception 'Unknown transfer';end if;
  if t.status<>'pending' then raise exception 'Transfer already reviewed';end if;
  select * into o from public.orders where id=t.order_id for update;
  if not found then raise exception 'Unknown order';end if;
  update public.manual_transfers set status=p_status where id=p_transfer;
  if p_status='verified' then
    insert into public.payments(order_id,provider,reference,amount,status,idempotency_key)
      values(o.id,t.method,t.reference,o.total,'paid','manual:'||p_transfer::text)
      on conflict(idempotency_key) do nothing;
    update public.orders set payment_status='paid' where id=o.id;
  else
    update public.orders set payment_status='failed' where id=o.id;
  end if;
  insert into public.admin_audit_logs(user_id,action,details)
    values(p_actor,'admin-verify-transfer',jsonb_build_object('transfer',p_transfer,'order',o.id,'status',p_status));
end $$;
revoke all on function public.verify_manual_transfer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.verify_manual_transfer(uuid,uuid,text) to service_role;
