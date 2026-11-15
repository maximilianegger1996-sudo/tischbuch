/**
 * Shared guest MCP server (tools + resources + prompts).
 * Guest-safe only: public_* RPCs via anon/publishable key. No staff tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { VENUES } from './supabase.js';
import * as api from './guest-api.js';

export const SERVER_NAME = 'tischbuch-guest';
export const SERVER_VERSION = '0.2.0';

const slug = z.enum(['lue', 'steinbock', 'mundwerk']);

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

const HOW_TO_DE = `Tischbuch Gast-Buchung (LÜ, Steinbock, Mundwerk)

Ablauf:
1. list_venues → Haus wählen (slug: lue | steinbock | mundwerk)
2. get_venue_config → max. Personen, open_from, Storno-Frist
3. propose_slots oder check_availability → freie Zeiten
4. create_reservation nur nach ausdrücklicher Gast-Zustimmung (Name, Telefon, E-Mail)
5. get_reservation / cancel_reservation mit Buchungscode + Telefon oder E-Mail
6. modify_reservation = Storno + Neubuchung, nur mit confirm_replace=true nach Gast-OK

Regeln: Keine Staff-Funktionen. Keine Buchung ohne Zustimmung. Bei Fehlern alternative Zeiten vorschlagen oder zum Anrufen raten.`;

const HOW_TO_EN = `Tischbuch guest booking (LÜ, Steinbock, Mundwerk)

Flow:
1. list_venues → pick a venue (slug: lue | steinbock | mundwerk)
2. get_venue_config → max party size, open_from, cancel window
3. propose_slots or check_availability → free times
4. create_reservation only after explicit guest consent (name, phone, email)
5. get_reservation / cancel_reservation with booking code + phone or email
6. modify_reservation = cancel + rebook; require confirm_replace=true after guest OK

Rules: No staff tools. Never book without consent. On errors, suggest other slots or calling the restaurant.`;

/**
 * Fresh McpServer instance (stateless HTTP creates one per request).
 * @param {Record<string, string>|undefined} env optional Cloudflare/Worker bindings
 */
export function createGuestServer(env) {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerResource(
    'guest-howto-de',
    'tischbuch://guest/howto-de',
    {
      title: 'Gast-Anleitung (DE)',
      description: 'Kurzablauf für KI-Assistenten: Verfügbarkeit und Reservierung.',
      mimeType: 'text/plain; charset=utf-8',
    },
    async () => ({
      contents: [{ uri: 'tischbuch://guest/howto-de', mimeType: 'text/plain; charset=utf-8', text: HOW_TO_DE }],
    }),
  );

  server.registerResource(
    'guest-howto-en',
    'tischbuch://guest/howto-en',
    {
      title: 'Guest how-to (EN)',
      description: 'Short flow for AI assistants: availability and booking.',
      mimeType: 'text/plain; charset=utf-8',
    },
    async () => ({
      contents: [{ uri: 'tischbuch://guest/howto-en', mimeType: 'text/plain; charset=utf-8', text: HOW_TO_EN }],
    }),
  );

  server.registerPrompt(
    'guest_booking_de',
    {
      title: 'Gast-Reservierung führen (DE)',
      description: 'Hilft dem Gast Schritt für Schritt bei der Online-Reservierung.',
      argsSchema: {
        slug: slug.optional().describe('Optional: bereits bekanntes Haus'),
      },
    },
    async ({ slug: s }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              HOW_TO_DE +
              (s ? `\n\nDas gewünschte Haus ist bereits: ${s}.` : '\n\nFrage zuerst, welches Haus (LÜ, Steinbock oder Mundwerk).'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'guest_booking_en',
    {
      title: 'Guide guest booking (EN)',
      description: 'Walk a guest through online reservation step by step.',
      argsSchema: {
        slug: slug.optional().describe('Optional: already known venue slug'),
      },
    },
    async ({ slug: s }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              HOW_TO_EN +
              (s
                ? `\n\nPreferred venue slug is already: ${s}.`
                : '\n\nFirst ask which venue (LÜ, Steinbock, or Mundwerk).'),
          },
        },
      ],
    }),
  );

  server.registerTool(
    'list_venues',
    {
      title: 'List venues',
      description:
        'List the three Tischbuch restaurants (slugs for other tools). No auth. / Listet die drei Häuser (Slugs). Keine Auth.',
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () =>
      text({
        venues: VENUES,
        note_de: 'Slug in den anderen Tools als slug verwenden.',
        note_en: 'Use slug in the other tools.',
      }),
  );

  server.registerTool(
    'get_venue_config',
    {
      title: 'Venue config',
      description:
        'Public booking config: name, rooms, max pax, open_from, cancel hours. / Öffentliche Buchungskonfiguration.',
      inputSchema: { slug },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ slug: s }) => {
      try {
        const cfg = await api.getVenueConfig(s, env);
        const { brand: _b, ...safe } = cfg;
        return text({ ok: true, config: safe });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'check_availability',
    {
      title: 'Check availability',
      description:
        'Check free online slots for date and party size (optional room). / Prüft freie Online-Zeiten.',
      inputSchema: {
        slug,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
        pax: z.number().int().min(1).max(50),
        room_id: z.string().uuid().optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        return text({ ok: true, ...(await api.checkAvailability(args, env)) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'propose_slots',
    {
      title: 'Propose slots',
      description:
        'Suggest the next free times with German guest-facing hints. / Schlägt freie Zeiten mit DE-Hinweisen vor.',
      inputSchema: {
        slug,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        pax: z.number().int().min(1).max(50),
        room_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        return text({ ok: true, ...(await api.proposeSlots(args, env)) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'create_reservation',
    {
      title: 'Create reservation',
      description:
        'Create an online reservation (public_book, source=mcp). Only after guest consent. / Nur nach Gast-Zustimmung buchen.',
      inputSchema: {
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
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        return text(await api.createReservation(args, env));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_reservation',
    {
      title: 'Get reservation',
      description:
        'Read a guest reservation (booking code + phone or email). / Liest eine Gast-Reservierung.',
      inputSchema: {
        code: z.string().min(4),
        key: z.string().min(3).describe('Phone or email / Telefon oder E-Mail'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        return text({ ok: true, reservation: await api.getReservation(args, env) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'cancel_reservation',
    {
      title: 'Cancel reservation',
      description:
        'Cancel within the online cancel window (public_cancel). / Storniert innerhalb der Online-Frist.',
      inputSchema: {
        code: z.string().min(4),
        key: z.string().min(3),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        return text(await api.cancelReservation(args, env));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'modify_reservation',
    {
      title: 'Modify reservation',
      description:
        'Change = cancel + rebook. Requires confirm_replace=true after guest OK. / Änderung = Storno+Neu.',
      inputSchema: {
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
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        return text(await api.modifyReservation(args, env));
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}

export { HOW_TO_DE, HOW_TO_EN };
