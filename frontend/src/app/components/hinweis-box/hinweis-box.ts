import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export type HinweisArt = 'fehler' | 'ki';

/**
 * Tailwind findet Klassen nur, wenn sie vollstaendig im Quelltext stehen -
 * darum keine zusammengesetzten Klassennamen.
 */
const DARSTELLUNG: Record<HinweisArt, { farben: string; icon: string }> = {
  fehler: {
    farben: 'bg-warning/10 text-warning',
    icon: 'pi-exclamation-triangle',
  },
  ki: {
    farben: 'bg-accent/10 text-accent',
    icon: 'pi-sparkles',
  },
};

/**
 * Aufklappbare Box fuer eine Hinweisliste. Startet zugeklappt, damit sie das
 * Formular nicht nach unten schiebt; die Liste selbst kommt per Content Projection.
 */
@Component({
  selector: 'app-hinweis-box',
  templateUrl: './hinweis-box.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0' },
})
export class HinweisBox {
  readonly titel = input.required<string>();
  readonly art = input.required<HinweisArt>();

  protected readonly offen = signal(false);
  protected readonly darstellung = computed(() => DARSTELLUNG[this.art()]);

  protected umschalten(): void {
    this.offen.update((offen) => !offen);
  }
}
