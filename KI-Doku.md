# KI-Nutzung im Projekt Lieferscheine

Dieses Dokument hält fest, wie wir im Scrum-Experiment KI einsetzen, und führt den KI-Nutzungsnachweis nach der Vorlage der TBZ. Grundlage sind die beiden Modul-Dokumente [KI-Unterstützung](https://gitlab.com/ch-tbz-it/Stud/m426/-/blob/main/Ressourcen/Scrum_Experiment/KI_Unterstuetzung.md) und [KI-Nutzungsnachweis](https://gitlab.com/ch-tbz-it/Stud/m426/-/blob/main/Ressourcen/Scrum_Experiment/KI_Nutzungsnachweis.md). Backlog und Sprints führen wir im [Jira-Board LA](https://m426lieferscheine.atlassian.net/jira/software/projects/LA/boards/34/backlog).

Diesen Text hat Claude Code auf Anweisung des Teams entworfen. Inhalt und Freigabe liegen beim Team.

## Wofür wir KI einsetzen

Wir setzen KI als Assistenz ein. Code, Tests, Backlog und Entscheide stammen vom Team. Der Assistent kommt an drei Stellen zum Zug.

Beim Review: Bevor ein Pull Request entsteht, lassen wir den Diff prüfen, auf Fehler, Rails-Konventionen, Lesbarkeit und fehlende Testfälle. Die Hinweise gehen wir durch und übernehmen, was wir nachvollziehen können. Der Rest wird verworfen und hier festgehalten.

Bei Research und Erklärung: Fragen zu Rails, ActiveStorage oder zu Fehlermeldungen klären wir im Dialog mit dem Assistenten, der dazu den echten Code im Repository liest. Das ersetzt die Suche in Foren und Dokumentation, nicht das eigene Verständnis.

Als Sparringspartner bei Entscheiden: Bei Architektur- und Technologiefragen lassen wir uns Optionen mit Vor- und Nachteilen aufzeigen, zum Beispiel ob das Backend ein CORS-Gem braucht. Der Entscheid bleibt beim Team und wird mit den verworfenen Alternativen dokumentiert.

Für die Retrospective und die Prüfung der Akzeptanzkriterien ist derselbe Einsatz vorgesehen: Der Assistent stellt Fragen, wir leiten die Massnahmen ab.

## Werkzeug

Wir verwenden Claude Code von Anthropic, in VS Code und im Terminal. Der Assistent hat Zugriff auf das Repository, kann Diffs prüfen und auf Wunsch `bin/rails test` laufen lassen. Eine `claude.md` im Ordner Modul426 verweist auf das Jira-Board, damit der Bezug zu den Tickets klar ist. Eine lokale Memory-Richtlinie (`.claude/mem0.md`) legt fest, was er über Sitzungen hinweg behält: Entscheide mit Begründung und verworfenen Alternativen, Konventionen, Stolperfallen. Geheimnisse und Kundendaten gehören nicht dazu. Beides liegt nicht im Git-Repository, jede Person richtet es lokal ein.

Im Review drängt der Assistent auf die kleinste funktionierende Lösung: Rails-Bordmittel vor Zusatz-Gems, keine Abstraktionen auf Vorrat, zu jeder nicht trivialen Logik ein Test.

## Ablauf

1. Ein Backlog-Element aus Jira wird zum Branch, zum Beispiel `01-landingpage`, `02-ls-modell` oder `03-api-endpoints`.
2. Wir setzen die Story um und schreiben die Tests.
3. Offene Fragen während der Umsetzung klären wir mit dem Assistenten.
4. Vor dem Pull Request lassen wir den Diff reviewen und `bin/rails test` sowie `bin/rubocop` laufen. Was wir nicht selbst erklären können, kommt nicht in den PR.
5. Die CI prüft mit Brakeman, bundler-audit, importmap audit, RuboCop und den Tests. Dann wird gemergt.
6. Entscheide, bei denen der Assistent Alternativen aufgezeigt hat, landen mit Begründung im Nutzungsnachweis.

Commit-Messages tragen keinen KI-Vermerk. Wo KI beteiligt war, steht hier im Nutzungsnachweis.

## KI-Reviewpunkte

Von den mindestens zwei verbindlichen Reviewpunkten ist einer erledigt: das Architektur-Review zur Frontend-Anbindung am 10.09.2026 (siehe Nutzungsnachweis). Den zweiten legt das Team fest. Naheliegend sind die Akzeptanzkriterien an Tag 04/05 hinterfragen lassen oder Reflexionsfragen für die Retrospective.

## KI-Nutzungsnachweis

| Sprint/Datum | Wofür wurde KI genutzt? | Prompt oder Kurzbeschreibung | Ergebnis der KI | Was haben wir übernommen? | Was haben wir verworfen? | Eigene Entscheidung |
|---|---|---|---|---|---|---|
| Tag 4, 10.09.2026 | Sparring zur Architektur: Anbindung des Angular-Frontends an die Rails-API | Braucht das Backend rack-cors, damit das Angular-Frontend die API erreicht? | Empfehlung: Angular-Dev-Proxy (`proxy.conf.json`, `/api/**` auf `localhost:3000`) statt CORS-Gem; rack-cors erst, wenn das Frontend produktiv auf einer anderen Domain läuft | Proxy-Ansatz | rack-cors jetzt einbauen | Backend bleibt ohne CORS-Konfiguration; wird neu beurteilt, sobald das Deployment feststeht |
| Tag 4, 10.09.2026 | Review des API-Endpunkts `POST /api/delivery_notes` und seiner Tests | Controller und die vier Integrationstests (Bild, fehlende Datei, String statt Datei, Textdatei) prüfen und den Testlauf ausführen lassen | Endpunkt funktioniert, Tests grün (11 Tests, 25 Assertions) | | | Validierung bleibt im Modell `DeliveryNote`, der Controller prüft nur, ob ein Upload ankommt |

Die Einträge zu Tag 1 bis 3 fehlen noch: der Text zu Prototyping und XP, die Product Vision, die User Stories sowie Landingpage und Modell `DeliveryNote` vom 03.09.2026. Wir tragen sie aus den Notizen nach. Für Sprints ohne KI-Einsatz steht hier der Satz: In diesem Sprint wurde keine KI verwendet.

## Reflexion

Die Tabelle beantwortet die Fragen der TBZ laufend pro Eintrag. Die Zusammenfassung schreiben wir selbst an Tag 09/10:

- Wo hat KI geholfen?
- Wo war KI ungenau, falsch oder nicht passend?
- Welche Vorschläge haben wir bewusst nicht übernommen?
- Welche Entscheidung haben wir selbst getroffen?
- Was wurde nach KI-Feedback verbessert?
