# Rent Buddy · technischer Deep Dive (Freudenhaus Shop)

Stand: Live-Analyse von `https://freudenhaus.rentbuddy.solutions` (Bundle `index.99df1ea2.js`, API-Probes 2026-11-15).  
Zweck: Referenz, damit wir Rentfreudenhaus bewusst dagegen bauen — nicht raten.

---

## 1. Stack

| Schicht | Technologie |
| --- | --- |
| SPA | **Vue 3** + **Vue Router** + **Pinia** (persist) |
| UI | **Vuetify 3** (Chips, Checkbox, Dialog/Overlay, SlideGroup) |
| i18n | `de` / `en` / `nl` (Locale-Objekte im Bundle) |
| Hosting | `freudenhaus.rentbuddy.solutions` (nginx), Media unter `/media/cache/…` |
| Zahlung | **Oppwa / Hobex** (`eu-prod.oppwa.com` / `eu-test.oppwa.com`), Brands: MASTER, VISA, PAYPAL, AMEX, APPLEPAY |
| Backend | PHP-Style Problem-JSON bei 404; Shop-API unter `/{locale}/api/…` und teils `/api/…` |

Pinia-Stores: `booking`, `app`, `cookies`, `session`.

---

## 2. Navigation / UX-Architektur

Rent Buddy ist **kein Step-Wizard mit Routes**, sondern **eine scrollbare Booking-Seite** mit Sticky-Mainbar:

1. `sectionPersons` — Personen
2. `sectionCalendar` — Zeitraum
3. `sectionLocation` — Abholort
4. `sectionProducts` — Ausrüstung
5. `sectionSpecials` — Wünsche / Versicherung
6. `sectionCart` — Warenkorb pro Person

Mainbar-Labels: Personen · Tage · Abholort · Produkte · Warenkorb.

Checkout ist **separat geroutet**:

- `checkout` → `checkout/overview` → `checkout/payment` → `checkout/payment/check` → `checkout/success`
- Plus: `login`, `reservations`, `groups`, `profile`, …

**Konsequenz für uns:** Der „Übergang weitere Personen“ sitzt **in der Produktauswahl**, nicht als eigener Wizard-Step.

---

## 3. API-Oberfläche (live verifiziert)

Basis: `Yn()` = Shop-Base (häufig `https://freudenhaus.rentbuddy.solutions` + Locale).

| Methode | Pfad | Rolle |
| --- | --- | --- |
| GET | `/{lang}/api/site` | Settings, Seasons, Filter, Banners |
| GET | `/api/locations` | Filialen (+ closed ranges, businesshours, Map) |
| GET | `/api/specials` | Versicherung (`type=1`), Infos |
| GET | `/api/accommodations` | Unterkünfte |
| GET | `/api/content/{slug}` | CMS-Texte |
| POST | `/{lang}/api/calendar` | Rabatt-Fenster (`rates[].percent`) |
| POST | `/{lang}/api/prices` | **Katalog + Cart-Preis** (Body = `getBookingData()`) |
| POST | `/{lang}/api/stock` | Stock je Produkt/Modell/`property1` |
| POST | `{baseUrl}/api/reservation` | Reservierung anlegen → `bookingId`, `checkoutId` |
| GET | `/api/reservation/payment/status` | Zahlungsstatus |
| GET/POST | `/api/customer/*` | Session / Personendaten / Logout |
| GET | `/api/groups/group/{…}` | Gruppenmodus |

Request-Header für POSTs: `Content-Type: text/plain` + JSON-Body (kein `application/json`).

### 3.1 Site (Auszug live)

- Shop: FREUDENHAUS, TZ `Europe/Vienna`
- `youthAge: 11`, `adultAge: 17`, `maxPersons: 20`
- `pickuptime: 15:00`, `coveragePerDefault: true`
- Saison 2026/27: `2026-11-20` → `2027-04-11`
- CI-Farben RB: Font/Button `#4D4D4D`, Highlight `#93BAA2` (nicht FH-Pink)

### 3.2 Locations (RB-IDs ≠ Easyrent-branchIds)

| RB `id` | Titel | Easyrent `branchId` (unser Mapping) |
| --- | --- | --- |
| 1 | Hauptfiliale | 1 |
| 2 | RENT EDELWEISS | 6 |
| 3 | RENT Schaidberg | 4 |
| 4 | RENT Kohlmayr | 9 |
| 5 | RENT VALAMAR PLACES | 10 |

### 3.3 Katalog aus `POST /prices` (Kohlmayr, 2 Tage, 2 Erwachsene leer)

| RB productId | Titel | Kategorie | Modelle (API) |
| --- | --- | --- | ---: |
| 1 | Ski Platin | Ski | **55** |
| 2 | Ski Gold | Ski | **32** (Bestseller) |
| 3 | Ski Silber | Ski | 0 |
| 5 | Snowboard | Snowboard | 4 |
| 4 | Skischuh | Schuhe | 0 |
| 6 | Snowboard Boot | Schuhe | 0 |
| 8 | Skihelm | Sonstige | 0 |
| 47 / 44 / 43 / 45 / 49 / 7 | Brille, Protektor, Schloss, Rodel, Depot, Schneeschuhe | Sonstige | 0 |

**Wichtig:** RB-Produkt-IDs sind **nicht** 1:1 Easyrent-`rentalGroupId` (Helm RB `8` vs ER `35`, Snowboard RB `5` vs ER `18`, Skischuh RB `4` vs ER `6`). Ski 1/2/3 zufällig gleich.

Preise in der API: Beträge oft als **Cent-String** (`"4455"` = € 44,55) in `displayPrices[ageType].daily`.

---

## 4. Booking-State & Payload

Personen liegen getrennt: `persons.adults[]` / `persons.kids[]`.  
`personsAll()` = Concat. Typen: Adult / Youth / Kid (`resolvedType`).

`getBookingData()` (vereinfacht):

```json
{
  "language": "de",
  "date": { "from": "…", "to": "…" },
  "location": 4,
  "rate": null,
  "hours": null,
  "persons": [
    {
      "id": "…",
      "mainperson": true,
      "type": 1,
      "firstname": "",
      "lastname": "",
      "email": "",
      "phone": "",
      "age": null,
      "coverage": true,
      "products": [
        { "id": 1, "count": 1, "modelId": 488, "property1": "159" }
      ]
    }
  ],
  "specials": [1],
  "dc": "",
  "tz": "Europe/Vienna",
  "pickupDayBefore": false,
  "newsletter": false,
  "termsAccepted": false,
  "createUser": false,
  "wl": "",
  "remark": ""
}
```

`addProduct(person, product)` schreibt nur `{ id, count, title }` auf **eine** Person.  
Modell: `addProductModel(person, product, model, property1)`.

Persist: Pinia `persist` hydriert Dates und Person-IDs nach Reload.

---

## 5. Personen-Übergang (das fehlende Stück)

### Verhalten live

1. Gast klickt **Auswählen** auf z. B. Ski Platin.
2. Overlay/Panel öffnet sich:
   - Titel Produkt
   - Copy: *„Wähle bitte hier die gewünschten Personen für diese Kategorie aus…“*
   - Zeilen: **Erwachsener 1**, **Erwachsener 2** (+ Preis)
   - Actions: **Zur Modellauswahl** · **Weiter**
3. Gewählte Personen bekommen das Produkt in ihren `products[]`.
4. Warenkorb zeigt **pro Person** (`PersonCartSummary`):
   - `Erwachsener 1` / Items / Zwischensumme
   - `Erwachsener 2` / „Keine Produkte gewählt“ falls leer
5. Checkout-Validierung (i18n): *für jede Person mindestens einen Artikel*.

### Was das technisch bedeutet

- Kein „Person-Tab-only“-Flow als einzige Wahrheit.
- Primär: **Produkt → multi-select Personen**.
- Cart ist die **Kontrolle**, ob Person 2 noch leer ist.
- Fehlercodes u. a. `110` Zeitraum, `201` Standort geschlossen, `705/706` Gruppe.

### Was wir in Rentfreudenhaus nachgebaut haben

- Paket tippen → Assign-Panel (Personen + Preise) → Weiter  
- Tabs `Erwachsener N` + Handoff-CTA / Footer `Weiter zu Erwachsener 2`  
- Weiter zu Daten erst sinnvoll, wenn alle ein Paket haben  

Abweichung bewusst: wir sind **paket-first** (Ski+Schuh+Helm), RB ist **artikel-first**.

---

## 6. Preise & Cart (Probe)

Payload: Person1 = Platin(1)+Schuh(4)+Helm(8), Person2 leer, 23.–24.12., Location RB `4`, Special Versicherung:

- Items Person1: 99 + 45 + 25 = 169 € Listenanteil (Cent-Strings)
- Discount „Onlinebonus -10%“: −16,90 €
- Coverage: 12,00 €
- `finalPrice` Person1: 164,10 €
- Person2: 0 €
- `cart.prepay` = Gesamt (hier Vollvorauszahlung)

Kalender-Rates: u. a. `percent: 10` / `20` ab Stichtagen (Early-Bird).

Stock: `POST /stock` → je Produkt `stock` + `models[{id, property1, stock}]`.

---

## 7. Checkout & Zahlung

1. `POST /api/reservation` mit Booking-Data  
2. Response: `bookingId`, optional `checkoutId`  
3. Payment-View lädt Oppwa-Widget (`getPaymentUrl()` → test/prod host) + `data-brands`  
4. Poll/Check: `/api/reservation/payment/status`  
5. Success-Route

Kein Stripe im Live-Shop — Oppwa/Hobex.

---

## 8. Bundle-Landkarte (Frontend)

Lazy Chunks (Auszug): `Booking`, `Checkout`, `Payment`, `OrderOverview`, `PersonCartSummary`, `MagicMainBar`, `Group(s)`, `Login`, `Reservations`, …

Produkt-UI inkl. Personen-Picker steckt in der Booking-Fläche (Vuetify Overlay + Checkbox/Chip-Pattern).

---

## 9. Gap-Analyse → eigene Verleih-Software

| Thema | Rent Buddy | Rentfreudenhaus heute | Ziel eigene Software |
| --- | --- | --- | --- |
| IDs | eigene Shop-IDs | Easyrent-IDs (+ RB-Media-Keys) | **eine** kanonische ID-Welt |
| Katalog | 13 Produkte, bis 55 Modelle | Whitelist 4 Pakete + 4 Extras, max 4 Modelle | kuratiert online, voll intern |
| Multi-Person | Produkt→Personen-Panel | Paket→Personen-Panel + Handoff | beibehalten |
| Preise | Server `/prices` authoritative | Demo/EasyRest/RB-Fallback | Backend `/api/booking/quote` |
| Stock | `/stock` | teilweise | atomar + Reservation hold |
| Zahlung | Oppwa | geplant Stripe/Mollie | Webhook-first |
| UI-Shell | One-page scroll + checkout routes | Wizard-Steps | Wizard ok, Logik RB-kompatibel |

---

## 10. Relevante Dateien bei uns

- `src/api/rentbuddy.ts` — RB-Client (Locale-Prefix, `text/plain` POST)
- `src/api/mapping.ts` — Filial-Mapping RB↔ER
- `src/api/product-media.json` — RB-Media (IDs = RB)
- `src/lib/catalog.ts` — Online-Whitelist
- `src/App.tsx` — Assign-Panel / Handoff
- `docs/booking-api.md` — Zielvertrag eigene API
- `docs/architecture.md` — Zielbild Verleih-Software

---

## 11. Artefakte / Screens

- Live-Referenz Personen-Assign: `/opt/cursor/artifacts/rentbuddy_person_assign_reference.png`
- Unser Panel: `person_assign_panel.png`
- Unser Handoff: `person_handoff_cta.png`
