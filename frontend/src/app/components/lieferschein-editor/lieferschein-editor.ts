import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Lieferschein, gruppiereHinweise, pruefeLieferschein } from '../../models/lieferschein';
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
  imports: [ButtonModule, HinweisBox, JsonEditor, LieferscheinFormular, TagModule],
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

  protected wiederherstellen(): void {
    this.daten.set(structuredClone(this.original()));
  }

  /** Springt aus der Fehlerliste zum betroffenen Feld im Formular. */
  protected zumFeld(feld: string): void {
    const fokussieren = () => document.getElementById(`feld-${feld}`)?.focus();
    if (this.ansicht() === 'formular') {
      fokussieren();
      return;
    }
    // Aus dem JSON-Tab: das Feld existiert erst nach dem naechsten Rendern.
    this.ansicht.set('formular');
    setTimeout(fokussieren);
  }
}
