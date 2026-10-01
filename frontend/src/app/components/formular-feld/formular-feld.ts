import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Beschriftung + Eingabefeld + Fehlertext darunter. Das Eingabefeld selbst kommt
 * per Content Projection, damit es seine eigenen Bindings und die id behaelt:
 *
 *   <app-formular-feld label="Name" [fehler]="fehler.get('kunde.name')">
 *     <input pInputText ... />
 *   </app-formular-feld>
 */
@Component({
  selector: 'app-formular-feld',
  templateUrl: './formular-feld.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class FormularFeld {
  readonly label = input.required<string>();
  /** Fehlertext; undefined heisst: Feld ist in Ordnung. */
  readonly fehler = input<string | undefined>();
}
