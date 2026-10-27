create table public.pending_uploads(token uuid primary key default gen_random_uuid(),path text not null unique,created_at timestamptz not null default now(),claimed boolean not null default false);
alter table public.pending_uploads enable row level security;
revoke all on public.pending_uploads from anon,authenticated;
grant all on public.pending_uploads to service_role;
create function public.create_inquiry(p_contact text,p_vehicle text,p_description text,p_user uuid,p_upload uuid) returns void language plpgsql set search_path='' as $$
declare image text;
begin
if p_upload is not null then update public.pending_uploads set claimed=true where token=p_upload and not claimed and created_at>now()-interval '15 minutes' returning path into image;if not found then raise exception 'Upload expired or already used';end if;end if;
insert into public.part_requests(contact,vehicle_config_id,description,user_id,consent,image_path) values(p_contact,p_vehicle,p_description,p_user,true,image);
end $$;
create function public.replace_product_images(p_product text,p_images jsonb) returns void language plpgsql set search_path='' as $$
declare item jsonb;position integer:=0;
begin delete from public.product_images where product_id=p_product;for item in select * from jsonb_array_elements(p_images) loop insert into public.product_images(product_id,path,alt,position) values(p_product,item->>'path',item->'alt',position);position:=position+1;end loop;end $$;
revoke execute on function public.create_inquiry(text,text,text,uuid,uuid),public.replace_product_images(text,jsonb) from public,anon,authenticated;
grant execute on function public.create_inquiry(text,text,text,uuid,uuid),public.replace_product_images(text,jsonb) to service_role;
