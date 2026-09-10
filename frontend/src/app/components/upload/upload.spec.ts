import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { DeliveryNote } from '../../models/delivery-note';
import { DeliveryNoteService } from '../../services/delivery-note';
import { Upload } from './upload';

class StubService extends DeliveryNoteService {
  constructor(private readonly antwort: Observable<DeliveryNote>) {
    super();
  }
  upload(): Observable<DeliveryNote> {
    return this.antwort;
  }
}

const beispielNote: DeliveryNote = {
  id: 'abc',
  filename: 'lieferschein.png',
  size: 1536,
  contentType: 'image/png',
  uploadedAt: new Date(),
};

async function setup(antwort: Observable<DeliveryNote>): Promise<ComponentFixture<Upload>> {
  await TestBed.configureTestingModule({
    imports: [Upload],
    providers: [{ provide: DeliveryNoteService, useValue: new StubService(antwort) }],
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

describe('Upload', () => {
  it('should create', async () => {
    const fixture = await setup(of(beispielNote));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('zeigt Titel und Hinweistext', async () => {
    const fixture = await setup(of(beispielNote));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lieferscheine');
    expect(text).toContain('20.0 MB');
  });

  it('meldet Erfolg samt Dateiname und Groesse', async () => {
    const fixture = await setup(of(beispielNote));
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('lieferschein.png');
    expect(text).toContain('1.5 KB');
  });

  it('zeigt die Fehlermeldung des Services an', async () => {
    const fixture = await setup(throwError(() => new Error('Serverfehler beim Upload.')));
    ausloesen(fixture, pngDatei());
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Serverfehler beim Upload.');
  });
});
