# Easyrent-Backend

Neues Buchungs-Backend für **Rentfreudenhaus**. Die SPA spricht nur diese API — EasyRest bleibt Adapter hinter der Grenze.

```
Rentfreudenhaus  →  /api/booking/*  →  Easyrent-Backend  →  EasyRest (Shop)
```

## Dev

```bash
cp .env.example .env   # EASYREST_* setzen
npm run dev            # http://127.0.0.1:8787
```

Vertrag: `../freudenhaus-buchung/docs/booking-api.md`

## Status

Übergang: Endpoints leiten auf die bestehende EasyRest-Live-Installation weiter.  
Ziel: eigene Logik (Mapping, Quote, Zahlung, Mails) hier — Secrets nie im Frontend.
