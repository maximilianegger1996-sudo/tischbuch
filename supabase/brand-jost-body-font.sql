-- Per-venue body/display fonts in venues.brand
-- Run in Supabase SQL editor if staff auto-migrate has not run yet.
-- Safe to re-run.

-- LÜ + Mundwerk: Jost body, Libre Bodoni display
UPDATE public.venues AS v
SET brand = jsonb_set(
  jsonb_set(
    COALESCE(v.brand, '{}'::jsonb),
    '{fonts}',
    '["Jost:wght@300;400;500;600;700","Libre Bodoni:wght@400;600"]'::jsonb,
    true
  ),
  '{vars}',
  COALESCE(v.brand->'vars', '{}'::jsonb) || jsonb_build_object(
    '--sans', 'Jost, system-ui, -apple-system, "Segoe UI", sans-serif',
    '--serif', '"Libre Bodoni", "Bodoni 72", Didot, Georgia, serif'
  ),
  true
)
WHERE v.slug IN ('lue', 'mundwerk');

-- Steinbock: Open Sans body + Open Sans Condensed display (matches steinbock-obertauern.at)
UPDATE public.venues AS v
SET brand = jsonb_set(
  jsonb_set(
    COALESCE(v.brand, '{}'::jsonb),
    '{fonts}',
    '["Open Sans:wght@300;400;500;600;700","Open Sans Condensed:wght@300;700"]'::jsonb,
    true
  ),
  '{vars}',
  COALESCE(v.brand->'vars', '{}'::jsonb) || jsonb_build_object(
    '--sans', '"Open Sans", Helvetica, Arial, sans-serif',
    '--serif', '"Open Sans Condensed", "Arial Narrow", Arial, Tahoma, sans-serif'
  ),
  true
)
WHERE v.slug = 'steinbock';
