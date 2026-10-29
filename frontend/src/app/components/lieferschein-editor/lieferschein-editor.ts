import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  Lieferschein,
  exportDateiname,
  exportJson,
  gruppiereHinweise,
  pruefeLieferschein,
} from '../../models/lieferschein';
import { dateiSpeichern } from '../../utils/datei-speichern';
import { HinweisBox } from '../hinweis-box/hinweis-box';
import { JsonEditor } from '../json-editor/json-editor';
import { LieferscheinFormular } from '../lieferschein-formular/lieferschein-formular';

type Ansicht = 'formular' | 'json';

const TABS: readonly { id: Ansicht; label: string }[] = [
  { id: 'formular', label: 'Formular' },
  { id: 'json', label: 'JSON' },
];

/**
 * Rechte Seite der Vorschau: erkannte Daten pruefen und korrigieren, wahlweise
 * im Formular oder als JSON. Beide Ansichten bearbeiten denselben Stand.
 */
@Component({
  selector: 'app-lieferschein-editor',
  imports: [ButtonModule, HinweisBox, JsonEditor, LieferscheinFormular],
  templateUrl: './lieferschein-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class LieferscheinEditor {
  /** Das Ergebnis der KI, unveraendert - Grundlage fuer "wiederherstellen". */
  readonly original = input.required<Lieferschein>();

  /** Der bearbeitete Stand; startet bei jedem neuen Original wieder von vorn. */
  protected readonly daten = linkedSignal(() => structuredClone(this.original()));
  protected readonly ansicht = signal<Ansicht>('formular');
  protected readonly tabs = TABS;

  protected readonly hinweise = computed(() => pruefeLieferschein(this.daten()));
  protected readonly hinweisGruppen = computed(() => gruppiereHinweise(this.hinweise()));
  protected readonly feldFehler = computed<ReadonlyMap<string, string>>(
    () => new Map(this.hinweise().map((hinweis) => [hinweis.feld, hinweis.text])),
  );
  /** Unsicherheiten, die die KI selbst gemeldet hat - getrennt von den Fehlern. */
  protected readonly kiHinweise = computed(() => this.daten().warnungen);
  protected readonly geaendert = computed(
    () => JSON.stringify(this.daten()) !== JSON.stringify(this.original()),
  );

  /**
   * true, solange im JSON-Tab ungueltiger Text steht. `daten` haelt dann noch
   * den letzten gueltigen Stand - ein Download wuerde die Eingabe still verlieren.
   */
  protected readonly jsonUngueltig = signal(false);

  protected wiederherstellen(): void {
    this.daten.set(structuredClone(this.original()));
    // Der JSON-Tab formatiert den Text dabei neu, ein Tippfehler ist damit weg.
    this.jsonUngueltig.set(false);
  }

  protected ansichtWechseln(ansicht: Ansicht): void {
    this.ansicht.set(ansicht);
    // Beim Verlassen verwirft der JSON-Tab den ungueltigen Entwurf.
    if (ansicht === 'formular') this.jsonUngueltig.set(false);
  }

  /** Speichert den aktuellen Stand, also inklusive aller Korrekturen, als .json-Datei. */
  protected herunterladen(): void {
    const daten = this.daten();
    dateiSpeichern(exportJson(daten), exportDateiname(daten), 'application/json');
  }

  /** Springt aus der Fehlerliste zum betroffenen Feld im Formular. */
  protected zumFeld(feld: string): void {
    const fokussieren = () => document.getElementById(`feld-${feld}`)?.focus();
    if (this.ansicht() === 'formular') {
      fokussieren();
      return;
    }
    // Aus dem JSON-Tab: das Feld existiert erst nach dem naechsten Rendern.
    this.ansichtWechseln('formular');
    setTimeout(fokussieren);
  }
}
