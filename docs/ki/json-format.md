# JSON-Format der Lieferschein-Erkennung

Dieses Dokument legt fest, wie die von der KI ausgelesenen Daten aufgebaut sind.
Die maschinenlesbare Fassung (JSON Schema) steht in
[`app/services/lieferschein_extractor.rb`](../../app/services/lieferschein_extractor.rb)
in der Konstante `SCHEMA` und wird als *Structured Output* direkt an die
OpenAI-API übergeben – das Modell **kann** also gar kein anderes Format
zurückgeben.

Das Ergebnis wird 1:1 in der Spalte `delivery_notes.result` (JSON) gespeichert.

## Grundregeln

- Alle Felder sind **immer vorhanden**. Fehlt eine Angabe auf dem Lieferschein,
  steht der Wert auf `null` (bzw. `[]` bei `positionen` / `warnungen`).
- Datumswerte sind **ISO 8601** (`YYYY-MM-DD`).
- Mengen sind **Zahlen** (Punkt als Dezimaltrennzeichen), keine Strings.
- Texte werden unverändert in der Sprache des Dokuments übernommen.

## Struktur

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `kunde` | Objekt | Warenempfänger (nicht der Lieferant) |
| `kunde.name` | string \| null | Firma / Person |
| `kunde.kundennummer` | string \| null | Kundennummer laut Lieferschein |
| `kunde.adresse` | Adresse | Adresse des Kunden |
| `lieferadresse` | Adresse | Adresse, an die geliefert wird. Gibt es nur eine Adresse, ist sie identisch mit `kunde.adresse`. |
| `lieferdatum` | string \| null | Lieferdatum als `YYYY-MM-DD`. Bestell-/Rechnungsdatum zählt **nicht**. |
| `lieferschein_nummer` | string \| null | Nummer des Lieferscheins |
| `bestellnummer` | string \| null | Referenz auf Bestellung / Auftrag des Kunden |
| `positionen` | Array&lt;Position&gt; | Artikelzeilen in Dokument-Reihenfolge |
| `warnungen` | Array&lt;string&gt; | Hinweise der KI auf unsichere / unleserliche Stellen |

### Adresse

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `name` | string \| null | Firma / Person an dieser Adresse, falls abweichend |
| `strasse` | string \| null | Strasse und Hausnummer |
| `plz` | string \| null | Postleitzahl |
| `ort` | string \| null | Ort |
| `land` | string \| null | Land, falls angegeben (z. B. `CH`) |

### Position

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `position` | integer \| null | Positionsnummer laut Lieferschein |
| `artikelnummer` | string \| null | Artikel-/Materialnummer |
| `bezeichnung` | string | Artikelbezeichnung ohne Artikelnummer |
| `menge` | number \| null | Gelieferte Menge |
| `einheit` | string \| null | Einheit, z. B. `Stk`, `kg`, `m`, `Palette` |

## Beispiel

```json
{
  "kunde": {
    "name": "Muster AG",
    "kundennummer": "K-1024",
    "adresse": {
      "name": null,
      "strasse": "Bahnhofstrasse 1",
      "plz": "8001",
      "ort": "Zürich",
      "land": "CH"
    }
  },
  "lieferadresse": {
    "name": "Baustelle Nord",
    "strasse": "Industrieweg 5",
    "plz": "8600",
    "ort": "Dübendorf",
    "land": "CH"
  },
  "lieferdatum": "2026-09-10",
  "lieferschein_nummer": "LS-2026-0042",
  "bestellnummer": "B-9987",
  "positionen": [
    { "position": 1, "artikelnummer": "A-100", "bezeichnung": "Schrauben 4x30", "menge": 250, "einheit": "Stk" },
    { "position": 2, "artikelnummer": "A-205", "bezeichnung": "Dübel S8", "menge": 250, "einheit": "Stk" },
    { "position": 3, "artikelnummer": null, "bezeichnung": "Palette (Leergut)", "menge": 1, "einheit": "Palette" }
  ],
  "warnungen": []
}
```
