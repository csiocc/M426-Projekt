# KI-Nutzung im Projekt Lieferscheine

Dieses Dokument hält fest, wie wir im Scrum-Experiment KI als Hilfsmittel einsetzen, und führt den KI-Nutzungsnachweis nach der Vorlage der TBZ. Grundlage sind die beiden Modul-Dokumente [KI-Unterstützung](https://gitlab.com/ch-tbz-it/Stud/m426/-/blob/main/Ressourcen/Scrum_Experiment/KI_Unterstuetzung.md) und [KI-Nutzungsnachweis](https://gitlab.com/ch-tbz-it/Stud/m426/-/blob/main/Ressourcen/Scrum_Experiment/KI_Nutzungsnachweis.md). Backlog und Sprints führen wir im [Jira-Board LA](https://m426lieferscheine.atlassian.net/jira/software/projects/LA/boards/34/backlog).

Stand: Tag 5, 17.09.2026.

## Was wir als Team selbst machen

Produkt, Planung und Qualitätssicherung liegen bei uns. Konkret:

- Product Vision, Zielgruppe und das Vision Board in Miro hat das Team erarbeitet, ebenso die elf User Stories und ihre Priorisierung nach MoSCoW.
- Die Rollen sind verteilt: Semin Banovi ist Product Owner, Dzanis Tojaga Scrum Master. Christian, Melvin und Andy entwickeln Backend, Frontend und KI-Anbindung.
- Aus dem Backlog schreiben wir die Issues selbst, etwa #10 für die API-Endpunkte und #18 für die Verknüpfung von Upload, KI-Service und Resultat.
- Die Architektur haben wir festgelegt: Rails-API mit SQLite, Angular-Frontend über den Dev-Proxy, OpenAI zum Auslesen der Lieferscheine, das Resultat als ein JSON-Feld im Modell.
- Jeder Pull Request wird von einem anderen Teammitglied reviewt. Die Kommentare posten wir selbst, und wer den PR erstellt hat, arbeitet sie ein. Bei PR #11 kamen sechs Kommentare, bei PR #21 sieben.
- Wir testen manuell mit echten Lieferscheinen und entscheiden, wann gemergt wird.
- Die Definition of Done haben wir am 17.09. selbst formuliert: Akzeptanzkriterien erfüllt, Unit- und Integrationstests vorhanden, Codequalität stimmt, Code reviewt, Doku vorhanden.

## Wofür wir KI als Hilfe nutzen

Wir nutzen KI, um schneller und gründlicher zu arbeiten. Die Richtung geben wir vor, das Ergebnis prüfen wir.

Als Review-Hilfe: Bevor wir einen Pull Request kommentieren, lassen wir ihn zusätzlich vom Assistenten durchsehen. Aus seinen Befunden wählen wir aus, was wir selbst vertreten, kürzen es und posten es in eigenen Worten. Bei PR #21 haben wir von elf Vorschlägen vier verworfen.

Zur Erklärung: Fragen zu Rails, Angular oder zu Fehlermeldungen klären wir im Dialog mit dem Assistenten. Das ersetzt die Suche in Foren und Dokumentation, nicht das eigene Verständnis.

Als Sparringspartner: Bei Architekturfragen lassen wir uns Optionen mit Vor- und Nachteilen zeigen, zum Beispiel Dev-Proxy oder CORS-Gem, und entscheiden dann selbst.

Für klar umrissene Umsetzungsaufgaben: Wenn wir eine Aufgabe geplant und die Vorgaben festgelegt haben, lassen wir den Assistenten auch Code und Tests dazu schreiben. Beispiele sind das Rails-Grundgerüst, der KI-Service und der Job zu Issue #18. Diese Änderungen lesen wir durch, testen sie und lassen sie wie jeden anderen Code von einem Teammitglied reviewen.

Nicht zu verwechseln damit ist die OpenAI-API im Produkt selbst. Sie liest die Lieferscheine aus und ist Teil der Anwendung, dokumentiert unter `docs/ki/`.

## Werkzeuge

Wir verwenden Claude Code von Anthropic in VS Code und im Terminal. Der Assistent liest das Repository und kann die Tests laufen lassen. Eine lokale Memory-Richtlinie legt fest, was er über Sitzungen hinweg behält: unsere Entscheide mit Begründung und unsere Konventionen, keine Geheimnisse und keine Kundendaten.

GitHub Copilot lief am Anfang mit. Der Copilot-Agent hat am 03.09. zwei fehlschlagende CI-Jobs analysiert und Fixes vorgeschlagen, die wir geprüft und gemergt haben. Der automatische Copilot-Review hat PR #7 und PR #9 kommentiert.

## Ablauf

1. Der Product Owner priorisiert das Backlog in Jira. Daraus entsteht ein Issue und ein Branch, zum Beispiel `04-ki-verknuepfung`.
2. Wer die Story übernimmt, plant die Umsetzung und legt die Vorgaben fest. KI hilft dabei als Erklärhilfe oder für klar umrissene Teilaufgaben.
3. Ein anderes Teammitglied reviewt den Pull Request und nutzt dafür bei Bedarf den Assistenten als zweites Paar Augen.
4. Die Review-Kommentare arbeitet die Person ein, die den PR erstellt hat. Die CI prüft mit Brakeman, bundler-audit, importmap audit, RuboCop, den Rails-Tests und seit dem 17.09. auch mit Build und Tests des Frontends.
5. Gemergt wird erst, wenn die Definition of Done erfüllt ist.
6. Wo KI beteiligt war, tragen wir es hier ein. Einige Commits tragen zusätzlich einen `Co-Authored-By`-Vermerk.

## KI-Reviewpunkte

Von den mindestens zwei verbindlichen Reviewpunkten ist einer abgedeckt: „Code oder Architektur reviewen lassen", mit dem Architektur-Entscheid zur Frontend-Anbindung am 10.09. und den Code-Reviews von PR #11 und PR #21. Den zweiten Reviewpunkt aus einer anderen Zeile der TBZ-Liste legt das Team noch fest, naheliegend sind Reflexionsfragen für die Retrospective.

## KI-Nutzungsnachweis

Die Einträge stammen aus den Claude-Code-Sitzungen, aus den Pull Requests auf GitHub und aus den Commit-Nachrichten. Bei Andy und Melvin sind die Ergebnisse über ihre Commits belegt. Die genauen Prompts und ihre eigenen Entscheide ergänzen sie selbst, diese Felder sind mit „ergänzt Andy" oder „ergänzt Melvin" markiert.

### Tag 3, 03.09.2026

| Sprint/Datum | Wofür wurde KI genutzt? | Prompt oder Kurzbeschreibung | Ergebnis der KI | Was haben wir übernommen? | Was haben wir verworfen? | Eigene Entscheidung |
|---|---|---|---|---|---|---|
| 03.09., Christian | Grundgerüst, Landingpage und Modell `DeliveryNote` | Rails-Projekt mit HAML und SQL-Datenbank aufsetzen | Rückfragen zu Datenbank, CSS und Gems, danach Grundgerüst | Grundgerüst erstellt -> rails projekt scaffolded |   | SQLite und Tailwind, bewusst minimal für das MVP |
| 03.09., Copilot | CI-Fehler und automatischer Review | Fehlschlagende Jobs `test` und `scan_js`, Review von PR #7 und PR #9 | Zwei CI-Fixes (fehlendes `db/schema.rb`, fehlendes `libvips`) und Hinweise unter anderem zu SVG über `image/*` | CI-Fixes nach Prüfung gemergt, SVG-Hinweis am 10.09. mit einer festen Liste von Dateitypen gelöst | Bisher nicht umgesetzt: Fokus-Stile, Tippfehler, offener Datei-Handle im Test, Migrationsversion | |

### Tag 4, 10.09.2026

| Sprint/Datum | Wofür wurde KI genutzt? | Prompt oder Kurzbeschreibung | Ergebnis der KI | Was haben wir übernommen? | Was haben wir verworfen? | Eigene Entscheidung |
|---|---|---|---|---|---|---|
| 10.09., Andy | KI-Service `LieferscheinExtractor` (PR #11) | Die vier Board-Aufgaben als Auftrag übergeben: Prompt für die KI-Erkennung erstellen, Beispiel-Lieferschein testen, erkannte Daten strukturieren, JSON-Format definieren | Service, der die OpenAI Responses-API aufruft und die Antwortstruktur per Structured Outputs (strict JSON-Schema) erzwingt, für Bild und PDF. Dazu Doku zum JSON-Format, Prompt mit Begründung der Regeln, ein Beispiel-Lieferschein mit erwartetem JSON, der Rake-Task `ki:extract` für Tests mit echter Datei und Unit-Tests ohne echten API-Aufruf | Alles in PR #11, danach zwei RuboCop-Fixes nachgezogen | Automatisches Erstellen und Pushen des Pull Requests durch den Assistenten – das macht das Team selbst über GitHub | API-Key, der versehentlich im Chat gelandet war, sofort widerrufen; Rails-Credentials als Hauptweg für den echten Key dokumentiert, Umgebungsvariable als Alternative. Der PR ging anschliessend ins Review durch Christian |
| 10.09., Christian | Frontend-Anbindung und API-Endpunkte | Dev-Proxy oder CORS? Danach POST für den Upload und GET für das Resultat, testgetrieben | Empfehlung Dev-Proxy, Controller mit Integrationstests | Proxy-Ansatz, beide Endpunkte (PR #12) | rack-cors jetzt einbauen | PNG, JPG und PDF als Formate, Validierung bleibt im Modell |
| 10.09., Christian | Zweite Meinung beim Review von PR #11 | PR reviewen | Fünf Punkte vor dem Merge, unter anderem Netzwerkfehler, abgeschnittene Antworten und zu weite Dateitypen | Vier Punkte, gekürzt und selbst formuliert, als Kommentare im PR | Die langen Originalformulierungen | Dateitypen im Modell selbst eingeschränkt. Am 16.09. zwei weitere eigene Kommentare zu Timeouts und zur Auslagerung von Prompt und Schema |
| 10.09., Melvin | Umbau des Frontends auf Components, Services und Models | ergänzt Melvin | | | | |

### Tag 5, 17.09.2026

| Sprint/Datum | Wofür wurde KI genutzt? | Prompt oder Kurzbeschreibung | Ergebnis der KI | Was haben wir übernommen? | Was haben wir verworfen? | Eigene Entscheidung |
|---|---|---|---|---|---|---|
| 17.09., Andy | Die sechs Review-Kommentare zu PR #11 einarbeiten | Die sechs Inline-Kommentare von Christian aus PR #11 im Wortlaut eingefügt und um Umsetzung gebeten | Netzwerkfehler (Timeout, DNS, TLS, Verbindungsabbruch) werden als eigener Fehler gemeldet. Abgeschnittene Antworten nennen den echten Grund statt „kein gültiges JSON". Fehlender Anhang wird abgefangen, das zu breite `rescue` ist eingegrenzt, Token-Limit und Timeouts sind per Umgebungsvariable einstellbar, Prompt und Schema liegen in eigenen Dateien. Neue Tests für die Fehlerpfade | Alle sechs Punkte, Doku unter `docs/ki/` angepasst | Ein pauschales `rescue StandardError` als Lösung verworfen, stattdessen eine feste Liste konkreter Netzwerk-Exception-Klassen | Fehlerklassen bewusst eng gefasst statt breit gerescued, damit unerwartete Fehler weiter sichtbar bleiben; Token-Limit und Timeouts per ENV statt fest im Code, weil sich die passenden Werte erst im Test zeigen |
| 17.09., Christian | Prüfen, ob Andys Fix die Review-Punkte abdeckt | Commit `17ee37d` gegen die sechs Kommentare prüfen, dazu eine Frage zu den `require`-Zeilen | Alle sechs umgesetzt, aber die Testsuite startet nicht, weil Minitest 6 `minitest/mock` nicht mehr enthält | Blocker als eigener Kommentar an Andy | | Merge erlaubt, sobald die Tests laufen |
| 17.09., Andy | Testsuite wieder lauffähig machen | CI-Fehlerlog eingefügt (`LoadError: cannot load such file -- minitest/mock`) und um einen Fix gebeten | Der HTTP-Aufruf liegt in einer eigenen Methode, der Test ersetzt nur diese Methode auf einer einzelnen Instanz. Kein globales Stubbing, keine zusätzliche Abhängigkeit | Umbau von Service und Test, PR #11 danach gemergt | Das Gem `minitest-mock`, das im Review-Kommentar vorgeschlagen war | Kein zusätzliches Mocking-Gem eingeführt, sondern den Request in eine austauschbare, pro Testinstanz überschreibbare Methode ausgelagert |
| 17.09., Christian | Issue #18: Upload, KI-Service und Resultat verknüpfen | Nach dem Upload den KI-Service aufrufen und das Resultat speichern | Job mit Tests, PR #20 | Job und Tests nach Review gemergt | | Kein neues Gem für die Job-Queue, Punkt im PR zur Diskussion gestellt |
| 17.09., Christian | Zweite Meinung beim Review von PR #21 | PR reviewen | Drei blockierende Befunde und elf Kommentarvorschläge, Hinweis, dass Rails die `.env` nicht selbst liest | Sieben Kommentare, etwa zum doppelten Upload, zum Polling und zu `strict` im TypeScript | Vier Vorschläge zu Lizenz-Eintrag, Service-Klasse, Proxy-Kommentar und README, dazu `dotenv-rails` für eine einzige Variable | Testlauf mit echtem Lieferschein selbst durchgeführt. Melvin hat die Punkte eingearbeitet, danach freigegeben und gemergt |
| 17.09., Melvin | Review-Punkte aus PR #21 einarbeiten | ergänzt Melvin | | | | |

Für Tag 1 und Tag 2 wurde keine KI verwendet.

## Reflexion

Die Tabellen beantworten die Fragen der TBZ laufend pro Eintrag. Die Zusammenfassung schreiben wir selbst an Tag 09/10:

- Wo hat KI geholfen?
- Wo war KI ungenau, falsch oder nicht passend?
- Welche Vorschläge haben wir bewusst nicht übernommen?
- Welche Entscheidung haben wir selbst getroffen?
- Was wurde nach KI-Feedback verbessert?
