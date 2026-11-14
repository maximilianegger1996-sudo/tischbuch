# Tischbuch

Tischreservierung (Gästeseite und Personal-Ansicht) für die drei Lürzer-Häuser in Obertauern. Statische Seite auf GitHub Pages, Daten in Supabase.

**Live:** https://maximilianegger1996-sudo.github.io/tischbuch/

## Häuser

| Betrieb | Slug | Gäste-Buchung |
|---------|------|----------------|
| LÜ – Burger & Grill | `lue` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=lue) |
| Restaurant Steinbock | `steinbock` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=steinbock) |
| Mundwerk | `mundwerk` | [öffnen](https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=mundwerk) |

Die Startseite zeigt eine Übersicht aller Häuser. Personal meldet sich dort an und kann bei Bedarf zwischen Betrieben wechseln.

## Einbinden (Website / Shopify)

Pro Haus denselben Embed-Code mit dem jeweiligen `betrieb`-Slug verwenden:

```html
<iframe
  src="https://maximilianegger1996-sudo.github.io/tischbuch/?gast=1&betrieb=steinbock&embed=1&quelle=website"
  title="Tisch reservieren"
  loading="lazy"
  style="width:100%;min-height:780px;border:0"></iframe>
```

Weitere Kanäle: `quelle=google`, `quelle=facebook`, `quelle=instagram`.

## Modi

- **Personal:** Anmeldung auf der Startseite (Supabase Auth)
- **Gast:** `?gast=1&betrieb=<slug>`
- **Embed:** zusätzlich `&embed=1` (ohne Hero/Footer)
- **Demo offline:** `?demo=1&betrieb=<slug>` (Beispieldaten im Browser)

## Stack

- Frontend: eine `index.html` (kein Build)
- Backend: Supabase (Venues, Tische, Reservierungen, öffentliche RPCs `public_*`)
- Branding und Buchungsregeln liegen pro Venue in der Datenbank
