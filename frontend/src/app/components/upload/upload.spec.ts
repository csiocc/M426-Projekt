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
const textVon = (fixture: ComponentFixture<Upload>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('Upload', () => {
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

  it('zeigt das JSON-Ergebnis samt Dateiname an', async () => {
    const fixture = await setup(
      new StubService(of(1), of({ lieferschein_nummer: 'LS-2026-0042', positionen: [] })),
    );
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    const text = textVon(fixture);
    expect(text).toContain('lieferschein.png');
    expect(text).toContain('lieferschein_nummer');
    expect(text).toContain('LS-2026-0042');
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
