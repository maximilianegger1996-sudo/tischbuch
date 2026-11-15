# Verleih-Backend (Seed)

Startpunkt für die **eigene Verleih-Software** hinter Rentfreudenhaus.  
Früher als Easyrent-/Wintersteiger-Adapter gedacht — Ziel ab jetzt: **eure** API.

```
Rentfreudenhaus  →  /api/booking/*  →  dieses Backend  →  eigene DB / Shop-Logik
```

Zahlung, Stock und Reservierungen gehören hierher (nicht ins Frontend).

## Dev

```bash
cp .env.example .env
npm run dev   # http://127.0.0.1:8787
```

Vertrag: `../freudenhaus-buchung/docs/booking-api.md`  
Architektur: `../freudenhaus-buchung/docs/architecture.md`

## Status

Übergang kann noch EasyRest-Live lesen. Produktiv: eigene Katalog-/Preis-/Stock-Logik + Payment-Webhooks.
