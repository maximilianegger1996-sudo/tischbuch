# Rentfreudenhaus · Architektur

Zwei neue Systeme ersetzen Rent Buddy online:

| System | Rolle |
| --- | --- |
| **Rentfreudenhaus** | Kunden-Buchungs-UI (SPA) |
| **Easyrent-Backend** | neues Buchungs-API/Backend für Online-Reservierung |
| Easyrent (Wintersteiger) | Verleihsoftware im Shop — Zielsystem hinter dem Backend |
| EasyRest | REST-Schnittstelle der Wintersteiger-Installation |

```
Kunde
  └─ Rentfreudenhaus (Frontend)
       └─ Easyrent-Backend  ←  unser neues Backend
            └─ EasyRest / Easyrent (Shop-System)
```

## Verantwortung

**Rentfreudenhaus** kennt nur die Buchungs-API des Backends:

- Personen, Zeitraum, Filiale, Katalog, Preise, Stock, Reservierung, Zahlung
- keine Access-IDs, kein direktes EasyRest-Payload-Format im Browser

**Easyrent-Backend** besitzt:

- Mapping Filialen / Verleihgruppen (Rent Buddy → Easyrent IDs)
- Preis-/Verfügbarkeitslogik über EasyRest (oder eigene Regeln)
- Reservierungsanlage (`insertupdatereservation` o. ä.)
- Zahlungsanbindung, Webhooks, Bestätigungsmails
- Secrets (`accessId`, Payment Keys)

## Übergang jetzt

Solange das neue Backend noch wächst, kann die SPA über einen Dev-Proxy (`/api/easyrest`) gegen die Live-EasyRest-Installation sprechen. Zielzustand: SPA → nur noch `/api/booking/*` am Easyrent-Backend.

## API-Vertrag (Ziel)

Siehe `docs/booking-api.md`.
