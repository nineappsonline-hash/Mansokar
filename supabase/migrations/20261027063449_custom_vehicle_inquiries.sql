create function public.create_inquiry_v2(p_contact text,p_vehicle text,p_description text,p_user uuid,p_upload uuid,p_details jsonb default '{}') returns uuid language plpgsql set search_path='' as $$
declare image text;request_id uuid;
begin
 if p_vehicle is null and (coalesce(p_details->>'make','') not in ('opel','peugeot','citroen','mg') or length(coalesce(p_details->>'model',''))<1 or length(coalesce(p_details->>'engine',''))<1 or coalesce((p_details->>'year')::integer,0) not between 1950 and 2100) then raise exception 'Vehicle details required';end if;
 if p_upload is not null then update public.pending_uploads set claimed=true where token=p_upload and not claimed and created_at>now()-interval '15 minutes' returning path into image;if not found then raise exception 'Upload expired or already used';end if;end if;
 insert into public.part_requests(contact,vehicle_config_id,vehicle_details,description,user_id,consent,image_path) values(p_contact,p_vehicle,case when p_vehicle is null then p_details else '{}'::jsonb end,p_description,p_user,true,image) returning id into request_id;
 return request_id;
end $$;
revoke all on function public.create_inquiry_v2(text,text,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_inquiry_v2(text,text,text,uuid,uuid,jsonb) to service_role;

create index vehicle_generation_lookup_idx on public.vehicle_configs(generation_id) where generation_id is not null;
create function public.check_config_generation() returns trigger language plpgsql set search_path='' as $$
declare g public.vehicle_generations;
begin
 if new.generation_id is null then return new;end if;
 select * into g from public.vehicle_generations where id=new.generation_id for share;
 if not found or g.model_id<>new.model_id or new.year<g.year_start or (g.year_end is not null and new.year>g.year_end) then raise exception 'Generation must match the vehicle model and year';end if;
 return new;
end $$;
create function public.check_generation_configs() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from public.vehicle_configs where generation_id=old.id and (model_id<>new.model_id or year<new.year_start or (new.year_end is not null and year>new.year_end))) then raise exception 'Generation change would invalidate existing vehicle configurations';end if;
 return new;
end $$;
revoke all on function public.check_config_generation(),public.check_generation_configs() from public,anon,authenticated;
create trigger config_generation_check before insert or update of model_id,year,generation_id on public.vehicle_configs for each row execute function public.check_config_generation();
create trigger generation_configs_check before update of model_id,year_start,year_end on public.vehicle_generations for each row execute function public.check_generation_configs();
