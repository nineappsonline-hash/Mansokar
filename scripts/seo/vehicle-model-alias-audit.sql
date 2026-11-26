-- READ ONLY. Run against the MOPC database (NOT Zait/Playza) before attempting any merge.
-- Includes references used by search, garage, fitments, registered years,
-- and the product JSON keys car_years:<model_id>.
WITH aliases(brand, legacy_slug, target_slug) AS (
  VALUES ('chevrolet','cruz','cruze'), ('opel','insginia-a','insignia-a')
), pairs AS (
 SELECT a.brand, a.legacy_slug, a.target_slug,
        src.id AS legacy_id, dst.id AS target_id
 FROM aliases a
 LEFT JOIN public.vehicle_models src
   ON src.brand=a.brand AND src.slug=a.legacy_slug
 LEFT JOIN public.vehicle_models dst
   ON dst.brand=a.brand AND dst.slug=a.target_slug
)
SELECT p.*,
  (SELECT count(*) FROM public.vehicle_configs c WHERE c.model_id=p.legacy_id) AS legacy_configs,
  (SELECT count(*) FROM public.vehicle_configs c WHERE c.model_id=p.target_id) AS target_configs,
  (SELECT count(*) FROM public.vehicle_model_years y WHERE y.model_id=p.legacy_id) AS legacy_years,
  (SELECT count(*) FROM public.vehicle_model_years y WHERE y.model_id=p.target_id) AS target_years,
  (SELECT count(*) FROM public.product_fitments f
     JOIN public.vehicle_configs c ON c.id=f.vehicle_config_id WHERE c.model_id=p.legacy_id) AS legacy_product_fitments,
  (SELECT count(*) FROM public.garage_vehicles g
     JOIN public.vehicle_configs c ON c.id=g.vehicle_config_id WHERE c.model_id=p.legacy_id) AS legacy_garage_vehicles,
  (SELECT count(*) FROM public.products pr WHERE pr.specs ? ('car_years:'||p.legacy_id)) AS legacy_product_applications,
  (SELECT count(*) FROM public.products pr WHERE pr.specs ? ('car_years:'||p.target_id)) AS target_product_applications
FROM pairs p
ORDER BY p.brand, p.legacy_slug;

-- Additional direct FK references to vehicle_models must be reviewed:
SELECT conrelid::regclass::text AS referencing_table,
       conname AS foreign_key,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype='f'
  AND confrelid='public.vehicle_models'::regclass
ORDER BY 1,2;

-- Show exact configuration-key collisions BEFORE any reparenting.
WITH pairs AS (
 SELECT s.id AS legacy_id, d.id AS target_id, s.brand, s.slug
 FROM public.vehicle_models s JOIN public.vehicle_models d
   ON (s.brand,s.slug,d.slug) IN (
      ('chevrolet','cruz','cruze'), ('opel','insginia-a','insignia-a'))
)
SELECT p.brand,p.slug,c.id AS legacy_config, existing.id AS conflicting_target_config
FROM pairs p
JOIN public.vehicle_configs c ON c.model_id=p.legacy_id
JOIN public.vehicle_configs existing
 ON existing.model_id=p.target_id
 AND existing.year=c.year AND existing.engine=c.engine
 AND coalesce(existing.engine_code,'')=coalesce(c.engine_code,'')
 AND coalesce(existing.body,'')=coalesce(c.body,'')
 AND coalesce(existing.trim,'')=coalesce(c.trim,'')
 AND coalesce(existing.generation_id,'')=coalesce(c.generation_id,'')
 AND coalesce(existing.fuel_type,'')=coalesce(c.fuel_type,'')
 AND coalesce(existing.forced_induction,'')=coalesce(c.forced_induction,'')
 AND coalesce(existing.transmission,'')=coalesce(c.transmission,'');
