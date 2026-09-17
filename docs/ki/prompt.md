# Prompt für die Lieferschein-Erkennung

## Idee

Der Prompt besteht aus drei Teilen, die zusammen an die OpenAI **Responses-API**
(`/v1/responses`) geschickt werden:

1. **`instructions`** – der System-Prompt: Rolle + Regeln (siehe unten).
2. **`input`** – der Auftrag des Users: ein kurzer Text plus die Datei
   (`input_image` bei Bildern, `input_file` bei PDF, jeweils Base64).
3. **`text.format`** – das JSON Schema mit `strict: true`. Dadurch ist die
   Struktur der Antwort garantiert; der Prompt muss das Format nicht mehr
   beschreiben und kann sich auf die *Inhalte* konzentrieren.

Modell: `gpt-4o-2024-08-06` (Vision + Structured Outputs). Für günstige Tests
kann per Umgebungsvariable `OPENAI_MODEL=gpt-4o-mini` umgestellt werden.

Der Prompt liegt im Code als Konstante `LieferscheinExtractor::SYSTEM_PROMPT`
([`app/services/lieferschein_extractor.rb`](../../app/services/lieferschein_extractor.rb)).
Diese Datei ist die lesbare Fassung/Begründung.

## System-Prompt (`instructions`)

```text
Du bist ein Assistent, der Lieferscheine (Bilder oder PDF) ausliest und die
enthaltenen Daten strukturiert zurueckgibt.

Aufgabe:
- Lies den Lieferschein sorgfaeltig und extrahiere ausschliesslich
  Informationen, die tatsaechlich im Dokument sichtbar sind.
- Gib das Ergebnis exakt im vorgegebenen JSON-Schema zurueck.

Regeln:
1. Erfinde nichts. Fehlt eine Angabe oder ist sie unleserlich, setze den
   Wert auf null (bzw. eine leere Liste bei "positionen").
2. Lieferdatum: Wandle jedes Datum in das Format YYYY-MM-DD um. Erkenne
   schweizerische/deutsche Schreibweisen (z. B. 03.09.2026, 3. Sept. 2026).
   Ein reines Bestell-, Druck- oder Rechnungsdatum ist KEIN Lieferdatum
   -> dann lieferdatum = null.
3. Kunde = Empfaenger der Ware, nicht der Lieferant/Absender.
4. Weichen Rechnungs- und Lieferadresse ab, gehoert die Warenempfaenger-
   Adresse in "lieferadresse" und die Kundenadresse in "kunde.adresse".
   Gibt es nur eine Adresse, verwende sie fuer beide Felder.
5. Mengen: nur die Zahl (Punkt als Dezimaltrennzeichen). Die Einheit
   (z. B. "Stk", "kg", "m", "Palette") gehoert separat in "einheit".
6. "bezeichnung" ist die Artikelbezeichnung so, wie sie auf dem Lieferschein
   steht, ohne die Artikelnummer.
7. Werte unveraendert in der Sprache des Dokuments uebernehmen.
8. Trage in "warnungen" kurze Hinweise ein, wenn etwas unsicher/unleserlich
   war oder das Dokument offensichtlich kein Lieferschein ist.
```

## User-Auftrag (`input`)

```text
Hier ist der Lieferschein. Extrahiere die Daten gemaess Schema.
```

…gefolgt vom Datei-Part (Bild oder PDF).

## Warum diese Regeln?

| Regel | Problem, das sie löst |
|-------|-----------------------|
| „Erfinde nichts / null" | LLMs füllen Lücken sonst plausibel, aber falsch. |
| Datum → `YYYY-MM-DD` | Lieferscheine nutzen `TT.MM.JJJJ`, `3. Sept.` usw. – ohne Normierung nicht vergleichbar/speicherbar. |
| Bestelldatum ≠ Lieferdatum | Auf vielen Scheinen stehen mehrere Daten; ohne Hinweis nimmt das Modell irgendeines. |
| Kunde = Empfänger | Absender (Lieferant) steht meist oben/prominent – häufigste Verwechslung. |
| getrennte Liefer-/Kundenadresse | „Rechnung an" vs. „Lieferung an" muss sauber getrennt sein. |
| Menge als Zahl, Einheit separat | Sonst `"250 Stk"` als String → nicht rechenbar. |
| `warnungen` | Macht schlechte Scans/Fehlerkennungen im Test sichtbar, statt sie zu verstecken. |

## Bekannte Grenzen

- **Handschrift / schlechte Scans**: Erkennungsrate sinkt; solche Fälle sollten
  in `warnungen` auftauchen und im UI markiert werden.
- **Mehrseitige PDF**: werden von der Responses-API verarbeitet, aber lange
  Dokumente kosten mehr Tokens (`MAX_OUTPUT_TOKENS` ggf. anpassen).
- **Kein Lieferschein** (z. B. Rechnung, Foto): Modell füllt so viel wie möglich
  und setzt eine Warnung – die aufrufende Stelle muss das abfangen.
