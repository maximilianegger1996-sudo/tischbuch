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

## Hinweis Backend

Das bestehende Rent-Buddy-Backend bleibt bis zum Cutover die Datenquelle. Zugangsdaten gehören **nicht** ins Repo.
