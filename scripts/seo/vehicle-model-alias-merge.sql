-- MANUAL, DEFERRED data migration, NOT applied by Vercel or repository deployments.
-- Run read-only vehicle-model-alias-audit.sql against the MOPC Supabase project.
-- Back up public.vehicle_models, vehicle_configs, vehicle_model_years,
-- vehicle_generations and public.products before use.
-- The *same database session* must explicitly set:
--   SET mopc.allow_vehicle_alias_merge = 'approved';
-- The script fails closed without that setting.
-- This rewires product applications / exact configs, preserving their IDs and
-- existing product_fitments + garage_vehicles references. It leaves legacy
-- model records in place for verification and later redirect/decommission.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
DO $merge$
DECLARE
  pair record;
  src_id text;
  dst_id text;
  unexpected_fks text;
  legacy_key text;
  target_key text;
  moved_configs integer;
  moved_apps integer;
BEGIN
  IF current_setting('mopc.allow_vehicle_alias_merge', true) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'MOPC model merge not approved; review read-only audit and opt in explicitly';
  END IF;
  -- Serialize multiple migration attempts and minimize race conditions.
  PERFORM pg_advisory_xact_lock(hashtext('mopc-vehicle-model-alias-merge'));
  -- Abort if the live schema introduces additional direct references that
  -- are not explicitly handled here.
  SELECT string_agg(conrelid::regclass::text || '.' || conname, ', ')
  INTO unexpected_fks
  FROM pg_constraint
  WHERE contype='f' AND confrelid='public.vehicle_models'::regclass
    AND conrelid NOT IN (
      'public.vehicle_configs'::regclass,
      'public.vehicle_generations'::regclass,
      'public.vehicle_model_years'::regclass
    );
  IF unexpected_fks IS NOT NULL THEN
    RAISE EXCEPTION 'Unhandled foreign keys to vehicle_models: %', unexpected_fks;
  END IF;

  -- Prevent concurrent config/product writes while moving the associations.
  LOCK TABLE public.vehicle_models, public.vehicle_configs,
             public.vehicle_generations, public.vehicle_model_years,
             public.products IN SHARE ROW EXCLUSIVE MODE;

  FOR pair IN SELECT * FROM (VALUES
    ('chevrolet','cruz','cruze'),
    ('opel','insginia-a','insignia-a')
  ) AS v(brand, legacy_slug, target_slug) LOOP
    SELECT id INTO src_id FROM public.vehicle_models
    WHERE brand=pair.brand AND slug=pair.legacy_slug;
    SELECT id INTO dst_id FROM public.vehicle_models
    WHERE brand=pair.brand AND slug=pair.target_slug;
    IF src_id IS NULL THEN
      RAISE NOTICE 'Already merged / no legacy source: %/%', pair.brand, pair.legacy_slug;
      CONTINUE;
    END IF;
    IF dst_id IS NULL OR dst_id=src_id THEN
      RAISE EXCEPTION 'Missing distinct canonical model for %: %', pair.brand, pair.target_slug;
    END IF;
    -- Identical exact configurations cannot be reassigned directly due to
    -- the unique configuration index; abort and reconcile them separately.
    IF EXISTS (
      SELECT 1 FROM public.vehicle_configs old
      JOIN public.vehicle_configs new ON new.model_id=dst_id
        AND new.year=old.year
        AND new.engine=old.engine
        AND coalesce(new.engine_code,'')=coalesce(old.engine_code,'')
        AND coalesce(new.body,'')=coalesce(old.body,'')
        AND coalesce(new.trim,'')=coalesce(old.trim,'')
        AND coalesce(new.generation_id,'')=coalesce(old.generation_id,'')
        AND coalesce(new.fuel_type,'')=coalesce(old.fuel_type,'')
        AND coalesce(new.forced_induction,'')=coalesce(old.forced_induction,'')
        AND coalesce(new.transmission,'')=coalesce(old.transmission,'')
      WHERE old.model_id=src_id
    ) THEN
      RAISE EXCEPTION 'Overlapping exact configs for %/% -> %, resolve before merge',
        pair.brand,pair.legacy_slug,pair.target_slug;
    END IF;
    legacy_key := 'car_years:' || src_id;
    target_key := 'car_years:' || dst_id;
    -- Explicit unknown/all years on either side remain unspecified/all;
    -- otherwise union only recorded integer years, without inventing ranges.
    IF EXISTS (
      SELECT 1 FROM public.products p WHERE p.specs ? legacy_key
       AND (p.specs->>legacy_key !~ '^([0-9]{4}(,[0-9]{4})*)?$'
          OR (p.specs ? target_key AND p.specs->>target_key !~ '^([0-9]{4}(,[0-9]{4})*)?$'))
    ) THEN
      RAISE EXCEPTION 'Unexpected application year value for %, stop before altering data',
        legacy_key;
    END IF;
    WITH updates AS (
      SELECT p.id,
        CASE
          WHEN p.specs->>legacy_key = ''
            OR (p.specs ? target_key AND p.specs->>target_key = '')
          THEN ''
          ELSE (
            SELECT string_agg(year::text, ',' ORDER BY year)
            FROM (
              SELECT DISTINCT value::int AS year
              FROM unnest(string_to_array(
                concat_ws(',', nullif(p.specs->>target_key,''), nullif(p.specs->>legacy_key,'')),
                ',')) AS value
              WHERE value ~ '^[0-9]{4}$'
            ) years
          )
        END AS combined
      FROM public.products p WHERE p.specs ? legacy_key
    )
    UPDATE public.products p
       SET specs = jsonb_set(p.specs - legacy_key, ARRAY[target_key],
                             to_jsonb(coalesce(updates.combined,'')), true)
    FROM updates WHERE p.id=updates.id;
    GET DIAGNOSTICS moved_apps = ROW_COUNT;

    INSERT INTO public.vehicle_model_years(model_id,year)
    SELECT dst_id,year FROM public.vehicle_model_years WHERE model_id=src_id
    ON CONFLICT DO NOTHING;
    DELETE FROM public.vehicle_model_years WHERE model_id=src_id;
    UPDATE public.vehicle_generations SET model_id=dst_id WHERE model_id=src_id;
    UPDATE public.vehicle_configs SET model_id=dst_id WHERE model_id=src_id;
    GET DIAGNOSTICS moved_configs = ROW_COUNT;
    RAISE NOTICE 'Merged %/% -> %: % configs, % product specs',
      pair.brand,pair.legacy_slug,pair.target_slug,moved_configs,moved_apps;
    -- Every old reference must be gone; if not, roll back everything.
    IF EXISTS(SELECT 1 FROM public.vehicle_configs WHERE model_id=src_id)
       OR EXISTS(SELECT 1 FROM public.vehicle_generations WHERE model_id=src_id)
       OR EXISTS(SELECT 1 FROM public.vehicle_model_years WHERE model_id=src_id)
       OR EXISTS(SELECT 1 FROM public.products WHERE specs ? legacy_key)
    THEN RAISE EXCEPTION 'Legacy model still referenced: %', src_id; END IF;
  END LOOP;
END
$merge$;
COMMIT;
-- IMPORTANT: leave legacy vehicle_models rows intact; separately verify saved
-- garage vehicles, all product fitments and old model media, then arrange SEO
-- redirects/deletion only after production audit and data backup.
