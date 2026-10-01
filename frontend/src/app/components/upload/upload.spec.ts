import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { JsonValue } from '../../models/delivery-note';
import { DeliveryNoteService } from '../../services/delivery-note';
import { Upload } from './upload';

/** Attrappe, damit die Komponente ohne HTTP getestet werden kann. */
class StubService extends DeliveryNoteService {
  /** Zaehlt mit, wie oft die Komponente den Upload tatsaechlich ausloest. */
  uploads = 0;

  constructor(
    private readonly hochgeladen: Observable<number>,
    private readonly analysiert: Observable<JsonValue> = of({ lieferant: 'Muster AG' }),
  ) {
    super();
  }
  upload(): Observable<number> {
    this.uploads++;
    return this.hochgeladen;
  }
  ergebnis(): Observable<JsonValue> {
    return this.analysiert;
  }
}

async function setup(service: StubService): Promise<ComponentFixture<Upload>> {
  await TestBed.configureTestingModule({
    imports: [Upload],
    providers: [{ provide: DeliveryNoteService, useValue: service }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Upload);
  await fixture.whenStable();
  return fixture;
}

// onUpload ist protected - im Test greifen wir bewusst direkt darauf zu, weil das
// Ausloesen ueber einen echten Datei-Dialog im Testumfeld nicht moeglich ist.
function ausloesen(fixture: ComponentFixture<Upload>, file: File): void {
  (fixture.componentInstance as unknown as { onUpload: (e: { files: File[] }) => void }).onUpload({
    files: [file],
  });
}

const pngDatei = () => new File(['x'], 'lieferschein.png', { type: 'image/png' });
const pdfDatei = () => new File(['x'], 'lieferschein.pdf', { type: 'application/pdf' });
const textVon = (fixture: ComponentFixture<Upload>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

/** Formularfeld ueber seinen Pfad, z.B. "kunde.name" oder "positionen.1.menge". */
const feld = (fixture: ComponentFixture<Upload>, pfad: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    `[id="feld-${pfad}"]`,
  ) as HTMLInputElement | null;

/** Tippt einen Wert in ein Formularfeld, wie es die Nutzerin taete. */
async function eintippen(
  fixture: ComponentFixture<Upload>,
  pfad: string,
  wert: string,
): Promise<void> {
  const eingabe = feld(fixture, pfad)!;
  eingabe.value = wert;
  eingabe.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

const jsonFeld = (fixture: ComponentFixture<Upload>) =>
  (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;

async function zumJson(fixture: ComponentFixture<Upload>): Promise<void> {
  knopf(fixture, 'JSON').click();
  await fixture.whenStable();
}

/** Ersetzt den ganzen Inhalt des JSON-Felds, wie beim Tippen. */
async function jsonTippen(fixture: ComponentFixture<Upload>, text: string): Promise<void> {
  const eingabe = jsonFeld(fixture);
  eingabe.value = text;
  eingabe.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/** Knopf ueber seine Beschriftung oder sein aria-label. */
function knopf(fixture: ComponentFixture<Upload>, beschriftung: string): HTMLButtonElement {
  const knoepfe = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ) as HTMLButtonElement[];
  return knoepfe.find(
    (k) => k.textContent?.includes(beschriftung) || k.getAttribute('aria-label') === beschriftung,
  )!;
}

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

/** Laedt eine Datei hoch und wartet, bis das Ergebnis angezeigt wird. */
async function mitErgebnis(
  ergebnis: JsonValue,
  datei: File = pdfDatei(),
): Promise<ComponentFixture<Upload>> {
  const fixture = await setup(new StubService(of(1), of(ergebnis)));
  ausloesen(fixture, datei);
  await fixture.whenStable();
  return fixture;
}

describe('Upload', () => {
  // jsdom kennt keine Object-URLs - die Komponente braucht sie fuer die Dateivorschau.
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/vorschau');
    URL.revokeObjectURL = vi.fn();
  });

  it('should create', async () => {
    const fixture = await setup(new StubService(of(1)));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('zeigt Titel und Hinweistext', async () => {
    const fixture = await setup(new StubService(of(1)));
    const text = textVon(fixture);
    expect(text).toContain('Lieferscheine');
    expect(text).toContain('20.0 MB');
  });

  it('zeigt die erkannten Daten im Formular samt Dateiname an', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    expect(textVon(fixture)).toContain('lieferschein.pdf');
    expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
    expect(feld(fixture, 'lieferadresse.ort')?.value).toBe('Dübendorf');
    expect(feld(fixture, 'lieferdatum')?.value).toBe('2026-09-10');
    expect(feld(fixture, 'positionen.1.bezeichnung')?.value).toBe('Dübel S8');
    expect(feld(fixture, 'positionen.1.menge')?.value).toBe('10');
  });

  it('zeigt im JSON-Tab, was exportiert wird - inklusive Korrekturen', async () => {
    const fixture = await mitErgebnis(vollstaendig());
    await eintippen(fixture, 'kunde.name', 'Beispiel GmbH');

    await zumJson(fixture);

    const json = jsonFeld(fixture).value;
    expect(json).toContain('"lieferschein_nummer": "LS-2026-0042"');
    expect(json).toContain('"name": "Beispiel GmbH"');
  });

  it('uebernimmt Aenderungen im JSON sofort ins Formular', async () => {
    const fixture = await mitErgebnis(vollstaendig());
    await zumJson(fixture);

    const daten = JSON.parse(jsonFeld(fixture).value) as {
      kunde: { name: string | null };
      lieferdatum: string | null;
    };
    daten.kunde.name = 'Aus JSON AG';
    daten.lieferdatum = null;
    await jsonTippen(fixture, JSON.stringify(daten, null, 2));

    // Pruefung laeuft mit: das geloeschte Datum zaehlt sofort als Fehler.
    expect(textVon(fixture)).toContain('1 Fehler');

    knopf(fixture, 'Formular').click();
    await fixture.whenStable();
    expect(feld(fixture, 'kunde.name')?.value).toBe('Aus JSON AG');
    expect(feld(fixture, 'lieferdatum')?.classList).toContain('feld-fehler');
  });

  it('meldet ungueltiges JSON und behaelt im Formular den letzten gueltigen Stand', async () => {
    const fixture = await mitErgebnis(vollstaendig());
    await zumJson(fixture);

    await jsonTippen(fixture, '{ "kunde": ');

    expect(textVon(fixture)).toContain('Ungültiges JSON');
    // Der Entwurf bleibt stehen, damit man ihn reparieren kann.
    expect(jsonFeld(fixture).value).toBe('{ "kunde": ');

    knopf(fixture, 'Formular').click();
    await fixture.whenStable();
    expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
  });

  it('setzt auch JSON-Aenderungen mit "wiederherstellen" zurueck', async () => {
    const fixture = await mitErgebnis(vollstaendig());
    await zumJson(fixture);
    await jsonTippen(fixture, '{}');
    expect(textVon(fixture)).not.toContain('Vollständig');

    knopf(fixture, 'Erkannte Daten wiederherstellen').click();
    await fixture.whenStable();

    expect(jsonFeld(fixture).value).toContain('"name": "Muster AG"');
    expect(textVon(fixture)).toContain('Vollständig');
  });

  it('zeigt ein PDF links im iframe, ohne Seitenleiste', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('iframe')?.getAttribute('src')).toBe(
      'blob:http://localhost/vorschau#navpanes=0&view=FitH',
    );
    expect(element.querySelector('img[alt="lieferschein.pdf"]')).toBeNull();
  });

  it('zeigt ein Bild links als img an', async () => {
    const fixture = await mitErgebnis(vollstaendig(), pngDatei());

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img[alt="lieferschein.png"]')?.getAttribute('src')).toBe(
      'blob:http://localhost/vorschau',
    );
    expect(element.querySelector('iframe')).toBeNull();
  });

  it('meldet bei vollstaendigen Daten keine Fehler', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    const text = textVon(fixture);
    expect(text).toContain('Vollständig');
    expect(text).not.toContain('Fehlende oder fehlerhafte Angaben');
  });

  it('markiert fehlende Angaben direkt im Formular', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    await eintippen(fixture, 'kunde.name', '');
    await eintippen(fixture, 'positionen.1.menge', '');

    const text = textVon(fixture);
    expect(text).toContain('2 Fehler');
    expect(text).toContain('Name fehlt');
    expect(feld(fixture, 'positionen.1.menge')?.title).toBe('Position 2 (Dübel S8): Menge fehlt');

    knopf(fixture, 'Fehlende oder fehlerhafte Angaben').click();
    await fixture.whenStable();
    expect(textVon(fixture)).toContain('Position 2 (Dübel S8): Menge fehlt');
  });

  it('zeigt Hinweise der KI getrennt und zaehlt sie nicht als Fehler', async () => {
    const fixture = await mitErgebnis({
      ...vollstaendig(),
      warnungen: ['Lieferdatum unscharf', 'Menge Position 2 geschätzt'],
    });

    const text = textVon(fixture);
    expect(text).toContain('Vollständig');
    expect(text).toContain('2 KI-Hinweise');
    expect(text).toContain('Hinweise der KI (2)');
    // Nur Zusatzinfo - darum standardmaessig zugeklappt.
    expect(text).not.toContain('Menge Position 2 geschätzt');

    knopf(fixture, 'Hinweise der KI').click();
    await fixture.whenStable();
    expect(textVon(fixture)).toContain('Menge Position 2 geschätzt');
  });

  it('zeigt die Fehlerliste erst auf Klick, die Felder sind sofort markiert', async () => {
    const fixture = await mitErgebnis({ ...vollstaendig(), lieferdatum: null });
    const box = () => knopf(fixture, 'Fehlende oder fehlerhafte Angaben').parentElement!;

    // Zugeklappt: der Text steht nur unter dem Datumsfeld selbst.
    expect(box().textContent).not.toContain('Lieferdatum fehlt');
    expect(textVon(fixture)).toContain('Lieferdatum fehlt');

    knopf(fixture, 'Fehlende oder fehlerhafte Angaben').click();
    await fixture.whenStable();
    expect(box().textContent).toContain('Lieferdatum fehlt');
  });

  it('markiert alle fehlerhaften Felder gleich, auch das Datum', async () => {
    const fixture = await mitErgebnis({ ...vollstaendig(), lieferdatum: null });
    await eintippen(fixture, 'positionen.0.menge', '');

    expect(feld(fixture, 'lieferdatum')?.classList).toContain('feld-fehler');
    expect(feld(fixture, 'positionen.0.menge')?.classList).toContain('feld-fehler');
    expect(feld(fixture, 'kunde.name')?.classList).not.toContain('feld-fehler');
  });

  it('zeigt die Positionsnummer nur an, statt sie bearbeitbar zu machen', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    const ersteZelle = (fixture.nativeElement as HTMLElement).querySelector('tbody tr td')!;
    expect(ersteZelle.textContent?.trim()).toBe('1');
    expect(ersteZelle.querySelector('input')).toBeNull();
  });

  it('zeigt fuer jede erkannte Position eine eigene Zeile - egal wie viele', async () => {
    const zeilen = (fixture: ComponentFixture<Upload>) =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length;
    const mitPositionen = (anzahl: number) =>
      mitErgebnis({
        ...vollstaendig(),
        positionen: Array.from({ length: anzahl }, (_, i) => ({
          position: i + 1,
          bezeichnung: `Artikel ${i + 1}`,
          menge: 1,
        })),
      });

    const eine = await mitPositionen(1);
    expect(zeilen(eine)).toBe(1);
    expect(feld(eine, 'positionen.0.bezeichnung')?.value).toBe('Artikel 1');
    expect(textVon(eine)).toContain('Vollständig');
    TestBed.resetTestingModule();

    const viele = await mitPositionen(40);
    expect(zeilen(viele)).toBe(40);
    expect(feld(viele, 'positionen.39.bezeichnung')?.value).toBe('Artikel 40');
    TestBed.resetTestingModule();

    // Keine Position erkannt: Hinweis plus Knopf, um selbst eine anzulegen.
    const keine = await mitPositionen(0);
    expect(zeilen(keine)).toBe(0);
    expect(textVon(keine)).toContain('Keine Artikel erkannt');
    expect(feld(keine, 'positionen')).not.toBeNull();
  });

  it('fuegt Positionen hinzu und entfernt sie', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    feld(fixture, 'positionen')!.click();
    await fixture.whenStable();
    // Die neue, leere Zeile ist sofort als unvollstaendig markiert.
    expect(feld(fixture, 'positionen.2.bezeichnung')?.classList).toContain('feld-fehler');
    expect(textVon(fixture)).toContain('2 Fehler');

    knopf(fixture, 'Position 3 entfernen').click();
    await fixture.whenStable();
    expect(feld(fixture, 'positionen.2.bezeichnung')).toBeNull();
    expect(textVon(fixture)).toContain('Vollständig');
  });

  it('stellt die erkannten Daten nach einer Bearbeitung wieder her', async () => {
    const fixture = await mitErgebnis(vollstaendig());

    await eintippen(fixture, 'kunde.name', '');
    knopf(fixture, 'Erkannte Daten wiederherstellen').click();
    await fixture.whenStable();

    expect(feld(fixture, 'kunde.name')?.value).toBe('Muster AG');
    expect(textVon(fixture)).toContain('Vollständig');
  });

  it('zeigt eine Fehlerantwort des Jobs als Fehler statt als Ergebnis', async () => {
    const fixture = await mitErgebnis({ fehler: 'KI nicht erreichbar' });

    const text = textVon(fixture);
    expect(text).toContain('Die KI konnte den Lieferschein nicht auslesen.');
    expect(text).toContain('KI nicht erreichbar');
    expect(feld(fixture, 'kunde.name')).toBeNull();
  });

  it('kuerzt sehr lange Fehlermeldungen der API', async () => {
    const body = `{"error":{"message":"${'x'.repeat(1000)}"}}`;
    const fixture = await mitErgebnis({ fehler: `OpenAI-API HTTP 401: ${body}` });

    const text = textVon(fixture);
    expect(text).toContain('OpenAI-API HTTP 401');
    expect(text).toContain('…');
    expect(text).not.toContain('x'.repeat(400));
  });

  it('gibt die Object-URL beim Entfernen wieder frei', async () => {
    const fixture = await setup(new StubService(of(1), of(vollstaendig())));
    const komponente = fixture.componentInstance as unknown as {
      zuruecksetzen: (u: { uploadedFileCount: number; files: File[] }) => void;
    };
    ausloesen(fixture, pdfDatei());
    komponente.zuruecksetzen({ uploadedFileCount: 1, files: [] });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/vorschau');
  });

  it('liefert nur fuer Bilder eine Vorschau, nicht fuer PDF', async () => {
    const fixture = await setup(new StubService(of(1)));
    const komponente = fixture.componentInstance as unknown as {
      vorschau: (d: File) => unknown;
    };

    // PrimeNG haengt die objectURL nur an Bilder an.
    const bild = pngDatei() as File & { objectURL?: string };
    bild.objectURL = 'blob:http://localhost/abc';
    expect(komponente.vorschau(bild)).toBe('blob:http://localhost/abc');

    const pdf = new File(['x'], 'lieferschein.pdf', { type: 'application/pdf' });
    expect(komponente.vorschau(pdf)).toBeNull();
  });

  it('gibt nach dem Entfernen wieder einen Upload frei', async () => {
    const fixture = await setup(new StubService(of(1)));
    const komponente = fixture.componentInstance as unknown as {
      zuruecksetzen: (u: { uploadedFileCount: number; files: File[] }) => void;
    };

    // PrimeNG zaehlt beim Hochladen hoch und setzt selbst nie zurueck -
    // bliebe der Zaehler stehen, waere "Datei auswählen" dauerhaft gesperrt.
    // Der Zaehler allein reicht aber nicht: das computed hinter dem Knopf
    // haengt am Signal hinter files und rechnet nur dann neu.
    const uploader = { uploadedFileCount: 1, files: [pngDatei()] };
    komponente.zuruecksetzen(uploader);

    expect(uploader.uploadedFileCount).toBe(0);
    expect(uploader.files).toEqual([]);
  });

  it('nimmt waehrend eines laufenden Uploads keinen zweiten an', async () => {
    // NEVER: der Upload bleibt haengen, die Komponente steht also auf 'laedt'.
    const service = new StubService(NEVER);
    const fixture = await setup(service);

    ausloesen(fixture, pngDatei());
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    expect(service.uploads).toBe(1);
  });

  it('gibt nach dem Entfernen wieder einen Upload an den Service durch', async () => {
    const service = new StubService(NEVER);
    const fixture = await setup(service);
    const komponente = fixture.componentInstance as unknown as {
      zuruecksetzen: (u: { uploadedFileCount: number; files: File[] }) => void;
    };

    ausloesen(fixture, pngDatei());
    komponente.zuruecksetzen({ uploadedFileCount: 1, files: [] });
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    expect(service.uploads).toBe(2);
  });

  it('verwirft das Ergebnis eines abgebrochenen Uploads', async () => {
    const antwort = new Subject<number>();
    const fixture = await setup(new StubService(antwort));
    const komponente = fixture.componentInstance as unknown as {
      zuruecksetzen: (u: { uploadedFileCount: number; files: File[] }) => void;
    };

    ausloesen(fixture, pngDatei());
    komponente.zuruecksetzen({ uploadedFileCount: 1, files: [] });

    // Antwort des Servers zur entfernten Datei - sie darf nichts mehr anzeigen.
    antwort.next(1);
    antwort.complete();
    await fixture.whenStable();

    expect(textVon(fixture)).not.toContain('Erkannte Daten');
  });

  it('zeigt die Fehlermeldung aus dem Upload an', async () => {
    const fixture = await setup(new StubService(throwError(() => new Error('Datei fehlt'))));
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    expect(textVon(fixture)).toContain('Datei fehlt');
  });

  it('zeigt die Fehlermeldung aus der Analyse an', async () => {
    const fixture = await setup(
      new StubService(
        of(1),
        throwError(() => new Error('Lieferschein nicht gefunden')),
      ),
    );
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    expect(textVon(fixture)).toContain('Lieferschein nicht gefunden');
  });
});
