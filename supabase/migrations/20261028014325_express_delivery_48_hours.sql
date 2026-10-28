-- Owner confirmed express means 48 hours, not 48 days. Preserve any configured custom deadline.
update public.shipping_areas set delivery_min_hours=null,delivery_max_hours=48,business_days=false
where id like 'eg-%' and service_type='express' and delivery_max_hours is null;
