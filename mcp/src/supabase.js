import { createClient } from '@supabase/supabase-js';

/** Same project + publishable key as the SPA (guest/anon path only). */
export const SUPA_URL = process.env.TISCHBUCH_SUPA_URL || 'https://cttvfdoxgvhzfrrnqkgn.supabase.co';
export const SUPA_KEY =
  process.env.TISCHBUCH_SUPA_ANON_KEY ||
  process.env.TISCHBUCH_SUPA_KEY ||
  'sb_publishable_kZhKo_346RE1GFJtrbio1g_ZXGCwkth';

export const VENUES = [
  { slug: 'lue', name: 'LÜ – Burger & Grill' },
  { slug: 'steinbock', name: 'STEINBOCK. Wirtshaus am Tauern' },
  { slug: 'mundwerk', name: 'Mundwerk' },
];

export function assertSlug(slug) {
  const hit = VENUES.find((v) => v.slug === slug);
  if (!hit) {
    throw new Error(`Unbekanntes Haus „${slug}“. Erlaubt: ${VENUES.map((v) => v.slug).join(', ')}`);
  }
  return hit.slug;
}

export function createDb() {
  return createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
