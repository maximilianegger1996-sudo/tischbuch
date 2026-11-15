# Rentfreudenhaus

Skiverleih-Buchungsstrecke für **FREUDENHAUS Rent** (Obertauern). Ablösung der bisherigen Rent-Buddy-Onlinebuchung — angebunden an **Easyrent** (Wintersteiger Sports) über die **EasyRest**-API.

## Namensklärung

| Begriff | Bedeutung |
| --- | --- |
| **Rentfreudenhaus** | diese Kunden-Buchungsstrecke |
| **Easyrent** | Verleihsoftware / Zielsystem |
| **EasyRest** | REST-API von Easyrent (`/easyrest/rest/…`) |
| Rent Buddy | bisherige Online-Buchung (wird abgelöst) |

## Status

| Schritt | Quelle heute | Ziel |
| --- | --- | --- |
| Katalog, Preise, Stock, Filialen | Easyrent-API (HTTPS Proxy) | Easyrent |
| Abschluss | Dry-Run (`EASYREST_LIVE_BOOK=0`) | Live `insertupdatereservation` + Zahlung |

Provider:

```bash
VITE_BOOKING_PROVIDER=easyrent   # alias: wintersteiger
VITE_BOOKING_PROVIDER=rentbuddy  # alter Pfad
```

## Flow

1. Personen  
2. Leihzeitraum  
3. Filiale  
4. Ausrüstung  
5. Kontaktdaten  
6. Übersicht → Easyrent  

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Easyrent-API

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

Vite-Middleware `/api/easyrest/*` → Easyrent HTTPS-API, Access-ID nur am Server.

| Call | Ergebnis (Smoke) |
| --- | --- |
| `GET /reservation/reservablearticles` | 786 Artikel, u. a. Ski Platin/Gold/Silber |
| `POST /reservation/getavailcount` | z. B. Platin 23.–31.12. Filiale 1 → 165 |
| `POST /reservation/calculateprices` | gleiches Beispiel → **€ 285** |
| `POST /reservation/insertupdatereservation` | Dry-Run bis `EASYREST_LIVE_BOOK=1` |

OpenAPI 1.0.0.15: `docs/wintersteiger/easyrest-1.0.0.15.swagger.json`

## Hinweis

Credentials gehören **nicht** ins Repo.
