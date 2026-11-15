# Booking-API — Vertrag Rentfreudenhaus ↔ Easyrent-Backend

Gemeinsame HTTP-API. Frontend und neues Backend entwickeln dagegen.  
Basis-URL (Dev): `/api/booking`

Alle Geldwerte: `{ "amountCents": number, "currency": "EUR" }`.  
Daten: ISO-Datum `YYYY-MM-DD`. Zeitzone Shop: `Europe/Vienna`.

## Endpoints

### `GET /site`
Shop-Branding & Regeln (Logo, Altersgrenzen, Saison, Pickup-Zeit, Coverage-Default).

### `GET /locations`
Filialen für Abholort. IDs sind **Easyrent-`branchId`** (bereits gemappt).

### `GET /specials`
Extras (Versicherung `type=1`, Infos wie Test & Buy).

### `GET /calendar?from=&to=`
Tagesstatus für den Kalender: verfügbar / geschlossen / Rabatt-Prozent (z. B. `-10`).

### `POST /quote`
Body = Buchungsentwurf (Personen, Zeitraum, Filiale, Warenkorbzeilen).  
Antwort: Kategorien/Produkte + Cart-Summen + aktiver Rate-Titel.

### `POST /stock`
Verfügbarkeit pro Verleihgruppe / Modell / Größe für Zeitraum + Filiale.

### `POST /reservations`
Reservierung anlegen (ggf. Dry-Run bis Live-Flag).  
Antwort: `{ bookingId, paymentUrl?, status }`.

## Buchungsentwurf (Body)

```json
{
  "from": "2026-12-23",
  "to": "2026-12-31",
  "locationId": "1",
  "pickupDayBefore": true,
  "persons": [
    {
      "id": "p1",
      "kind": "adult",
      "firstName": "Max",
      "lastName": "Muster",
      "email": "max@example.com",
      "phone": "+43…",
      "height": 180,
      "weight": 75,
      "coverage": true,
      "lines": [
        { "productId": "1", "count": 1, "title": "Ski Platin", "modelId": "12", "property1": "170" }
      ]
    }
  ],
  "specialIds": ["1"],
  "discountCode": "",
  "remark": "",
  "newsletter": false,
  "termsAccepted": true
}
```

`productId` = Easyrent `rentalGroupId` (Platin `1`, Gold `2`, Silber `3`, Skischuh `6`, …).

## Mapping-Referenz (Shop Obertauern)

| Filiale (Anzeige) | branchId |
| --- | --- |
| Freudenhaus / Hauptfiliale | 1 |
| Skistation Hotel Edelweiss | 6 |
| Skistation Schaidbergbahn | 4 |
| Kohlmayr | 9 |
| Valamar Hotel Marietta | 10 |

| Produkt | rentalGroupId |
| --- | --- |
| Ski Platin | 1 |
| Ski Gold | 2 |
| Ski Silber | 3 |
| Skischuh | 6 |
| Snowboard | 18 |
| Snowboard Boot | 21 |
| Schneeschuhe | 24 |
| Skihelm | 35 |
| Skibrille | 83 |
| Rückenprotektor | 81 |
| Skischloss | 80 |
| Rodel | 82 |
| Depot | 91 |
