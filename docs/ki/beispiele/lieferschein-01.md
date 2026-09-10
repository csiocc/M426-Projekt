# Beispiel-Lieferschein 01

Fiktiver Lieferschein zum Testen des Prompts. Für einen echten API-Test aus
diesem Text ein PDF/Bild erzeugen (z. B. drucken → PDF, oder Screenshot) und
laufen lassen:

```bash
bin/rails 'ki:extract[docs/ki/beispiele/lieferschein-01.pdf]'
```

Das erwartete Ergebnis steht in
[`lieferschein-01.erwartet.json`](lieferschein-01.erwartet.json).

---

```
Stahlhandel Widmer GmbH                      LIEFERSCHEIN
Gewerbestrasse 12
5430 Wettingen                               Lieferschein-Nr.:  LS-2026-0042
Tel. 056 111 22 33                           Datum:             08.09.2026
                                             Ihre Bestellung:   B-9987
                                             Kunden-Nr.:        K-1024

Rechnungsadresse:                            Lieferadresse:
Muster AG                                    Muster AG / Baustelle Nord
Bahnhofstrasse 1                             Industrieweg 5
8001 Zürich                                  8600 Dübendorf

Lieferdatum: 10.09.2026

Pos  Artikel-Nr  Bezeichnung                 Menge   Einheit
1    A-100       Schrauben 4x30              250     Stk
2    A-205       Dübel S8                    250     Stk
3    A-330       Baustahlmatte K257          12      Stk
4                Palette (Leergut)           1       Palette

Bemerkung: Anlieferung nur vormittags möglich.
```
