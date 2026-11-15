# EasyRest Connectivity Report

Stand: 15. November 2026, Europe/Vienna

Quelle: Mail Thomas Scharnböck (1. Sep 2026) an Maximilian Egger — Access für Newsletter/Klaviyo-Anbindung.

## Endpoints

| URL | Ergebnis |
| --- | --- |
| `http://89.26.17.53:11122/easyrest/rest` | Erreichbar, **kein TLS**. Service-Katalog ohne Auth (PingStatus `true`). |
| `https://89.26.17.53:11122/...` | Kein TLS (SSL wrong version number). |
| `https://89.26.17.53:443/...` | Cisco AnyConnect/VPN-Portal, **nicht** EasyRest. |
| `https://89.26.17.53:11133/easyrest/rest` | **TLS aktiv**. Self-signed CN `webservice.easyclou.net`, **Zertifikat abgelaufen seit 22. Nov 2023**. Cookie `Secure`. |

Swagger-Demo-Server nutzen dasselbe Muster: HTTP `:11122`, HTTPS `:11133`  
(siehe [EasyRest 1.0.0.15](https://app.swaggerhub.com/apis-docs/easyrent/easyrest/1.0.0.15)).

## Auth-Test (nur über HTTPS `:11133`)

Der Access-Key wurde **nicht** über Klartext-HTTP gesendet.

| Call | Ergebnis |
| --- | --- |
| `GET .../branches?accessId=…&top=5` | **200** — 5 Filialen (Freudenhaus, Schaidbergbahn, Edelweiss, Kohlmayr, Marietta) |
| `GET .../hotels?accessId=…&top=3` | **200** |
| `GET .../rentalarticles?accessId=…&top=3` | **200** |
| `GET .../customers?accessId=…&top=1` | **200** — Leserecht Kunden (Klaviyo-relevant) |
| `GET .../aliveserver` / `testaccess` | **200**, leerer Body |
| `GET .../aliveserver?accessId=` (HTTP, leer) | `401 accessId ungültig` |

## Sicherheit

1. **Nicht** `accessId` in Browser/SPA oder Git committen.
2. Produktion: Reverse-Proxy mit **gültigem** Zertifikat (Let’s Encrypt o. Ä.) vor `:11133`, oder neues Zertifikat von Wintersteiger.
3. Bis dahin: Server-seitiger Proxy / Smoke-Script mit `NODE_TLS_REJECT_UNAUTHORIZED=0` nur in kontrollierter Umgebung.
4. Access-Key nach Chat-Exposure **rotieren** lassen, sobald HTTPS sauber ist.

## Nächste Schritte an Thomas / Wintersteiger

- Bitte HTTPS-URL mit gültigem Zertifikat bestätigen (oder neues Zertifikat für `11133`).
- Ideal: Hostname statt nackter IP (z. B. `easyrest.freudenhaus…`).
- IP-Allowlist klären (Originalfrage Maxi, 28. Aug 2026).

## Buchungs-API (für Kundenstrecke)

Relevante Resources laut Katalog/Swagger:

- `GET /branches`
- `GET /reservation/reservablearticles`
- `POST /reservation/getavailcount` / `getavailcountdt`
- `POST /reservation/calculateprices`
- `POST /reservation/insertupdatereservation`
- `PUT /reservation/basket/{basketId}`
