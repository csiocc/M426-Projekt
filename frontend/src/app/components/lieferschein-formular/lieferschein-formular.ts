import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ADRESSFELDER, Adresse, Lieferschein, neuePosition } from '../../models/lieferschein';
import { FormularFeld } from '../formular-feld/formular-feld';

type Kopffeld = 'lieferdatum' | 'lieferschein_nummer' | 'bestellnummer';
type PositionsText = 'artikelnummer' | 'bezeichnung' | 'einheit';

/** Leeres Eingabefeld heisst "nicht vorhanden" - so wie die KI es mit null meldet. */
function textAus(event: Event): string | null {
  const wert = (event.target as HTMLInputElement).value;
  return wert === '' ? null : wert;
}

function zahlAus(event: Event): number | null {
  const wert = (event.target as HTMLInputElement).value;
  return wert === '' || isNaN(Number(wert)) ? null : Number(wert);
}

/**
 * Formular fuer einen erkannten Lieferschein. Jede Eingabe erzeugt einen neuen
 * Lieferschein (immutable), damit alle abhaengigen Signale sicher neu rechnen.
 * Felder mit Fehler bekommen einen roten Rahmen und den Fehlertext.
 */
@Component({
  selector: 'app-lieferschein-formular',
  imports: [ButtonModule, FormularFeld, InputTextModule],
  templateUrl: './lieferschein-formular.html',
  styleUrl: './lieferschein-formular.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LieferscheinFormular {
  readonly daten = model.required<Lieferschein>();
  /** Feldpfad -> Fehlertext, z.B. "kunde.name" -> "Name fehlt". */
  readonly fehler = input.required<ReadonlyMap<string, string>>();

  protected readonly adressfelder = ADRESSFELDER;
  protected readonly kundenAdressfelder: (keyof Adresse)[] = ['strasse', 'plz', 'ort', 'land'];
  protected readonly lieferAdressfelder: (keyof Adresse)[] = [
    'name',
    'strasse',
    'plz',
    'ort',
    'land',
  ];

  protected setzeKunde(feld: 'name' | 'kundennummer', event: Event): void {
    this.aendern((d) => (d.kunde[feld] = textAus(event)));
  }

  protected setzeAdresse(ziel: 'kunde' | 'lieferadresse', feld: keyof Adresse, event: Event): void {
    this.aendern((d) => {
      const adresse = ziel === 'kunde' ? d.kunde.adresse : d.lieferadresse;
      adresse[feld] = textAus(event);
    });
  }

  protected setzeKopf(feld: Kopffeld, event: Event): void {
    this.aendern((d) => (d[feld] = textAus(event)));
  }

  protected setzePositionsText(index: number, feld: PositionsText, event: Event): void {
    this.aendern((d) => {
      const position = d.positionen[index];
      if (feld === 'bezeichnung') position.bezeichnung = textAus(event) ?? '';
      else position[feld] = textAus(event);
    });
  }

  protected setzeMenge(index: number, event: Event): void {
    this.aendern((d) => (d.positionen[index].menge = zahlAus(event)));
  }

  protected positionHinzufuegen(): void {
    this.aendern((d) => d.positionen.push(neuePosition(d.positionen)));
  }

  protected positionEntfernen(index: number): void {
    this.aendern((d) => d.positionen.splice(index, 1));
  }

  private aendern(aenderung: (kopie: Lieferschein) => unknown): void {
    this.daten.update((daten) => {
      const kopie = structuredClone(daten);
      aenderung(kopie);
      return kopie;
    });
  }
}
