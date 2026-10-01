import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonValue } from '../../models/delivery-note';
import { normalisiere } from '../../models/lieferschein';
import { LieferscheinEditor } from './lieferschein-editor';

/** Ein Lieferschein, bei dem alle Pflichtangaben vorhanden sind. */
const vollstaendig = (): { [key: string]: JsonValue } => ({
  kunde: {
    name: 'Muster AG',
    adresse: { strasse: 'Bahnhofstrasse 1', plz: '8001', ort: 'Zürich' },
  },
  lieferadresse: {
    name: 'Baustelle Nord',
    strasse: 'Industrieweg 5',
    plz: '8600',
    ort: 'Dübendorf',
  },
  lieferdatum: '2026-09-10',
  lieferschein_nummer: 'LS-2026-0042',
  positionen: [
    { position: 1, bezeichnung: 'Schrauben 4x30', menge: 250 },
    { position: 2, bezeichnung: 'Dübel S8', menge: 10 },
  ],
  warnungen: [],
});

async function zeige(ergebnis: JsonValue): Promise<ComponentFixture<LieferscheinEditor>> {
  const fixture = TestBed.createComponent(LieferscheinEditor);
  fixture.componentRef.setInput('original', normalisiere(ergebnis));
  await fixture.whenStable();
  return fixture;
}

type Fixture = ComponentFixture<LieferscheinEditor>;

const wurzel = (fixture: Fixture) => fixture.nativeElement as HTMLElement;
const textVon = (fixture: Fixture) => wurzel(fixture).textContent ?? '';

/** Formularfeld ueber seinen Pfad, z.B. "kunde.name" oder "positionen.1.menge". */
const feld = (fixture: Fixture, pfad: string) =>
  wurzel(fixture).querySelector(`[id="feld-${pfad}"]`) as HTMLInputElement | null;

const jsonFeld = (fixture: Fixture) =>
  wurzel(fixture).querySelector('textarea') as HTMLTextAreaElement;

/** Knopf ueber seine Beschriftung oder sein aria-label. */
function knopf(fixture: Fixture, beschriftung: string): HTMLButtonElement {
  const knoepfe = Array.from(wurzel(fixture).querySelectorAll('button'));
  return knoepfe.find(
    (k) => k.textContent?.includes(beschriftung) || k.getAttribute('aria-label') === beschriftung,
  )!;
}

async function klicken(fixture: Fixture, element: HTMLElement): Promise<void> {
  element.click();
  await fixture.whenStable();
}

/** Setzt den Wert eines Eingabefelds, wie es die Nutzerin beim Tippen taete. */
async function tippen(
  fixture: Fixture,
  eingabe: HTMLInputElement | HTMLTextAreaElement,
  wert: string,
): Promise<void> {
  eingabe.value = wert;
  eingabe.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

describe('LieferscheinEditor', () => {
  describe('Formular', () => {
    it('zeigt die erkannten Daten in den Feldern', async () => {
      const fixture = await zeige(vollstaendig());

      expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
      expect(feld(fixture, 'lieferadresse.ort')?.value).toBe('Dübendorf');
      expect(feld(fixture, 'lieferdatum')?.value).toBe('2026-09-10');
      expect(feld(fixture, 'positionen.1.bezeichnung')?.value).toBe('Dübel S8');
      expect(feld(fixture, 'positionen.1.menge')?.value).toBe('10');
    });

    it('meldet bei vollstaendigen Daten keine Fehler', async () => {
      const fixture = await zeige(vollstaendig());

      expect(textVon(fixture)).toContain('Vollständig');
      expect(textVon(fixture)).not.toContain('Fehlende oder fehlerhafte Angaben');
    });

    it('markiert fehlende Angaben direkt am Feld', async () => {
      const fixture = await zeige(vollstaendig());

      await tippen(fixture, feld(fixture, 'kunde.name')!, '');
      await tippen(fixture, feld(fixture, 'positionen.1.menge')!, '');

      expect(textVon(fixture)).toContain('2 Fehler');
      expect(textVon(fixture)).toContain('Name fehlt');
      expect(feld(fixture, 'positionen.1.menge')?.title).toBe('Position 2 (Dübel S8): Menge fehlt');
    });

    it('markiert alle fehlerhaften Felder gleich, auch das Datum', async () => {
      const fixture = await zeige({ ...vollstaendig(), lieferdatum: null });
      await tippen(fixture, feld(fixture, 'positionen.0.menge')!, '');

      expect(feld(fixture, 'lieferdatum')?.classList).toContain('feld-fehler');
      expect(feld(fixture, 'positionen.0.menge')?.classList).toContain('feld-fehler');
      expect(feld(fixture, 'kunde.name')?.classList).not.toContain('feld-fehler');
    });

    it('zeigt die Positionsnummer nur an, statt sie bearbeitbar zu machen', async () => {
      const fixture = await zeige(vollstaendig());

      const ersteZelle = wurzel(fixture).querySelector('tbody tr td')!;
      expect(ersteZelle.textContent?.trim()).toBe('1');
      expect(ersteZelle.querySelector('input')).toBeNull();
    });

    it('zeigt fuer jede erkannte Position eine Zeile - egal wie viele', async () => {
      const mitPositionen = (anzahl: number) =>
        zeige({
          ...vollstaendig(),
          positionen: Array.from({ length: anzahl }, (_, i) => ({
            position: i + 1,
            bezeichnung: `Artikel ${i + 1}`,
            menge: 1,
          })),
        });
      const zeilen = (fixture: Fixture) => wurzel(fixture).querySelectorAll('tbody tr').length;

      const eine = await mitPositionen(1);
      expect(zeilen(eine)).toBe(1);
      expect(textVon(eine)).toContain('Vollständig');

      const viele = await mitPositionen(40);
      expect(zeilen(viele)).toBe(40);
      expect(feld(viele, 'positionen.39.bezeichnung')?.value).toBe('Artikel 40');

      // Keine Position erkannt: Hinweis plus Knopf, um selbst eine anzulegen.
      const keine = await mitPositionen(0);
      expect(zeilen(keine)).toBe(0);
      expect(textVon(keine)).toContain('Keine Artikel erkannt');
      expect(feld(keine, 'positionen')).not.toBeNull();
    });

    it('fuegt Positionen hinzu und entfernt sie', async () => {
      const fixture = await zeige(vollstaendig());

      await klicken(fixture, feld(fixture, 'positionen')!);
      // Die neue, leere Zeile ist sofort als unvollstaendig markiert.
      expect(feld(fixture, 'positionen.2.bezeichnung')?.classList).toContain('feld-fehler');
      expect(textVon(fixture)).toContain('2 Fehler');

      await klicken(fixture, knopf(fixture, 'Position 3 entfernen'));
      expect(feld(fixture, 'positionen.2.bezeichnung')).toBeNull();
      expect(textVon(fixture)).toContain('Vollständig');
    });
  });

  describe('Hinweise', () => {
    it('zeigt die Fehlerliste erst auf Klick, die Felder sind sofort markiert', async () => {
      const fixture = await zeige({ ...vollstaendig(), lieferdatum: null });
      const box = () => wurzel(fixture).querySelector('app-hinweis-box')!;

      expect(box().textContent).not.toContain('Lieferdatum fehlt');
      expect(textVon(fixture)).toContain('Lieferdatum fehlt');

      await klicken(fixture, knopf(fixture, 'Fehlende oder fehlerhafte Angaben'));
      expect(box().textContent).toContain('Lieferdatum fehlt');
    });

    it('zeigt Hinweise der KI getrennt und zaehlt sie nicht als Fehler', async () => {
      const fixture = await zeige({
        ...vollstaendig(),
        warnungen: ['Lieferdatum unscharf', 'Menge Position 2 geschätzt'],
      });

      expect(textVon(fixture)).toContain('Vollständig');
      expect(textVon(fixture)).toContain('2 KI-Hinweise');
      // Nur Zusatzinfo - darum standardmaessig zugeklappt.
      expect(textVon(fixture)).not.toContain('Menge Position 2 geschätzt');

      await klicken(fixture, knopf(fixture, 'Hinweise der KI'));
      expect(textVon(fixture)).toContain('Menge Position 2 geschätzt');
    });
  });

  describe('JSON', () => {
    it('zeigt dieselben Daten wie das Formular, inklusive Korrekturen', async () => {
      const fixture = await zeige(vollstaendig());
      await tippen(fixture, feld(fixture, 'kunde.name')!, 'Beispiel GmbH');

      await klicken(fixture, knopf(fixture, 'JSON'));

      expect(jsonFeld(fixture).value).toContain('"lieferschein_nummer": "LS-2026-0042"');
      expect(jsonFeld(fixture).value).toContain('"name": "Beispiel GmbH"');
    });

    it('uebernimmt Aenderungen im JSON sofort ins Formular', async () => {
      const fixture = await zeige(vollstaendig());
      await klicken(fixture, knopf(fixture, 'JSON'));

      const daten = JSON.parse(jsonFeld(fixture).value);
      daten.kunde.name = 'Aus JSON AG';
      daten.lieferdatum = null;
      await tippen(fixture, jsonFeld(fixture), JSON.stringify(daten, null, 2));

      // Die Pruefung laeuft mit: das geloeschte Datum zaehlt sofort als Fehler.
      expect(textVon(fixture)).toContain('1 Fehler');

      await klicken(fixture, knopf(fixture, 'Formular'));
      expect(feld(fixture, 'kunde.name')?.value).toBe('Aus JSON AG');
      expect(feld(fixture, 'lieferdatum')?.classList).toContain('feld-fehler');
    });

    it('meldet ungueltiges JSON und behaelt den letzten gueltigen Stand', async () => {
      const fixture = await zeige(vollstaendig());
      await klicken(fixture, knopf(fixture, 'JSON'));

      await tippen(fixture, jsonFeld(fixture), '{ "kunde": ');

      expect(textVon(fixture)).toContain('Ungültiges JSON');
      // Der Entwurf bleibt stehen, damit man ihn reparieren kann.
      expect(jsonFeld(fixture).value).toBe('{ "kunde": ');

      await klicken(fixture, knopf(fixture, 'Formular'));
      expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
    });
  });

  describe('Wiederherstellen', () => {
    it('setzt Aenderungen im Formular zurueck', async () => {
      const fixture = await zeige(vollstaendig());

      await tippen(fixture, feld(fixture, 'kunde.name')!, '');
      await klicken(fixture, knopf(fixture, 'Erkannte Daten wiederherstellen'));

      expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
      expect(textVon(fixture)).toContain('Vollständig');
    });

    it('setzt auch Aenderungen im JSON zurueck', async () => {
      const fixture = await zeige(vollstaendig());
      await klicken(fixture, knopf(fixture, 'JSON'));
      await tippen(fixture, jsonFeld(fixture), '{}');
      expect(textVon(fixture)).not.toContain('Vollständig');

      await klicken(fixture, knopf(fixture, 'Erkannte Daten wiederherstellen'));

      expect(jsonFeld(fixture).value).toContain('"name": "Muster AG"');
      expect(textVon(fixture)).toContain('Vollständig');
    });
  });
});
