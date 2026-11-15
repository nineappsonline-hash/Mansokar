-- STAGED ONLY: do not apply to production without review.
-- Atomic admin message status update + audit event.
-- This function is SECURITY INVOKER and must only be callable by service_role.
create or replace function public.admin_update_message_atomic(
  p_actor uuid, p_message uuid, p_status text
) returns void language plpgsql set search_path to '' as $function$
begin
  if not exists (
    select 1 from public.admins where user_id=p_actor and enabled=true
  ) then raise exception 'Forbidden'; end if;
  if p_status not in ('new','read','replied','closed') then
    raise exception 'Invalid message status';
  end if;
  update public.contact_messages set status=p_status where id=p_message;
  if not found then raise exception 'Message not found'; end if;
  insert into public.admin_audit_logs(user_id,action,details)
    values(p_actor,'admin-message',jsonb_build_object('record',p_message,'status',p_status));
end $function$;
revoke all on function public.admin_update_message_atomic(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_update_message_atomic(uuid,uuid,text) to service_role;
