import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export type HinweisArt = 'fehler' | 'ki';

/**
 * Tailwind findet Klassen nur, wenn sie vollstaendig im Quelltext stehen -
 * darum keine zusammengesetzten Klassennamen.
 */
const DARSTELLUNG: Record<HinweisArt, { farben: string; icon: string }> = {
  fehler: {
    farben:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
    icon: 'pi-exclamation-triangle',
  },
  ki: {
    farben:
      'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
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
