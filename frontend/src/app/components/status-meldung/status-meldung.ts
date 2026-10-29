import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusArt = 'laeuft' | 'erfolg' | 'fehler';

/**
 * Tailwind findet Klassen nur, wenn sie vollstaendig im Quelltext stehen -
 * darum keine zusammengesetzten Klassennamen.
 */
const DARSTELLUNG: Record<StatusArt, { icon: string; farbe: string }> = {
  laeuft: { icon: 'pi-spin pi-spinner', farbe: 'bg-accent/12 text-accent' },
  erfolg: { icon: 'pi-check', farbe: 'bg-success/15 text-success' },
  fehler: { icon: 'pi-exclamation-triangle', farbe: 'bg-danger/12 text-danger' },
};

/**
 * Eine Statuszeile unter der Ablageflaeche: rundes Symbol, Titel und darunter
 * beliebiger Text per Content Projection. Fehler sind role="alert", alles andere
 * role="status" - so lesen Screenreader jeden Wechsel vor.
 */
@Component({
  selector: 'app-status-meldung',
  templateUrl: './status-meldung.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class StatusMeldung {
  readonly art = input.required<StatusArt>();
  readonly titel = input.required<string>();

  protected readonly darstellung = computed(() => DARSTELLUNG[this.art()]);
  protected readonly rolle = computed(() => (this.art() === 'fehler' ? 'alert' : 'status'));
}
