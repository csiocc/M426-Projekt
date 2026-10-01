import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { Lieferschein, normalisiere } from '../../models/lieferschein';
import { AnalyseFehler, DeliveryNoteService } from '../../services/delivery-note';
import { Upload } from './upload';

const lieferschein = normalisiere({ kunde: { name: 'Muster AG' }, positionen: [] });

/** Attrappe, damit die Komponente ohne HTTP getestet werden kann. */
class StubService extends DeliveryNoteService {
  /** Zaehlt mit, wie oft die Komponente den Upload tatsaechlich ausloest. */
  uploads = 0;

  constructor(
    private readonly hochgeladen: Observable<number>,
    private readonly analysiert: Observable<Lieferschein> = of(lieferschein),
  ) {
    super();
  }
  upload(): Observable<number> {
    this.uploads++;
    return this.hochgeladen;
  }
  ergebnis(): Observable<Lieferschein> {
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

/** Die Methoden, die der Test direkt aufruft - im Template haengen sie an PrimeNG. */
type UploadIntern = {
  onUpload: (e: { files: File[] }) => void;
  zuruecksetzen: (u: { uploadedFileCount: number; files: File[] }) => void;
  vorschau: (d: File) => unknown;
};

// Die Methoden sind protected - im Test greifen wir bewusst direkt darauf zu, weil
// das Ausloesen ueber einen echten Datei-Dialog im Testumfeld nicht moeglich ist.
const intern = (fixture: ComponentFixture<Upload>) =>
  fixture.componentInstance as unknown as UploadIntern;

function ausloesen(fixture: ComponentFixture<Upload>, file: File): void {
  intern(fixture).onUpload({ files: [file] });
}

const pngDatei = () => new File(['x'], 'lieferschein.png', { type: 'image/png' });
const pdfDatei = () => new File(['x'], 'lieferschein.pdf', { type: 'application/pdf' });
const textVon = (fixture: ComponentFixture<Upload>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';
const element = (fixture: ComponentFixture<Upload>, selektor: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(selektor);

describe('Upload', () => {
  // jsdom kennt keine Object-URLs - die Dateivorschau braucht sie.
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

  it('zeigt nach der Analyse links die Datei und rechts die erkannten Daten', async () => {
    const fixture = await setup(new StubService(of(1)));
    ausloesen(fixture, pdfDatei());
    await fixture.whenStable();

    expect(element(fixture, 'app-datei-vorschau')?.textContent).toContain('lieferschein.pdf');
    expect(element(fixture, 'app-lieferschein-editor')?.textContent).toContain('Erkannte Daten');
    expect(element(fixture, '[id="feld-kunde.name"]')).not.toBeNull();
  });

  it('meldet einen Analysefehler der KI mit eigener Ueberschrift', async () => {
    const fixture = await setup(
      new StubService(
        of(1),
        throwError(() => new AnalyseFehler('KI nicht erreichbar')),
      ),
    );
    ausloesen(fixture, pdfDatei());
    await fixture.whenStable();

    const text = textVon(fixture);
    expect(text).toContain('Die KI konnte den Lieferschein nicht auslesen.');
    expect(text).toContain('KI nicht erreichbar');
    expect(element(fixture, 'app-lieferschein-editor')).toBeNull();
  });

  it('kuerzt sehr lange Fehlermeldungen der API', async () => {
    const body = `{"error":{"message":"${'x'.repeat(1000)}"}}`;
    const fixture = await setup(
      new StubService(
        of(1),
        throwError(() => new AnalyseFehler(`OpenAI-API HTTP 401: ${body}`)),
      ),
    );
    ausloesen(fixture, pdfDatei());
    await fixture.whenStable();

    const text = textVon(fixture);
    expect(text).toContain('OpenAI-API HTTP 401');
    expect(text).toContain('…');
    expect(text).not.toContain('x'.repeat(400));
  });

  it('zeigt die Fehlermeldung aus dem Upload an', async () => {
    const fixture = await setup(new StubService(throwError(() => new Error('Datei fehlt'))));
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    const text = textVon(fixture);
    expect(text).toContain('Der Lieferschein konnte nicht verarbeitet werden.');
    expect(text).toContain('Datei fehlt');
  });

  it('zeigt die Fehlermeldung aus der Abfrage an', async () => {
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

  it('entfernt beim Zuruecksetzen die Vorschau und gibt die Datei frei', async () => {
    const fixture = await setup(new StubService(of(1)));
    ausloesen(fixture, pdfDatei());
    await fixture.whenStable();

    intern(fixture).zuruecksetzen({ uploadedFileCount: 1, files: [] });
    await fixture.whenStable();

    expect(element(fixture, 'app-datei-vorschau')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/vorschau');
  });

  it('liefert nur fuer Bilder eine Vorschau, nicht fuer PDF', async () => {
    const fixture = await setup(new StubService(of(1)));

    // PrimeNG haengt die objectURL nur an Bilder an.
    const bild = pngDatei() as File & { objectURL?: string };
    bild.objectURL = 'blob:http://localhost/abc';
    expect(intern(fixture).vorschau(bild)).toBe('blob:http://localhost/abc');
    expect(intern(fixture).vorschau(pdfDatei())).toBeNull();
  });

  it('gibt nach dem Entfernen wieder einen Upload frei', async () => {
    const fixture = await setup(new StubService(of(1)));

    // PrimeNG zaehlt beim Hochladen hoch und setzt selbst nie zurueck -
    // bliebe der Zaehler stehen, waere "Datei auswählen" dauerhaft gesperrt.
    // Der Zaehler allein reicht aber nicht: das computed hinter dem Knopf
    // haengt am Signal hinter files und rechnet nur dann neu.
    const uploader = { uploadedFileCount: 1, files: [pngDatei()] };
    intern(fixture).zuruecksetzen(uploader);

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

    ausloesen(fixture, pngDatei());
    intern(fixture).zuruecksetzen({ uploadedFileCount: 1, files: [] });
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    expect(service.uploads).toBe(2);
  });

  it('verwirft das Ergebnis eines abgebrochenen Uploads', async () => {
    const antwort = new Subject<number>();
    const fixture = await setup(new StubService(antwort));

    ausloesen(fixture, pngDatei());
    intern(fixture).zuruecksetzen({ uploadedFileCount: 1, files: [] });

    // Antwort des Servers zur entfernten Datei - sie darf nichts mehr anzeigen.
    antwort.next(1);
    antwort.complete();
    await fixture.whenStable();

    expect(textVon(fixture)).not.toContain('Erkannte Daten');
  });
});
