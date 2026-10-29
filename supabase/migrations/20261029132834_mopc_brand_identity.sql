-- Keep all existing settings, policies and contact information while rebranding.
insert into public.site_settings(key,value) values('storefront','{"storeName":{"en":"MOPC","ar":"موبك"}}'::jsonb)
on conflict(key) do update set value=public.site_settings.value || excluded.value;
-- Retire the previous selected logo; uploaded files remain available in storage.
delete from public.site_media where slot='logo';
update public.cms_pages set title=replace(replace(replace(replace(title::text,'Mansokar','MOPC'),'MANSOKAR','MOPC'),'DriveParts','MOPC'),'درايف بارتس','موبك')::jsonb,
 body=replace(replace(replace(replace(body::text,'Mansokar','MOPC'),'MANSOKAR','MOPC'),'DriveParts','MOPC'),'درايف بارتس','موبك')::jsonb,
 seo=replace(replace(replace(replace(seo::text,'Mansokar','MOPC'),'MANSOKAR','MOPC'),'DriveParts','MOPC'),'درايف بارتس','موبك')::jsonb;
update public.site_settings set value=replace(replace(replace(replace(value::text,'Mansokar','MOPC'),'MANSOKAR','MOPC'),'DriveParts','MOPC'),'درايف بارتس','موبك')::jsonb where key='storefront';
