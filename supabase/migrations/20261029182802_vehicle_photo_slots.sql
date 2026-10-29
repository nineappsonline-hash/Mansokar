-- Reuse private site media assignments for all existing and imported car makes.
alter table public.site_media drop constraint if exists site_media_slot_check;
alter table public.site_media add constraint site_media_slot_check check(slot ~ '^(hero|logo|brand-[a-z0-9-]+-(photo|logo)|model-[a-z0-9-]+|campaign-[a-f0-9-]+)$');
