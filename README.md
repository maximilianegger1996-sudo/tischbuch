# Tischbuch

Tischreservierung (Gästeseite und Personal-Ansicht) für die drei Lürzer-Häuser in Obertauern. Statische Seite auf GitHub Pages, Daten in Supabase.

**Live:** https://maximilianegger1996-sudo.github.io/tischbuch/

## Häuser

| Betrieb | Slug | Gäste-Buchung | Embed |
|---------|------|---------------|--------|
| LÜ – Burger & Grill | `lue` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=lue) | [embed](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=lue&embed=1&quelle=website) |
| Restaurant Steinbock | `steinbock` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=steinbock) | [embed](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=steinbock&embed=1&quelle=website) |
| Mundwerk | `mundwerk` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=mundwerk) | [embed](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=mundwerk&embed=1&quelle=website) |

Die Startseite zeigt eine Übersicht aller Häuser. Personal meldet sich dort an und kann bei Bedarf zwischen Betrieben wechseln.

### Online buchbar ab (`online_open_from`)

| Haus | Datum |
|------|--------|
| LÜ | 2026-11-20 |
| Mundwerk | 2026-11-20 |
| Steinbock | 2026-11-25 |

Leeres Datum in der Personal-UI = sofort buchbar. Werte unter **Online-Buchung** änderbar.

## Einbinden (Website / Shopify Custom Liquid)

Pro Haus denselben Embed mit dem jeweiligen `betrieb`-Slug. Shopify-App erst später (Montag); bis dahin iframe / Custom Liquid reicht.

### Steinbock

```html
<iframe
  src="https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=steinbock&embed=1&quelle=website"
  title="Tisch reservieren – Steinbock"
  loading="lazy"
  style="width:100%;min-height:780px;border:0"></iframe>
```

### LÜ – Burger & Grill

```html
<iframe
  src="https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=lue&embed=1&quelle=website"
  title="Tisch reservieren – LÜ"
  loading="lazy"
  style="width:100%;min-height:780px;border:0"></iframe>
```

### Mundwerk

```html
<iframe
  src="https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=mundwerk&embed=1&quelle=website"
  title="Tisch reservieren – Mundwerk"
  loading="lazy"
  style="width:100%;min-height:780px;border:0"></iframe>
```

Weitere Kanäle (ohne iframe): `quelle=google`, `quelle=facebook`, `quelle=instagram` — fertige Links auch unter Personal → **Online-Buchung** → Kopieren.

Öffentliche Basis-URL (`public_url` in der Venue):  
`https://maximilianegger1996-sudo.github.io/tischbuch/`

## Modi

- **Personal:** Anmeldung auf der Startseite (Supabase Auth)
- **Gast:** `?gast=1&betrieb=<slug>`
- **Embed:** zusätzlich `&embed=1` (ohne Hero/Footer)
- **Demo offline:** `?demo=1&betrieb=<slug>` (Beispieldaten im Browser)

## E-Mail-Warteschlange (Smoke)

Die App **verschickt noch keine E-Mails**. Bestätigungen und Stornos werden nur in die Tabelle `mails` geschrieben und unter Personal → **E-Mails** angezeigt (`staff_queue_mail` beim Sync).

Kurztest je Haus:

1. Personal anmelden, Haus wählen; unter Online-Buchung Bestätigung/Storno aktiv lassen.
2. Gastbuchung mit gültiger E-Mail → Tab **E-Mails**: Eintrag „Bestätigung“.
3. Storno → Eintrag „Storno“.
4. Buchung ohne E-Mail → kein Eintrag.

Echter SMTP-/Provider-Versand ist **nach** Go-Live (Queue bleibt die Quelle).

## CI

GitHub Actions (`.github/workflows/ci.yml`) auf Push/PR zu `main`:

- **SPA syntax:** `node scripts/check-spa.mjs` (HTML-Marker + Script-Syntax)
- **MCP smoke:** `cd mcp && npm ci && npm run smoke` (Config + Verfügbarkeit, read-only)

## Stack

- Frontend: eine `index.html` (kein Build)
- Backend: Supabase (Venues, Tische, Reservierungen, öffentliche RPCs `public_*`)
- Branding und Buchungsregeln liegen pro Venue in der Datenbank

### Schriften

**Personal / Hub / Login (alle Häuser):** Jost für Fließtext und Display (`body:not(.guest)` + `STAFF_FONT_VARS` in `applyBrand`).

**Gast (`?gast=1`) je Haus (`venues.brand`):**

| Haus | Fließtext (`--sans`) | Display (`--serif`) |
|------|----------------------|---------------------|
| LÜ / Mundwerk | Jost | Libre Bodoni |
| Steinbock | Open Sans | Open Sans Condensed |

Gast-Presets schreibt Personal-Login nach; SQL: `supabase/brand-jost-body-font.sql`.

## Guest MCP (dev / Agents)

Gast-Tools für AI-Agents ohne Website-Cutover: Ordner [`mcp/`](mcp/).

```bash
cd mcp && npm install && npm run smoke
```

Siehe `mcp/README.md`. Ändert keine Live-Embeds.

## Go-Live (flip-ready)

- Embed-Dateien zum Einfügen: Ordner [`embeds/`](embeds/)
- Smoke (Config + Verfügbarkeit): `node scripts/smoke-go-live.mjs`
- Checkliste Done vs. nur-Mensch-Cutover (Merge, Shopify Montag, DNS, Embeds live): Projekt-Store `docs/go-live-checklist.md`

Kein öffentlicher Cutover durch den Agenten — PR mergen + Snippets einsetzen reicht für den Flip.
