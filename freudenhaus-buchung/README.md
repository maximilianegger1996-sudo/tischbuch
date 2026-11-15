# FREUDENHAUS Buchungstrecke

Neue Kunden-Buchungsstrecke für **FREUDENHAUS Rent** (Obertauern), gebaut für den Übergang von **Rent Buddy online** zu **Wintersteiger Easyrent / Easyreservation**.

## Status

| Schritt | Quelle heute | Ziel nach Cutover |
| --- | --- | --- |
| Katalog, Preise, Stock, Filialen | Rent Buddy API (`freudenhaus.rentbuddy.solutions`) | Wintersteiger Easyreservation |
| Abschluss | Wintersteiger-Export-Payload (kein Oppwa) | Native Easyreservation-Buchung + Zahlung |

Provider umschalten:

```bash
VITE_BOOKING_PROVIDER=wintersteiger  # default
VITE_BOOKING_PROVIDER=rentbuddy      # alter Checkout-Pfad (POST /api/reservation)
```

## Flow

1. Personen  
2. Leihzeitraum  
3. Filiale (5 Standorte)  
4. Ausrüstung (Platin / Gold / Silber, Board, Schuhe, Extras + optionale Modell/Länge)  
5. Kontaktdaten  
6. Übersicht → Wintersteiger-Export

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Mapping → Easyrent

Domain-Typen in `src/api/types.ts` nutzen Wintersteiger-Begriffe (`Filiale`, `Verleihgruppe`, Export-Payload). Der Rent-Buddy-Adapter mappt IDs/Preise live; `wintersteiger.ts` bereitet den Import-Payload vor, bis die Easyreservation-Credentials angebunden sind.

## EasyRest (Wintersteiger)

Live-Installation (Obertauern):

- Klartext-Katalog: `http://89.26.17.53:11122/easyrest/rest` (kein Key senden)
- **TLS:** `https://89.26.17.53:11133/easyrest/rest/easyrest` (Zertifikat derzeit abgelaufen/self-signed)

```bash
cp .env.example .env   # EASYREST_ACCESS_ID setzen, nie committen
npm run easyrest:smoke
```

Das Smoke-Script **blockiert** `http://` mit Access-ID. Details: `docs/wintersteiger/connectivity-report.md`.  
Access-ID nur serverseitig — nicht als `VITE_`-Variable in die SPA.

### Live-Proxy (Dev/Preview)

Vite-Middleware `/api/easyrest/*` → EasyRest HTTPS, Access-ID nur am Server.

Live getestet gegen eure Installation:

| Call | Ergebnis |
| --- | --- |
| `GET /reservation/reservablearticles` | 786 Artikel, u. a. Ski Platin/Gold/Silber |
| `POST /reservation/getavailcount` | z. B. Platin 23.–31.12. Filiale 1 → 165 |
| `POST /reservation/calculateprices` | gleiches Beispiel → **€ 285** |
| `POST /reservation/insertupdatereservation` | Dry-Run bis `EASYREST_LIVE_BOOK=1` |

OpenAPI 1.0.0.15: `docs/wintersteiger/easyrest-1.0.0.15.swagger.json`

## Hinweis Backend

Rent-Buddy bleibt bis zum Cutover Katalog-/Preisquelle für die SPA. EasyRest-Credentials gehören **nicht** ins Repo.
