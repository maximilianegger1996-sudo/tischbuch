#!/usr/bin/env node
/**
 * Tischbuch guest MCP — stdio server.
 * Only guest public_* Supabase RPCs (anon/publishable key). No staff/admin tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VENUES } from './supabase.js';
import * as api from './guest-api.js';

const server = new McpServer({
  name: 'tischbuch-guest',
  version: '0.1.0',
});

function text(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ ok: false, error: message }, null, 2) }],
  };
}

const slug = z.enum(['lue', 'steinbock', 'mundwerk']);

server.tool(
  'list_venues',
  'Listet die drei Tischbuch-Häuser (Slugs für die anderen Tools). Keine Auth nötig.',
  {},
  async () => text({ venues: VENUES, note_de: 'Slug in den anderen Tools als slug verwenden.' }),
);

server.tool(
  'get_venue_config',
  'Öffentliche Buchungskonfiguration: Name, Räume, max. Personen, open_from, Storno-Frist.',
  { slug },
  async ({ slug: s }) => {
    try {
      const cfg = await api.getVenueConfig(s);
      const { brand: _b, ...safe } = cfg;
      return text({ ok: true, config: safe });
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'check_availability',
  'Prüft freie Online-Zeiten für Datum und Personenzahl (optional Raum).',
  {
    slug,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
    pax: z.number().int().min(1).max(50),
    room_id: z.string().uuid().optional(),
  },
  async (args) => {
    try {
      return text({ ok: true, ...(await api.checkAvailability(args)) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'propose_slots',
  'Schlägt die nächsten freien Zeiten vor (Gast-Hinweise auf Deutsch).',
  {
    slug,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pax: z.number().int().min(1).max(50),
    room_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  },
  async (args) => {
    try {
      return text({ ok: true, ...(await api.proposeSlots(args)) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'create_reservation',
  'Legt eine Online-Reservierung an (public_book, Quelle mcp). Nur nach Gast-Zustimmung.',
  {
    slug,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().describe('HH:MM'),
    pax: z.number().int().min(1).max(50),
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email(),
    note: z.string().optional(),
    room_id: z.string().uuid().optional(),
  },
  async (args) => {
    try {
      return text(await api.createReservation(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'get_reservation',
  'Liest eine Gast-Reservierung (Buchungscode + Telefon oder E-Mail).',
  {
    code: z.string().min(4),
    key: z.string().min(3).describe('Telefon oder E-Mail'),
  },
  async (args) => {
    try {
      return text({ ok: true, reservation: await api.getReservation(args) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'cancel_reservation',
  'Storniert innerhalb der Online-Frist (public_cancel).',
  {
    code: z.string().min(4),
    key: z.string().min(3),
  },
  async (args) => {
    try {
      return text(await api.cancelReservation(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.tool(
  'modify_reservation',
  'Änderung als Storno+Neubuchung. Nur mit confirm_replace=true nach Gast-OK.',
  {
    code: z.string().min(4),
    key: z.string().min(3),
    slug,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string(),
    pax: z.number().int().min(1).max(50),
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email(),
    note: z.string().optional(),
    room_id: z.string().uuid().optional(),
    confirm_replace: z.boolean(),
  },
  async (args) => {
    try {
      return text(await api.modifyReservation(args));
    } catch (e) {
      return fail(e);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
