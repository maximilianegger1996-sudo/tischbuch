# Tischbuch Guest MCP · KI-Buchungs-Connector

MCP (+ REST/OpenAPI) für **Gäste-Reservierungen** bei LÜ, Steinbock und Mundwerk.  
Dieselben `public_*`-RPCs und der **anon/publishable** Key wie die SPA — **keine** Staff-/Service-Role-Tools.  
Ändert **keine** Website-Embeds und macht keinen Tablex-Cutover.

## Tools / API

| MCP tool | REST | RPC |
|----------|------|-----|
| `list_venues` | `GET /api/venues` | feste Slugs |
| `get_venue_config` | `GET /api/venues/:slug/config` | `public_config` |
| `check_availability` | `GET /api/venues/:slug/availability` | `public_availability` |
| `propose_slots` | `GET /api/venues/:slug/propose` | availability + DE/EN hints |
| `create_reservation` | `POST /api/reservations` | `public_book` (`p_source=mcp`) |
| `get_reservation` | `GET /api/reservations/:code?key=` | `public_get` |
| `cancel_reservation` | `POST /api/reservations/:code/cancel` | `public_cancel` |
| `modify_reservation` | `POST /api/reservations/:code/modify` | Storno + Neu (`confirm_replace=true`) |

Resources: `tischbuch://guest/howto-de`, `tischbuch://guest/howto-en`  
Prompts: `guest_booking_de`, `guest_booking_en`

## Quick start (local)

```bash
cd mcp
npm install
npm run smoke          # read-only against live public_* RPCs
npm start              # stdio MCP (Claude Desktop / Cursor)
npm run start:http     # remote MCP + REST on :8787
```

Optional env (defaults = SPA values):

- `TISCHBUCH_SUPA_URL`
- `TISCHBUCH_SUPA_ANON_KEY`
- `TISCHBUCH_MCP_TOKEN` — optional Bearer for hosted HTTP
- `PORT` / `HOST` / `ALLOWED_HOSTS`

---

## How guests use it · So nutzen Gäste es

### Deutsch (kurz)

1. Im Chat sagen: *„Tisch bei Steinbock / LÜ / Mundwerk reservieren“*.
2. Datum, Personen, Name, Telefon und E-Mail angeben.
3. Assistent prüft freie Zeiten und bucht **erst nach ausdrücklichem OK**.
4. Buchungscode aufbewahren (zusammen mit Telefon oder E-Mail) für Storno/Änderung.

### English (short)

1. Ask the assistant to reserve at Steinbock, LÜ, or Mundwerk.
2. Provide date, party size, name, phone, and email.
3. The assistant checks slots and books **only after you confirm**.
4. Keep the booking code (plus phone or email) for cancel/change.

---

## Connect · Claude Desktop

1. `npm install` in this folder (once).
2. Edit Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tischbuch-guest": {
      "command": "node",
      "args": ["/ABS/PATH/tischbuch/mcp/src/index.js"]
    }
  }
}
```

3. Restart Claude Desktop. Tools appear as `tischbuch-guest`.

**Remote (after hosting):** if your Claude build supports remote MCP URLs, add the hosted `https://YOUR_HOST/mcp` endpoint instead of `command`/`args`.

---

## Connect · Cursor

**Local stdio** — Cursor Settings → MCP → Add server:

```json
{
  "mcpServers": {
    "tischbuch-guest": {
      "command": "node",
      "args": ["/ABS/PATH/tischbuch/mcp/src/index.js"]
    }
  }
}
```

**Remote URL** (Streamable HTTP, after deploy):

```json
{
  "mcpServers": {
    "tischbuch-guest": {
      "url": "https://YOUR_HOST/mcp"
    }
  }
}
```

If you set `TISCHBUCH_MCP_TOKEN`, pass `Authorization: Bearer …` via the client’s header support.

---

## Connect · ChatGPT / Custom GPT

ChatGPT Custom GPT **Actions** speak HTTP/OpenAPI (not stdio). After you host this server:

1. Create a Custom GPT → **Actions** → Import schema from  
   `https://YOUR_HOST/openapi.yaml`  
   (or paste `openapi/guest-booking.openapi.yaml` and set `servers[0].url`).
2. Auth: **None** (guest RPCs) or **Bearer** if `TISCHBUCH_MCP_TOKEN` is set.
3. Instructions (paste): use `/howto?lang=de` or the DE/EN how-to above; never book without consent; consequential ops = create/cancel/modify.
4. Prefer MCP in ChatGPT when the product offers a remote MCP connector to `https://YOUR_HOST/mcp` (OpenAI is migrating Actions → MCP).

Privacy policy URL: use your restaurant site or Pages URL.

---

## Hosting (customers don’t need local npm)

### A) Docker (recommended first)

```bash
docker build -t tischbuch-guest-mcp ./mcp
docker run --rm -p 8787:8787 \
  -e TISCHBUCH_MCP_TOKEN=optional-shared-secret \
  tischbuch-guest-mcp
```

Point a reverse proxy (Caddy/nginx/Fly/Railway/Render) at `:8787` with HTTPS.  
Then guests/clients use `https://YOUR_HOST/mcp` or the OpenAPI REST paths.

### B) Node process

```bash
cd mcp && npm ci && npm run start:http
# PORT=8787 HOST=0.0.0.0
```

### C) Cloudflare Workers (stub)

```bash
cd mcp
npx wrangler login          # needs CF account — not in this repo
npx wrangler deploy
# optional: npx wrangler secret put TISCHBUCH_MCP_TOKEN
```

See `wrangler.toml` + `src/worker.js`. **Not live** until someone deploys with CF credentials.

### What’s live vs needs credentials

| Piece | Status |
|-------|--------|
| Guest `public_*` RPCs in Supabase | **Live** (anon key) |
| Local stdio MCP + smoke | **Works now** |
| Node HTTP MCP + REST (`start:http` / Docker image) | **Code ready** — needs a host + HTTPS URL |
| Cloudflare Worker | **Stub ready** — needs Wrangler login / CF account |
| ChatGPT Actions | Needs public HTTPS URL (+ optional Bearer) |
| Staff tools / website Tablex cutover | **Out of scope** |

## Project store doc

Longer connector guide: Project store `docs/guest-ai-connector.md` (and `docs/guest-mcp.md`).
