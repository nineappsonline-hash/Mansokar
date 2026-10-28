-- Optional details distinguish exact configurations without guessing unknown values.
alter table public.vehicle_configs
  add column fuel_type text check (fuel_type in ('petrol','diesel','hybrid','electric','lpg','other')),
  add column forced_induction text check (forced_induction in ('naturally_aspirated','turbo','supercharged','other')),
  add column transmission text check (transmission in ('manual','automatic','cvt','dct','other'));

drop index public.configs_exact_unique;
create unique index configs_exact_unique on public.vehicle_configs(
  model_id,year,engine,coalesce(engine_code,''),coalesce(body,''),coalesce(trim,''),coalesce(generation_id,''),
  coalesce(fuel_type,''),coalesce(forced_induction,''),coalesce(transmission,'')
);

alter table public.vehicle_brands drop constraint vehicle_brands_slug_check;
alter table public.vehicle_brands add constraint vehicle_brands_slug_check check(slug in ('opel','peugeot','citroen','mg','chevrolet'));
insert into public.vehicle_brands(slug,name) values ('opel','Opel'),('peugeot','Peugeot'),('citroen','Citroën'),('mg','MG'),('chevrolet','Chevrolet') on conflict(slug) do nothing;
alter table public.vehicle_generations alter column year_end drop not null;

-- Model names are navigation data; no years, engines or fitments are invented.
insert into public.vehicle_models(id,brand,slug,name) values
 ('opel-insignia','opel','insignia','{"ar":"انسيجنيا","en":"Insignia"}'),
 ('opel-astra','opel','astra','{"ar":"استرا","en":"Astra"}'),
 ('opel-grandland','opel','grandland','{"ar":"جراند لاند","en":"Grandland"}'),
 ('opel-crossland','opel','crossland','{"ar":"كروس لاند","en":"Crossland"}'),
 ('mg-5','mg','5','{"ar":"5","en":"5"}'),
 ('mg-6','mg','6','{"ar":"6","en":"6"}'),
 ('mg-hs','mg','hs','{"ar":"HS","en":"HS"}'),
 ('mg-rx5','mg','rx5','{"ar":"RX5","en":"RX5"}'),
 ('mg-zs','mg','zs','{"ar":"ZS","en":"ZS"}'),
 ('chevrolet-cruze','chevrolet','cruze','{"ar":"كروز","en":"Cruze"}'),
 ('chevrolet-malibu','chevrolet','malibu','{"ar":"ماليبو","en":"Malibu"}'),
 ('chevrolet-captiva','chevrolet','captiva','{"ar":"كابتيفا","en":"Captiva"}'),
 ('peugeot-2008','peugeot','2008','{"ar":"2008","en":"2008"}'),
 ('peugeot-3008','peugeot','3008','{"ar":"3008","en":"3008"}'),
 ('citroen-c3','citroen','c3','{"ar":"C3","en":"C3"}'),
 ('citroen-c5','citroen','c5','{"ar":"C5","en":"C5"}')
on conflict do nothing;

-- Unlisted Chevrolet configurations use the same private inquiry workflow.
create or replace function public.create_inquiry_v2(p_contact text,p_vehicle text,p_description text,p_user uuid,p_upload uuid,p_details jsonb default '{}') returns uuid language plpgsql set search_path='' as $$
declare image text;request_id uuid;
begin
 if p_vehicle is null and (coalesce(p_details->>'make','') not in ('opel','peugeot','citroen','mg','chevrolet') or length(coalesce(p_details->>'model',''))<1 or length(coalesce(p_details->>'engine',''))<1 or coalesce((p_details->>'year')::integer,0) not between 1950 and 2100) then raise exception 'Vehicle details required';end if;
 if p_upload is not null then update public.pending_uploads set claimed=true where token=p_upload and not claimed and created_at>now()-interval '15 minutes' returning path into image;if not found then raise exception 'Upload expired or already used';end if;end if;
 insert into public.part_requests(contact,vehicle_config_id,vehicle_details,description,user_id,consent,image_path) values(p_contact,p_vehicle,case when p_vehicle is null then p_details else '{}'::jsonb end,p_description,p_user,true,image) returning id into request_id;
 return request_id;
end $$;
