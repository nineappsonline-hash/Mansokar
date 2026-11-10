-- Additive metadata only. Legacy rows retain unknown content dates.
alter table public.products add column seo_updated_at timestamptz;
alter table public.cms_pages add column seo_updated_at timestamptz;
alter table public.vehicle_models add column seo_updated_at timestamptz;

create function public.stamp_seo_content_update() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP='INSERT' or
    (to_jsonb(NEW) - array['seo_updated_at','cost','created_at']) is distinct from
    (to_jsonb(OLD) - array['seo_updated_at','cost','created_at']) then
    NEW.seo_updated_at := now();
  end if;
  return NEW;
end $$;
create trigger products_seo_content_update before insert or update on public.products for each row execute function public.stamp_seo_content_update();
create trigger cms_seo_content_update before insert or update on public.cms_pages for each row execute function public.stamp_seo_content_update();
create trigger models_seo_content_update before insert or update on public.vehicle_models for each row execute function public.stamp_seo_content_update();

create function public.stamp_product_image_update() returns trigger language plpgsql set search_path='' as $$
begin
  if TG_OP='DELETE' then
    update public.products set seo_updated_at=now() where id=OLD.product_id;
    return OLD;
  end if;
  update public.products set seo_updated_at=now() where id=NEW.product_id;
  if TG_OP='UPDATE' and OLD.product_id is distinct from NEW.product_id then
    update public.products set seo_updated_at=now() where id=OLD.product_id;
  end if;
  return NEW;
end $$;
create trigger product_image_seo_update after insert or update or delete on public.product_images for each row execute function public.stamp_product_image_update();
revoke all on function public.stamp_seo_content_update() from public,anon,authenticated;
revoke all on function public.stamp_product_image_update() from public,anon,authenticated;

-- Existing RLS/grants are preserved. Browser events never accept purchase events.
alter table public.analytics_events drop constraint analytics_events_event_check;
alter table public.analytics_events add constraint analytics_events_event_check check(event in (
 'view_item','search','select_item','add_to_cart','begin_checkout','part_request','purchase',
 'add_shipping_info','add_payment_info','vehicle_selected','compatibility_checked',
 'compatibility_confirmed','part_number_searched','request_part_submitted'
));
alter table public.analytics_events add column context jsonb not null default '{}'::jsonb check(jsonb_typeof(context)='object');
