-- MOPC: a product application with car_years:<modelId> = '' means All.
-- Preserve the existing RPC signature, security mode and search ranking.
-- Fix the model search filter rather than fabricating years in product data.
--
-- Before this patch, MG HS/RX5 had published products with an empty years
-- string but the search RPC returned zero, so pages incorrectly got noindex.
DO $yearless$
DECLARE
  function_source text;
  original_condition text := $old$coalesce(p.specs->>('car_years:'||m.id),'')<>'' and (p_year is null or p_year::text=any(string_to_array(p.specs->>('car_years:'||m.id),',')))$old$;
  corrected_condition text := $new$(p.specs ? ('car_years:'||m.id)) and (p_year is null or btrim(coalesce(p.specs->>('car_years:'||m.id),''))='' or p_year::text=any(string_to_array(p.specs->>('car_years:'||m.id),',')))$new$;
  old_matches integer;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO function_source
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='search_products_by_car';
  IF function_source IS NULL THEN
    RAISE EXCEPTION 'search_products_by_car missing; abort yearless fix';
  END IF;
  IF position(corrected_condition in function_source)>0 THEN
    RAISE NOTICE 'Already patched yearless car model search';
    RETURN;
  END IF;
  old_matches :=
    (length(function_source)-length(replace(function_source,original_condition,''))) /
    length(original_condition);
  IF old_matches<>1 THEN
    RAISE EXCEPTION 'Unexpected search_products_by_car body (% matches); review source before changing',old_matches;
  END IF;
  EXECUTE replace(function_source,original_condition,corrected_condition);
END
$yearless$;
