/**
 * Cloudflare Workers stub — Web Standard Streamable HTTP MCP.
 *
 * Deploy (needs a Cloudflare account + wrangler login):
 *   cd mcp && npx wrangler deploy
 *
 * Optional vars/secrets:
 *   TISCHBUCH_SUPA_URL, TISCHBUCH_SUPA_ANON_KEY, TISCHBUCH_MCP_TOKEN
 *
 * Until deployed, use local stdio (`npm start`) or Node HTTP (`npm run start:http` / Docker).
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createGuestServer, SERVER_NAME, SERVER_VERSION, HOW_TO_DE, HOW_TO_EN } from './create-server.js';
import { VENUES } from './supabase.js';
import * as api from './guest-api.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers':
        'Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version',
      'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
    },
  });
}

function checkToken(request, env) {
  const token = (env.TISCHBUCH_MCP_TOKEN || '').trim();
  if (!token) return true;
  const hdr = request.headers.get('authorization') || '';
  return hdr === `Bearer ${token}` || hdr === `bearer ${token}`;
}

async function handleRest(request, url, env) {
  const path = url.pathname;
  try {
    if (path === '/health') {
      return json({ ok: true, service: SERVER_NAME, version: SERVER_VERSION, venues: VENUES.map((v) => v.slug) });
    }
    if (path === '/' || path === '') {
      return json({
        ok: true,
        service: SERVER_NAME,
        version: SERVER_VERSION,
        mcp: '/mcp',
        health: '/health',
        rest: '/api/venues',
      });
    }
    if (path === '/howto') {
      const lang = (url.searchParams.get('lang') || 'de').toLowerCase();
      return json({
        ok: true,
        lang: lang.startsWith('en') ? 'en' : 'de',
        text: lang.startsWith('en') ? HOW_TO_EN : HOW_TO_DE,
      });
    }
    if (path === '/api/venues') {
      return json({ ok: true, venues: VENUES });
    }
    const configMatch = path.match(/^\/api\/venues\/([^/]+)\/config$/);
    if (configMatch && request.method === 'GET') {
      const cfg = await api.getVenueConfig(configMatch[1], env);
      const { brand: _b, ...safe } = cfg;
      return json({ ok: true, config: safe });
    }
    const availMatch = path.match(/^\/api\/venues\/([^/]+)\/availability$/);
    if (availMatch && request.method === 'GET') {
      const result = await api.checkAvailability(
        {
          slug: availMatch[1],
          date: url.searchParams.get('date') || '',
          pax: Number(url.searchParams.get('pax')),
          room_id: url.searchParams.get('room_id') || undefined,
        },
        env,
      );
      return json({ ok: true, ...result });
    }
    const proposeMatch = path.match(/^\/api\/venues\/([^/]+)\/propose$/);
    if (proposeMatch && request.method === 'GET') {
      const limit = url.searchParams.get('limit');
      const result = await api.proposeSlots(
        {
          slug: proposeMatch[1],
          date: url.searchParams.get('date') || '',
          pax: Number(url.searchParams.get('pax')),
          room_id: url.searchParams.get('room_id') || undefined,
          limit: limit != null ? Number(limit) : undefined,
        },
        env,
      );
      return json({ ok: true, ...result });
    }
    if (path === '/api/reservations' && request.method === 'POST') {
      const body = await request.json();
      return json(await api.createReservation(body, env));
    }
    const getMatch = path.match(/^\/api\/reservations\/([^/]+)$/);
    if (getMatch && request.method === 'GET') {
      const reservation = await api.getReservation(
        { code: getMatch[1], key: url.searchParams.get('key') || '' },
        env,
      );
      return json({ ok: true, reservation });
    }
    const cancelMatch = path.match(/^\/api\/reservations\/([^/]+)\/cancel$/);
    if (cancelMatch && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      return json(
        await api.cancelReservation(
          { code: cancelMatch[1], key: body.key || url.searchParams.get('key') || '' },
          env,
        ),
      );
    }
    const modifyMatch = path.match(/^\/api\/reservations\/([^/]+)\/modify$/);
    if (modifyMatch && request.method === 'POST') {
      const body = await request.json();
      return json(await api.modifyReservation({ ...body, code: modifyMatch[1] }, env));
    }
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);
    if (url.pathname !== '/health' && !checkToken(request, env)) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') {
        return json({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST /mcp' }, id: null }, 405);
      }
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const server = createGuestServer(env);
      await server.connect(transport);
      return transport.handleRequest(request);
    }

    const rest = await handleRest(request, url, env);
    if (rest) return rest;
    return json({ ok: false, error: 'Not found' }, 404);
  },
};
