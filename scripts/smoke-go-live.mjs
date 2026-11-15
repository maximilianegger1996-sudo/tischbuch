#!/usr/bin/env node
/**
 * Flip-ready smoke (no public cutover): public_config + availability after open_from.
 * Usage: node scripts/smoke-go-live.mjs
 * Needs network; uses anon/publishable key (same as the app).
 */
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://cttvfdoxgvhzfrrnqkgn.supabase.co';
const SUPA_KEY = 'sb_publishable_kZhKo_346RE1GFJtrbio1g_ZXGCwkth';
const DB = createClient(SUPA_URL, SUPA_KEY);

const VENUES = [
  { slug: 'lue', after: '2026-11-21' },
  { slug: 'mundwerk', after: '2026-11-21' },
  { slug: 'steinbock', after: '2026-11-26' },
];

let failed = 0;
for (const v of VENUES) {
  const { data: cfg, error: e1 } = await DB.rpc('public_config', { p_slug: v.slug });
  if (e1 || !cfg?.name) {
    console.error('FAIL config', v.slug, e1?.message || 'no name');
    failed++;
    continue;
  }
  const { data: slots, error: e2 } = await DB.rpc('public_availability', {
    p_slug: v.slug, p_date: v.after, p_pax: 2, p_room: null,
  });
  if (e2) {
    console.error('FAIL availability', v.slug, e2.message);
    failed++;
    continue;
  }
  const n = Array.isArray(slots) ? slots.length : 0;
  const open = Array.isArray(slots) ? slots.filter(s => s.available).length : 0;
  console.log('OK', v.slug, cfg.name, `open_from=${cfg.open_from||'(sofort)'}`, `slots=${n}`, `available=${open}`, `date=${v.after}`);
}

if (failed) {
  console.error(`\n${failed} venue(s) failed`);
  process.exit(1);
}
console.log('\nAll venues OK — flip-ready for guest config/availability.');
