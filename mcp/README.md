# Tischbuch Guest MCP

MCP-Server für **Gäste-Reservierungen** (Verfügbarkeit, Vorschläge, buchen, lesen, stornieren, ändern = Storno+Neu).  
Nutzt dieselben `public_*`-RPCs und den **anon/publishable** Key wie die SPA — **keine** Staff-/Service-Role-Tools.

Ändert **keine** Website-Embeds und macht keinen Cutover (Tablex bleibt).

## Tools

| Tool | RPC / Logik |
|------|-------------|
| `list_venues` | feste Slugs `lue` / `steinbock` / `mundwerk` |
| `get_venue_config` | `public_config` |
| `check_availability` | `public_availability` |
| `propose_slots` | Verfügbarkeit + DE-Hinweise |
| `create_reservation` | `public_book` (`p_source=mcp`) |
| `get_reservation` | `public_get` |
| `cancel_reservation` | `public_cancel` |
| `modify_reservation` | Storno + Neubuchung (`confirm_replace=true`) |

## Lokal starten (ohne Go-Live)

```bash
cd mcp
npm install
npm start          # stdio MCP
npm run smoke      # read-only API check
TISCHBUCH_SMOKE_BOOK=1 npm run smoke   # optional: 1× buchen+stornieren
```

Optionale Env (Defaults = SPA-Werte):

- `TISCHBUCH_SUPA_URL`
- `TISCHBUCH_SUPA_ANON_KEY` (publishable/anon)

## Claude Desktop / Cursor (Beispiel)

```json
{
  "mcpServers": {
    "tischbuch-guest": {
      "command": "node",
      "args": ["/ABS/PFAD/tischbuch/mcp/src/index.js"]
    }
  }
}
```

## Hosting später

Optional Cloudflare Workers / gehostetes MCP — nicht Teil dieses Defaults. Siehe Store-Doku `docs/guest-mcp.md`.
