# Portfolio Scrum-Experiment

Das Portfolio ist der zentrale Ort, an dem ihr euren Scrum-Prozess, eure wichtigsten Artefakte, eure Erkenntnisse und eure KI-Nutzung dokumentiert.

Ihr könnt diese Vorlage als eigene Datei in eurem Projekt-Repository übernehmen, zum Beispiel als `portfolio.md`.

## 1. Team und Produkt

| Punkt          | Inhalt                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| Teamname       | SCRUM-Team 5                                                             |
| Teammitglieder | Dzanis Tojaga, Christian Siegrist, Melvin Jenni, Semin Banovi, Andy Hess |
| Product Owner  | Semin Banovi                                                             |
| Scrum Master   | Dzanis Tojaga                                                            |
| Produktname    | Lieferscheine Webapp                                                     |
| Zielgruppe     | Unternehmen, KMU, Firmen                                                 |

## 2. Product Vision

Unsere Lieferscheine Webapp soll Unternehmen dabei helfen, Lieferscheine schneller und mit weniger manueller Arbeit zu verarbeiten. Viele Daten aus Lieferscheinen müssen sonst von Hand abgetippt werden. Das kostet Zeit und kann zu Fehlern führen.

Die Zielgruppe sind Unternehmen, KMU und Firmen, die Lieferscheine digital weiterverarbeiten möchten.

Das Produkt löst das Problem, dass Informationen aus Lieferscheinen manuell erfasst werden müssen. Die Webapp soll einen Lieferschein hochladen, mit KI analysieren und die erkannten Daten strukturiert als JSON ausgeben.

Das erste realistische Produktinkrement ist ein klickbarer MVP. Dabei soll ein Lieferschein hochgeladen und erste Daten durch die KI erkannt werden.

Link oder Screenshot:
[Product Vision Board in Miro](https://miro.com/app/board/uXjVHtqin6U=/)

## 3. Product Backlog

### Wichtigstes Epic

Als Mitarbeiter möchte ich Lieferscheine mit KI analysieren und die erkannten Daten verwalten, damit Lieferinformationen zuverlässig als JSON weiterverwendet werden können.

### Wichtigste User Stories

| User Story                                  | Priorität   | Akzeptanzkriterien vorhanden? | Bemerkung                                                 |
| ------------------------------------------- | ----------- | ----------------------------- | --------------------------------------------------------- |
| Lieferschein hochladen                      | Must-have   | Ja                            | Grundlage, damit die Datei analysiert werden kann         |
| Kundendaten erkennen                        | Must-have   | Ja                            | Wichtige Daten müssen nicht manuell erfasst werden        |
| Artikel und Mengen erkennen                 | Must-have   | Ja                            | Zentrale Informationen aus dem Lieferschein               |
| Lieferdatum und Lieferadresse erkennen      | Must-have   | Ja                            | Macht die Lieferinformationen vollständiger               |
| JSON-Ausgabe erstellen                      | Must-have   | Ja                            | Ergebnis kann in anderen Systemen weiterverwendet werden  |
| KI möglichst fehlerfrei analysieren         | Should-have | Ja                            | Verbessert die Zuverlässigkeit der erkannten Daten        |
| Vorschau der erkannten Daten anzeigen       | Should-have | Ja                            | Fehler können vor dem Export erkannt werden               |
| Statusanzeige während Analyse anzeigen      | Should-have | Ja                            | Benutzer sieht, ob die Verarbeitung läuft oder fertig ist |
| Fehlermeldung bei ungültiger Datei anzeigen | Should-have | Ja                            | Benutzer erkennt, welche Dateien unterstützt werden       |
| Fehlerhafte Erkennungen bearbeiten          | Could-have  | Ja                            | Erkannte Daten können direkt korrigiert werden            |
| JSON-Datei herunterladen                    | Could-have  | Ja                            | JSON kann lokal gespeichert werden                        |

### Vollständige User Stories

1. Als Mitarbeiter möchte ich einen Lieferschein hochladen, damit die Datei analysiert werden kann.
2. Als Mitarbeiter möchte ich, dass die KI Kundendaten aus dem Lieferschein erkennt, damit diese nicht manuell erfasst werden müssen.
3. Als Mitarbeiter möchte ich, dass die KI Artikel und Mengen aus dem Lieferschein erkennt, damit die gelieferten Positionen automatisch ausgelesen werden.
4. Als Mitarbeiter möchte ich, dass Lieferdatum und Lieferadresse erkannt werden, damit die Lieferinformationen vollständig sind.
5. Als Mitarbeiter möchte ich die erkannten Daten als JSON erhalten, damit sie in anderen Systemen weiterverwendet werden können.
6. Als Mitarbeiter möchte ich, dass die KI Lieferscheine möglichst fehlerfrei analysiert, damit die ausgegebenen JSON-Daten zuverlässig sind.
7. Als Mitarbeiter möchte ich eine Vorschau der erkannten Daten sehen, damit ich Fehler vor dem Export korrigieren kann.
8. Als Mitarbeiter möchte ich eine Statusanzeige während der Analyse sehen, damit ich weiss, ob die Verarbeitung noch läuft oder abgeschlossen ist.
9. Als Mitarbeiter möchte ich eine Fehlermeldung erhalten, wenn die hochgeladene Datei kein gültiges Bild/PDF ist, damit ich weiss, welche Formate unterstützt werden.
10. Als Mitarbeiter möchte ich fehlerhafte Erkennungen direkt in der App bearbeiten können, damit ich das JSON nicht manuell nachbearbeiten muss.
11. Als Mitarbeiter möchte ich die JSON-Datei herunterladen können, damit ich sie lokal speichern kann.

### Priorisierungsmethode

Wir haben die MoSCoW-Methode verwendet. Diese Methode hilft uns zu unterscheiden, welche Funktionen für das MVP zwingend nötig sind und welche Funktionen später umgesetzt werden können.

### Wichtigste Scope-Entscheide

Für Sprint 1 konzentrieren wir uns auf die wichtigsten MVP-Funktionen: Upload, KI-Erkennung und eine erste strukturierte Ausgabe. Verbesserungen wie Vorschau, bessere Fehlerbehandlung und Download-Funktionen werden später eingeplant.

## 4. Sprint-Dokumentation

## 4. Sprint-Dokumentation

### Sprint 1

### Sprint 1

| Punkt                               | Inhalt                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Sprintziel                          | Ein erstes klickbares MVP erstellen, bei dem ein Lieferschein hochgeladen und erste Daten durch die KI erkannt werden können. |
| ausgewählte User Stories            | Upload, Kundendaten, Artikel/Mengen, Lieferdatum/Lieferadresse                                                                |
| Review-Ergebnis                     | Noch offen                                                                                                                    |
| Retro-Erkenntnis                    | Noch offen                                                                                                                    |
| Verbesserungsmassnahme für Sprint 2 | Noch offen                                                                                                                    |

### Sprint 2

| Punkt                               | Inhalt                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sprintziel                          | Die Webapp verbessern, damit erkannte Daten als JSON ausgegeben, kontrolliert und Fehler verständlich angezeigt werden können. |
| ausgewählte User Stories            | JSON-Ausgabe, bessere KI-Analyse, Vorschau, Statusanzeige, Fehlermeldung                                                       |
| Review-Ergebnis                     | Noch offen                                                                                                                     |
| Retro-Erkenntnis                    | Noch offen                                                                                                                     |
| Verbesserungsmassnahme für Sprint 3 | Noch offen                                                                                                                     |

### Sprint 3

| Punkt                       | Inhalt                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- |
| Sprintziel                  | Zusatzfunktionen ergänzen und das Produkt für das Klassen-Review vorbereiten. |
| ausgewählte User Stories    | Fehlerhafte Erkennungen bearbeiten, JSON-Datei herunterladen                  |
| Review-Ergebnis             | Noch offen                                                                    |
| Retro-Erkenntnis            | Noch offen                                                                    |
| Vorbereitung Klassen-Review | Noch offen                                                                    |

## 5. Scrum-Erfahrungen

Beschreibt konkret:

- Welche Rolle war besonders anspruchsvoll?
- Welche Zeremonie war am hilfreichsten?
- Wo hat Scrum dem Team geholfen?
- Wo war Scrum schwierig?
- Wie hat sich das Backlog verändert?
- Welche Scope-Entscheide waren wichtig?

## 6. Persönliche Kurzreflexionen

Jedes Teammitglied ergänzt kurz:

| Name | Beitrag | wichtigste Erkenntnis | nächster Lernschritt |
| ---- | ------- | --------------------- | -------------------- |
|      |         |                       |                      |

## 7. KI-Nutzungsnachweis

Wenn ihr KI verwendet habt, dokumentiert die Nutzung hier oder verlinkt auf eine separate Datei.

| Sprint/Datum | Wofür wurde KI genutzt? | Prompt oder Kurzbeschreibung | Ergebnis der KI | Was wurde übernommen? | Was wurde verworfen? | eigene Entscheidung |
| ------------ | ----------------------- | ---------------------------- | --------------- | --------------------- | -------------------- | ------------------- |
|              |                         |                              |                 |                       |                      |                     |

Wenn ihr in einem Sprint keine KI verwendet habt:

```text
In diesem Sprint wurde keine KI verwendet.
```

## 8. Abschlussreflexion

Bereitet für das Klassen-Review vor:

- Was haben wir über agile Softwareentwicklung gelernt?
- Was würden wir im nächsten Scrum-Projekt anders machen?
- Welche Best Practice nehmen wir mit?
- Falls KI genutzt wurde: Wo hat KI geholfen und wo waren ihre Grenzen?
