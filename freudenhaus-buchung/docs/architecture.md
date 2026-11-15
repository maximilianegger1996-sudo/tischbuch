# Rentfreudenhaus · Architektur (ab morgen: eigene Verleih-Software)

Ziel ab jetzt — **kein Wintersteiger/Easyrent mehr** als Zielsystem.

```
Kunde
  └─ Rentfreudenhaus (Buchungs-Frontend)
       └─ Verleih-Backend / eigene Verleih-Software
            ├─ Katalog, Preise, Stock, Filialen
            ├─ Reservierungen & Check-in
            └─ Zahlung (PSP) + Mails
```

| System | Rolle |
| --- | --- |
| **Rentfreudenhaus** | Kunden-Buchungs-UI |
| **Eigene Verleih-Software** | Shop-Betrieb + Online-API (ab morgen) |
| `easyrent-backend/` | Seed/Übergang — wird zur API der eigenen Software |
| Wintersteiger EasyRest | nur noch optional/historisch, nicht produktiv |

## Brauchen wir ein Backend?

**Ja.** Auch mit eigener Verleih-Software braucht Online-Buchung ein serverseitiges Stück:

- Secrets (Payment, Mail) nie im Browser
- Webhooks der Zahlung (bezahlt → Reservierung fest)
- Stock atomar reservieren
- Bestätigungsmail / Shop-Ticket
- Admin später (No-shows, Umbuchung)

Die SPA allein reicht nicht. Der Ordner `easyrent-backend/` ist der Startpunkt — morgen umbenennen/weiterbauen zur eigenen API (`/api/booking/*`), nicht EasyRest.

## Zahlung — Empfehlung

Rent Buddy nutzte Oppwa/Copy&Pay (Karten, PayPal, Apple Pay). Für die eigene Software:

**Empfehlung: Stripe Checkout oder Mollie** (beide AT/EU, Apple Pay / Google Pay / Karte / oft PayPal).

Ablauf:

1. Frontend sendet Buchungsentwurf → Backend legt **Reservierung `pending_payment`** an  
2. Backend erzeugt Payment-Session (Stripe Checkout / Mollie Hosted)  
3. Gast zahlt  
4. **Webhook** `payment.paid` → Status `confirmed`, Mail, Stock lock  
5. Return-URL → Danke-Seite in Rentfreudenhaus  

Nicht im Browser: API-Keys, manuelles „als bezahlt markieren“ ohne Webhook.

Alternative: Adyen (näher an Oppwa) — mehr Setup, sinnvoll bei sehr hohem Volumen.

## Conversion (Frontend)

- Trust-Strip (Online-Rabatt, Vortag, Kinder gratis)
- Modell **optional** mit Fotos; erneutes Tippen / „Modell entfernen“ = abwählen
- Produkt-Button: Hinzufügen ↔ Entfernen
- Warenkorb-Summe vor Kontaktdaten sichtbar

## API-Vertrag

Unverändert die Buchungs-API: `docs/booking-api.md` — die eigene Software implementiert dieselben Endpoints.
