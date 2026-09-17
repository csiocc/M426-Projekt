# KI / Daten / JSON

Auslesen von Lieferscheinen (Bild/PDF) mit der OpenAI-API und Rückgabe als
strukturiertes JSON.

## Inhalt

| Datei | Zweck |
|-------|-------|
| [`prompt.md`](prompt.md) | Prompt-Design + Begründung der Regeln |
| [`json-format.md`](json-format.md) | Feld-für-Feld-Definition des JSON-Ergebnisses |
| [`beispiele/`](beispiele/) | Beispiel-Lieferschein + erwartetes JSON zum Testen |
| [`../../app/services/lieferschein_extractor.rb`](../../app/services/lieferschein_extractor.rb) | Service: API-Aufruf, Fehlerbehandlung, Structured Outputs |
| [`../../app/services/lieferschein_extractor/prompt.rb`](../../app/services/lieferschein_extractor/prompt.rb) | Prompt-Texte (ausgelagert, siehe [`prompt.md`](prompt.md)) |
| [`../../app/services/lieferschein_extractor/schema.rb`](../../app/services/lieferschein_extractor/schema.rb) | JSON Schema (ausgelagert, siehe [`json-format.md`](json-format.md)) |
| [`../../lib/tasks/ki.rake`](../../lib/tasks/ki.rake) | CLI-Task zum Testen mit einer echten Datei |
| [`../../test/services/lieferschein_extractor_test.rb`](../../test/services/lieferschein_extractor_test.rb) | Unit-Tests (ohne echten API-Aufruf) |
| [`../../app/jobs/extract_delivery_note_job.rb`](../../app/jobs/extract_delivery_note_job.rb) | Verbindet Upload und Service, schreibt das Ergebnis in die DB |

## Ablauf Upload -> KI -> Frontend

1. `POST /api/delivery_notes` speichert die Datei und antwortet sofort mit
   `{"id": 7}` (201). Der API-Aufruf dauert mehrere Sekunden, darum läuft er
   nicht im Request.
2. `ExtractDeliveryNoteJob` ruft `LieferscheinExtractor.from_attachment` auf
   und schreibt das Resultat nach `delivery_notes.result`.
3. Das Frontend pollt `GET /api/delivery_notes/7`:
   - `{"id": 7, "result": null}` -> noch am Arbeiten, weiter pollen
   - `{"id": 7, "result": {"kunde": ...}}` -> fertig, siehe [`json-format.md`](json-format.md)
   - `{"id": 7, "result": {"fehler": "OpenAI-API HTTP 401"}}` -> fehlgeschlagen,
     Meldung anzeigen und aufhören zu pollen

Ohne `OPENAI_API_KEY` landet entsprechend eine `fehler`-Meldung im Resultat.

## API-Key einrichten

Der Key darf **nie** in Git landen. Zwei Möglichkeiten:

**a) Umgebungsvariable** (einfach für die Entwicklung)

```bash
# PowerShell (nur aktuelle Session)
$env:OPENAI_API_KEY = "sk-..."
```

Für eine dauerhafte `.env`-Datei (bereits in `.gitignore`) zusätzlich das Gem
`dotenv-rails` aufnehmen – ohne dieses Gem lädt Rails `.env` nicht.

**b) Rails-Credentials** (empfohlen, funktioniert ohne Zusatz-Gem)

```bash
bin/rails credentials:edit
```

```yml
openai:
  api_key: sk-...
```

## Testen

Ohne API (Unit-Tests, immer):

```bash
bin/rails test test/services/lieferschein_extractor_test.rb
```

Mit echter API und einer Datei:

```bash
bin/rails 'ki:extract[pfad/zum/lieferschein.pdf]'
```

## Fehlerbehandlung

Alle Fehler, die `LieferscheinExtractor` selbst auslöst, sind
`LieferscheinExtractor::Error`-Subklassen – das deckt auch Netzwerkfehler
(Timeout, DNS, TLS), abgebrochene Antworten (Token-Limit) und fehlende
Anhänge ab. Aufrufende Stellen (z. B. der Rake-Task) müssen also nur diese
eine Klasse abfangen:

| Klasse | Wann |
|---|---|
| `ConfigurationError` | kein API-Key konfiguriert |
| `UnsupportedTypeError` | Datei ist weder Bild noch PDF |
| `AttachmentError` | kein Anhang vorhanden / Datei fehlt im Storage |
| `ApiError` | alles Weitere: HTTP-Fehler, Netzwerkfehler, abgebrochene/leere/kaputte Antwort, Ablehnung durch das Modell |

`MAX_OUTPUT_TOKENS`, `OPEN_TIMEOUT` und `READ_TIMEOUT` sind per ENV
(`OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_OPEN_TIMEOUT`, `OPENAI_READ_TIMEOUT`)
überschreibbar, falls sie sich bei grösseren/mehrseitigen Lieferscheinen als
zu knapp erweisen.

## Verwendung im Code

```ruby
# aus einem ActiveStorage-Anhang (z. B. DeliveryNote#file)
daten = LieferscheinExtractor.from_attachment(delivery_note.file)
delivery_note.update!(result: daten)

# oder direkt aus einer Datei
daten = LieferscheinExtractor.call(
  io:           File.open("lieferschein.png", "rb"),
  content_type: "image/png"
)
```
