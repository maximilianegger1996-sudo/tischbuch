/**
 * Thin REST surface over the same guest-api (ChatGPT Custom GPT Actions / OpenAPI).
 * Guest-safe only — mirrors MCP tools; no staff endpoints.
 */
import { VENUES } from './supabase.js';
import * as api from './guest-api.js';
import { HOW_TO_DE, HOW_TO_EN, SERVER_NAME, SERVER_VERSION } from './create-server.js';

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function sendErr(res, err, status = 400) {
  const message = err instanceof Error ? err.message : String(err);
  sendJson(res, status, { ok: false, error: message });
}

/** Mount REST + health + OpenAPI helpers on an Express app. */
export function mountRestRoutes(app) {
  app.get('/health', (_req, res) => {
    sendJson(res, 200, {
      ok: true,
      service: SERVER_NAME,
      version: SERVER_VERSION,
      venues: VENUES.map((v) => v.slug),
    });
  });

  app.get('/howto', (req, res) => {
    const lang = String(req.query.lang || 'de').toLowerCase();
    sendJson(res, 200, {
      ok: true,
      lang: lang.startsWith('en') ? 'en' : 'de',
      text: lang.startsWith('en') ? HOW_TO_EN : HOW_TO_DE,
    });
  });

  app.get('/api/venues', (_req, res) => {
    sendJson(res, 200, { ok: true, venues: VENUES });
  });

  app.get('/api/venues/:slug/config', async (req, res) => {
    try {
      const cfg = await api.getVenueConfig(req.params.slug);
      const { brand: _b, ...safe } = cfg;
      sendJson(res, 200, { ok: true, config: safe });
    } catch (e) {
      sendErr(res, e);
    }
  });

  app.get('/api/venues/:slug/availability', async (req, res) => {
    try {
      const pax = Number(req.query.pax);
      const result = await api.checkAvailability({
        slug: req.params.slug,
        date: String(req.query.date || ''),
        pax,
        room_id: req.query.room_id ? String(req.query.room_id) : undefined,
      });
      sendJson(res, 200, { ok: true, ...result });
    } catch (e) {
      sendErr(res, e);
    }
  });

  app.get('/api/venues/:slug/propose', async (req, res) => {
    try {
      const pax = Number(req.query.pax);
      const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const result = await api.proposeSlots({
        slug: req.params.slug,
        date: String(req.query.date || ''),
        pax,
        room_id: req.query.room_id ? String(req.query.room_id) : undefined,
        limit,
      });
      sendJson(res, 200, { ok: true, ...result });
    } catch (e) {
      sendErr(res, e);
    }
  });

  app.post('/api/reservations', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await api.createReservation(body);
      sendJson(res, 200, result);
    } catch (e) {
      sendErr(res, e);
    }
  });

  app.get('/api/reservations/:code', async (req, res) => {
    try {
      const reservation = await api.getReservation({
        code: req.params.code,
        key: String(req.query.key || ''),
      });
      sendJson(res, 200, { ok: true, reservation });
    } catch (e) {
      sendErr(res, e, 404);
    }
  });

  app.post('/api/reservations/:code/cancel', async (req, res) => {
    try {
      const key = String((req.body && req.body.key) || req.query.key || '');
      const result = await api.cancelReservation({ code: req.params.code, key });
      sendJson(res, 200, result);
    } catch (e) {
      sendErr(res, e);
    }
  });

  app.post('/api/reservations/:code/modify', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await api.modifyReservation({
        ...body,
        code: req.params.code,
      });
      sendJson(res, 200, result);
    } catch (e) {
      sendErr(res, e);
    }
  });
}
