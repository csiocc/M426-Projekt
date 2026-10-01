import { ChangeDetectionStrategy, Component, computed, linkedSignal, model } from '@angular/core';
import { TextareaModule } from 'primeng/textarea';
import { JsonValue } from '../../models/delivery-note';
import { Lieferschein, normalisiere } from '../../models/lieferschein';

const alsJson = (daten: Lieferschein) => JSON.stringify(daten, null, 2);

/** Fehlermeldung von JSON.parse, oder null, wenn der Text gueltiges JSON ist. */
function parseFehler(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch (fehler) {
    return (fehler as Error).message;
  }
}

/**
 * Derselbe Lieferschein wie im Formular, als bearbeitbares JSON. Jeder gueltige
 * Stand geht sofort zurueck in `daten`; ungueltiges JSON wird nur gemeldet,
 * `daten` behaelt dann den letzten gueltigen Stand.
 */
@Component({
  selector: 'app-json-editor',
  imports: [TextareaModule],
  templateUrl: './json-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
})
export class JsonEditor {
  readonly daten = model.required<Lieferschein>();

  /** Der zuletzt von hier aus geschriebene Stand - siehe `text`. */
  private selbstGeschrieben: Lieferschein | null = null;

  /**
   * Der Text im Feld. Aendert sich `daten` von aussen (Formular, Wiederherstellen),
   * wird er neu formatiert. Kommt die Aenderung von hier, bleibt der getippte
   * Text stehen - sonst sprange der Cursor bei jedem Tastendruck ans Ende.
   */
  protected readonly text = linkedSignal<Lieferschein, string>({
    source: this.daten,
    computation: (daten, vorher) =>
      vorher && daten === this.selbstGeschrieben ? vorher.value : alsJson(daten),
  });

  protected readonly fehler = computed(() => parseFehler(this.text()));

  protected eingabe(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.text.set(text);
    try {
      const neu = normalisiere(JSON.parse(text) as JsonValue);
      this.selbstGeschrieben = neu;
      this.daten.set(neu);
    } catch {
      // Ungueltiges JSON: `fehler` zeigt die Meldung, `daten` bleibt unveraendert.
    }
  }
}
