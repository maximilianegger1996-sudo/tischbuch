import { createClient } from '@supabase/supabase-js';

/** Same project + publishable key as the SPA (guest/anon path only). */
const DEFAULT_URL = 'https://cttvfdoxgvhzfrrnqkgn.supabase.co';
const DEFAULT_KEY = 'sb_publishable_kZhKo_346RE1GFJtrbio1g_ZXGCwkth';

export const VENUES = [
  { slug: 'lue', name: 'LÜ – Burger & Grill' },
  { slug: 'steinbock', name: 'STEINBOCK. Wirtshaus am Tauern' },
  { slug: 'mundwerk', name: 'Mundwerk' },
];

/** Resolve URL/key at call time (Node env, Docker, or Cloudflare Worker bindings). */
export function getSupaConfig(env = globalThis.process?.env || {}) {
  return {
    url: env.TISCHBUCH_SUPA_URL || DEFAULT_URL,
    key: env.TISCHBUCH_SUPA_ANON_KEY || env.TISCHBUCH_SUPA_KEY || DEFAULT_KEY,
  };
}

export const SUPA_URL = getSupaConfig().url;
export const SUPA_KEY = getSupaConfig().key;

export function assertSlug(slug) {
  const hit = VENUES.find((v) => v.slug === slug);
  if (!hit) {
    throw new Error(`Unbekanntes Haus „${slug}“. Erlaubt: ${VENUES.map((v) => v.slug).join(', ')}`);
  }
  return hit.slug;
}

let _db;
let _dbKey;

export function createDb(env) {
  const { url, key } = getSupaConfig(env || globalThis.process?.env || {});
  // Reuse client when URL/key unchanged (stdio / long-lived HTTP).
  if (_db && _dbKey === `${url}|${key}` && !env) return _db;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (!env) {
    _db = client;
    _dbKey = `${url}|${key}`;
  }
  return client;
}

/** For Workers: inject request-scoped env before API calls. */
export function withEnv(env) {
  return createDb(env);
}
