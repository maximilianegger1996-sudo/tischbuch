-- Body font Jost for all three venues (venues.brand)
-- Run in the Supabase SQL editor if staff auto-migrate has not run yet.
-- Safe to re-run: merges fonts + vars.--sans without wiping other brand fields.

UPDATE public.venues AS v
SET brand = jsonb_set(
  jsonb_set(
    COALESCE(v.brand, '{}'::jsonb),
    '{fonts}',
    (
      SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT f, MIN(ord) AS ord
        FROM (
          SELECT 'Jost:wght@300;400;500;600;700'::text AS f, 0 AS ord
          UNION ALL
          SELECT value #>> '{}', 1 + ordinality
          FROM jsonb_array_elements(COALESCE(v.brand->'fonts', '[]'::jsonb)) WITH ORDINALITY
          WHERE lower(value #>> '{}') NOT LIKE '%jost%'
        ) s
        GROUP BY f
      ) u
    ),
    true
  ),
  '{vars}',
  COALESCE(v.brand->'vars', '{}'::jsonb) || jsonb_build_object(
    '--sans', COALESCE(v.brand#>>'{vars,--sans}', 'Jost, system-ui, -apple-system, "Segoe UI", sans-serif')
  ),
  true
)
WHERE v.slug IN ('lue', 'steinbock', 'mundwerk');
