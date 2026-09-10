# KI / Daten / JSON

Auslesen von Lieferscheinen (Bild/PDF) mit der OpenAI-API und Rückgabe als
strukturiertes JSON.

## Inhalt

| Datei | Zweck |
|-------|-------|
| [`prompt.md`](prompt.md) | Prompt-Design + Begründung der Regeln |
| [`json-format.md`](json-format.md) | Feld-für-Feld-Definition des JSON-Ergebnisses |
| [`beispiele/`](beispiele/) | Beispiel-Lieferschein + erwartetes JSON zum Testen |
| [`../../app/services/lieferschein_extractor.rb`](../../app/services/lieferschein_extractor.rb) | Service: API-Aufruf + JSON Schema (Structured Outputs) |
| [`../../lib/tasks/ki.rake`](../../lib/tasks/ki.rake) | CLI-Task zum Testen mit einer echten Datei |
| [`../../test/services/lieferschein_extractor_test.rb`](../../test/services/lieferschein_extractor_test.rb) | Unit-Tests (ohne echten API-Aufruf) |

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
