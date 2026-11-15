/**
 * Local smoke without MCP transport: config + availability (no book by default).
 * Optional: TISCHBUCH_SMOKE_BOOK=1 creates then cancels a test reservation.
 */
import * as api from './guest-api.js';
import { VENUES } from './supabase.js';

const book = process.env.TISCHBUCH_SMOKE_BOOK === '1';

for (const v of VENUES) {
  const cfg = await api.getVenueConfig(v.slug);
  let date = cfg.open_from || new Date().toISOString().slice(0, 10);
  if (cfg.open_from) {
    const d = new Date(cfg.open_from + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    date = d.toISOString().slice(0, 10);
  }
  const prop = await api.proposeSlots({ slug: v.slug, date, pax: 2, limit: 3 });
  console.log(
    'OK',
    v.slug,
    cfg.name,
    `open_from=${cfg.open_from || '(sofort)'}`,
    prop.message_de,
    prop.proposals.map((p) => p.time).join(', ') || '(keine)',
  );

  if (book && prop.proposals[0]) {
    const created = await api.createReservation({
      slug: v.slug,
      date,
      start: prop.proposals[0].time,
      pax: 2,
      name: 'MCP Smoke Test',
      phone: '+436601234567',
      email: 'mcp-smoke@example.com',
      note: 'Automatischer Smoke — bitte ignorieren',
      source: 'mcp-smoke',
    });
    const code = String(created.reservation.code || '');
    console.log('  booked', code);
    if (code) {
      await api.cancelReservation({ code, key: 'mcp-smoke@example.com' });
      console.log('  cancelled', code);
    }
  }
}

console.log(book ? '\nSmoke with book/cancel done.' : '\nRead-only smoke done. Set TISCHBUCH_SMOKE_BOOK=1 to book+cancel once.');
