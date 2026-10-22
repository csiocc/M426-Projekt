# Lieferscheine

Lieferschein als Bild oder PDF hochladen, von der OpenAI-API auslesen lassen
und die erkannten Daten im Browser prüfen und korrigieren.

Rails-API mit SQLite im Projektordner, Angular-Frontend unter `frontend/`.
Projektarbeit im Modul 426 (Scrum-Experiment), Backlog im
[Jira-Board LA](https://m426lieferscheine.atlassian.net/jira/software/projects/LA/boards/34/backlog).

## Voraussetzungen

| Was | Version | Woher |
| --- | --- | --- |
| Ruby | 3.4.4 | `.ruby-version` |
| Node | 24, mindestens 24.15 | `frontend/.nvmrc`, die Angular CLI lehnt ältere 24er ab |
| mise oder asdf | optional | `.tool-versions` pinnt Ruby und Node, dann stimmen die Versionen automatisch |
| libvips | aktuell | für Active Storage (`apt install libvips`, `brew install vips`) |
| OpenAI-API-Key | | wird nur für die echte Erkennung gebraucht, nicht für Tests |

## Einrichten und starten

```bash
bin/start                 # Rails und Angular im Hintergrund
bin/stop                  # beides wieder beenden
```

`bin/start` installiert fehlende Gems und npm-Pakete, legt die Datenbank an
und startet beide Server über foreman. Ausgabe landet in `log/dev.log`,
Rails läuft auf http://localhost:3000, die App auf http://localhost:4200.

Wer die Ausgabe lieber im Terminal sieht, nimmt `bin/dev` (Vordergrund,
Ctrl+C beendet beides). Die Prozesse stehen in `Procfile.dev`.

Für die echte Erkennung braucht Rails den OpenAI-API-Key. Dazu im
Projektordner eine Datei `.env` anlegen:

```
OPENAI_API_KEY=sk-...
```

Sie ist in `.gitignore` und gehört nie ins Repository. Wichtig: `.env` liest
nur foreman, also `bin/start` und `bin/dev`. Wer `bin/rails server` oder den
Rake-Task direkt startet, muss den Key in der Shell setzen, etwa mit
`export OPENAI_API_KEY=...`. Alternativ geht der Key in die Rails-Credentials
unter `openai.api_key`.

## Tests und Checks

```bash
bin/rails test            # Rails-Tests, kein echter API-Aufruf
bin/rubocop               # Ruby-Stil
bin/brakeman --no-pager   # Sicherheits-Scan
bin/bundler-audit         # bekannte Lücken in Gems
bin/ci                    # alles zusammen

cd frontend
npm test -- --no-watch    # Angular-Tests (Vitest)
npx prettier --check .    # Formatierung
```

Dieselben Schritte laufen in der GitHub-CI bei jedem Pull Request.

## KI-Erkennung von Hand testen

```bash
bin/rails 'ki:extract[pfad/zum/lieferschein.pdf]'
```

Schickt die Datei an OpenAI und gibt das JSON aus. Braucht den API-Key in der
Shell. Modell und Limits lassen sich über `OPENAI_MODEL`,
`OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_OPEN_TIMEOUT` und `OPENAI_READ_TIMEOUT`
übersteuern.

## API

| Methode und Pfad | Zweck |
| --- | --- |
| `POST /api/delivery_notes` | Datei im Feld `file` hochladen (PNG, JPG, WebP, GIF, PDF, max. 20 MB). Antwort `{"id": 7}`, Status 201. Begrenzt auf 10 Uploads pro 15 Minuten und IP, darüber Status 429. |
| `GET /api/delivery_notes/:id` | `{"id": 7, "result": null}` solange die Erkennung läuft, danach das JSON. Bei einem Fehler `{"result": {"fehler": "..."}}`. |
| `GET /up` | Health-Check |

Die Erkennung läuft in einem ActiveJob. Ohne eigenen Queue-Adapter hält der
Async-Adapter die Jobs nur im Speicher; ein Neustart während der Erkennung
lässt `result` auf `null`.

## Weitere Doku

- [docs/ki/](docs/ki/README.md): Prompt, JSON-Format, Ablauf Upload bis Frontend
- [KI-Doku.md](KI-Doku.md): KI-Nutzungsnachweis für das Modul
- [portfolio.md](portfolio.md): Scrum-Portfolio
