WEISUNG ZUR DATENWEITERGABE — AUSGEFÜLLTER ENTWURF
(noch nicht unterschrieben — bitte prüfen und unterzeichnen)

Datum Entwurf: 2026-11-15
Vorlage: Wintersteiger Sports GmbH, aktualisiert 27.01.2026

═══════════════════════════════════════════════════════════════
1. AUFTRAGGEBER
═══════════════════════════════════════════════════════════════
Firma:           FREUDENHAUS Rent / Luerzer (Skiverleih Obertauern)
Adresse:         Ringstraße 74, 5562 Obertauern, Österreich
Kontaktperson:   Maximilian Egger
E-Mail:          maxi@luerzer.at  (alternativ: skirent@luerzer.at)
Ort, Datum:      Obertauern, ____________________

═══════════════════════════════════════════════════════════════
2. AUFTRAGSVERARBEITER
═══════════════════════════════════════════════════════════════
Wintersteiger Sports GmbH
Wintersteigerstrasse 1
A-4910 Ried im Innkreis

═══════════════════════════════════════════════════════════════
3. EXTERNER EMPFÄNGER / DIENSTLEISTER
═══════════════════════════════════════════════════════════════
Variante A — Online-Buchungsstrecke (aktuelles Projekt):
Firma:           Betreiber von Rentfreudenhaus
                 (Skiverleih-Buchungsstrecke / Nachfolger Rent Buddy online)
Adresse:         [bitte eintragen — Hosting/Agentur]
Kontaktperson:   Maximilian Egger / technischer Ansprechpartner
Zweck:           Online-Reservierung von Verleihartikeln inkl. Preis-
                 und Verfügbarkeitsabfrage sowie Reservierungsanlage
                 über EasyRest API

Variante B — Newsletter (ursprüngliche Anfrage 28.08.2026):
Firma:           Klaviyo, Inc. (Newsletter-/CRM-Tool)
Zweck:           Marketing-Newsletter auf Basis von Kundenstammdaten
                 (nur Leserecht, keine Schreibrechte)

→ Bitte ankreuzen, welche Variante(n) gelten, oder beide getrennt
  als eigene Weisung ausstellen.

═══════════════════════════════════════════════════════════════
4. BETROFFENE DATENKATEGORIEN
═══════════════════════════════════════════════════════════════
[x] Kundenstammdaten          (für Buchung + optional Newsletter)
[x] Artikelstammdaten         (Verleihgruppen, Modelle, Größen)
[x] Umsatz- und Transaktionsdaten  (nur soweit für Reservierung/
                                   Preise nötig — sonst streichen)
[x] Rechnungsdaten            (nur wenn Newsletter/Klaviyo Umsatz
                               braucht — sonst streichen)
[ ] Sonstiges: Filial-/Hotelstammdaten, Verfügbarkeiten, Reservierungen

Empfehlung Buchungs-API:
  Kundenstammdaten (bei Buchungsanlage), Artikelstammdaten,
  Verfügbarkeiten, Reservierungsdaten — KEINE vollen Rechnungs-/
  Z-Bon-Exporte nötig.

Empfehlung Klaviyo (laut Mail Maxi):
  Kunden-, Rechnungs- und Hoteldaten — nur LESEN.

═══════════════════════════════════════════════════════════════
5. ZWECK DER DATENWEITERGABE
═══════════════════════════════════════════════════════════════
Ermöglichung der Online-Kundenbuchungsstrecke Rentfreudenhaus
über die Wintersteiger EasyRest-Schnittstelle (Filialen, reservierbare
Artikel, Verfügbarkeit, Preisberechnung, Reservierungsanlage) sowie
optional Synchronisation von Kundenstammdaten an das Newsletter-
System Klaviyo.

═══════════════════════════════════════════════════════════════
6. ART DES ZUGRIFFS
═══════════════════════════════════════════════════════════════
[x] Lesezugriff
[ ] Vollzugriff
[ ] Export
[x] API-Zugriff
[ ] Einmaliger Zugriff
[x] Dauerhafter Zugriff bis Widerruf

Hinweis: Access-ID bereits erhalten (Mail Thomas Scharnböck,
01.09.2026). Produktiv nur über HTTPS :11133; Access-ID nicht
im Frontend speichern.

═══════════════════════════════════════════════════════════════
7. ZEITRAUM
═══════════════════════════════════════════════════════════════
Von: 2026-09-01 (bzw. Unterzeichnungsdatum)
Bis: ____________________
[x] Bis auf Widerruf

═══════════════════════════════════════════════════════════════
8. RECHTLICHE VERANTWORTUNG
═══════════════════════════════════════════════════════════════
(Standardtext Wintersteiger — Auftraggeber trägt DSGVO-Verantwortung)

═══════════════════════════════════════════════════════════════
9. BESTÄTIGUNG UND UNTERSCHRIFT
═══════════════════════════════════════════════════════════════
Name:      Maximilian Egger
Funktion:  [Geschäftsführung / IT / Verleih — bitte eintragen]
Ort, Datum: Obertauern, ____________________
Unterschrift: ____________________

NÄCHSTE SCHRITTE
1) Entwurf prüfen, Empfänger (Agentur/Hosting vs. Klaviyo) finalisieren
2) Auf Original-PDF unterschreiben oder digital signieren
3) An easyrent@wintersteiger.com / Thomas Scharnböck senden
4) Bestätigung der Freigaben (API-Rechte, IP-Allowlist, Zertifikat) einholen
