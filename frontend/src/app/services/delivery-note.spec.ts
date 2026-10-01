import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Lieferschein } from '../models/lieferschein';
import { AnalyseFehler, DeliveryNoteService, HttpDeliveryNoteService } from './delivery-note';

const pngDatei = () => new File(['x'], 'ls.png', { type: 'image/png' });

describe('HttpDeliveryNoteService', () => {
  let service: DeliveryNoteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DeliveryNoteService, useClass: HttpDeliveryNoteService },
      ],
    });
    service = TestBed.inject(DeliveryNoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('upload', () => {
    it('schickt die Datei als FormData-Feld "file" und gibt die id zurueck', async () => {
      const versprechen = firstValueFrom(service.upload(pngDatei()));

      const anfrage = http.expectOne('/api/delivery_notes');
      expect(anfrage.request.method).toBe('POST');
      expect((anfrage.request.body as FormData).get('file')).toBeInstanceOf(File);
      anfrage.flush({ id: 7 }, { status: 201, statusText: 'Created' });

      expect(await versprechen).toBe(7);
    });

    it('lehnt einen falschen Dateityp ohne Request ab', async () => {
      const datei = new File(['x'], 'ls.txt', { type: 'text/plain' });
      await expect(firstValueFrom(service.upload(datei))).rejects.toThrow('PNG, JPG');
      http.expectNone('/api/delivery_notes');
    });

    it('reicht die Fehlermeldungen einer 422-Antwort weiter', async () => {
      const versprechen = firstValueFrom(service.upload(pngDatei()));

      http
        .expectOne('/api/delivery_notes')
        .flush({ errors: ['Datei fehlt'] }, { status: 422, statusText: 'Unprocessable Content' });

      await expect(versprechen).rejects.toThrow('Datei fehlt');
    });
  });

  describe('ergebnis', () => {
    it('fragt nach, bis das Resultat da ist', async () => {
      vi.useFakeTimers();
      try {
        const gesehen: Lieferschein[] = [];
        service.ergebnis(7).subscribe((result) => gesehen.push(result));

        // Erster Versuch laeuft sofort, die KI ist aber noch nicht fertig.
        await vi.advanceTimersByTimeAsync(0);
        http.expectOne('/api/delivery_notes/7').flush({ id: 7, result: null });
        expect(gesehen).toEqual([]);

        // Zweiter Versuch nach dem Poll-Intervall liefert das Ergebnis.
        await vi.advanceTimersByTimeAsync(1500);
        http
          .expectOne('/api/delivery_notes/7')
          .flush({ id: 7, result: { kunde: { name: 'Muster AG' } } });

        expect(gesehen.map((l) => l.kunde.name)).toEqual(['Muster AG']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('bricht eine langsame Antwort nicht ab und fragt solange nicht nach', async () => {
      vi.useFakeTimers();
      try {
        const versprechen = firstValueFrom(service.ergebnis(7));

        await vi.advanceTimersByTimeAsync(0);
        const langsam = http.expectOne('/api/delivery_notes/7');

        // Der Server laesst sich mehr Zeit als ein Poll-Intervall. exhaustMap
        // ueberspringt den Takt, statt die laufende Anfrage abzubrechen.
        await vi.advanceTimersByTimeAsync(1500 * 3);
        http.expectNone('/api/delivery_notes/7');
        expect(langsam.cancelled).toBe(false);

        langsam.flush({ id: 7, result: { kunde: { name: 'Muster AG' } } });
        expect((await versprechen).kunde.name).toBe('Muster AG');
      } finally {
        vi.useRealTimers();
      }
    });

    it('macht aus result.fehler einen AnalyseFehler, obwohl das Backend 200 sendet', async () => {
      vi.useFakeTimers();
      try {
        const versprechen = firstValueFrom(service.ergebnis(7));

        await vi.advanceTimersByTimeAsync(0);
        http
          .expectOne('/api/delivery_notes/7')
          .flush({ id: 7, result: { fehler: 'Netzwerkfehler beim Aufruf der OpenAI-API' } });

        const fehler = await versprechen.catch((e: unknown) => e);
        expect(fehler).toBeInstanceOf(AnalyseFehler);
        expect((fehler as Error).message).toBe('Netzwerkfehler beim Aufruf der OpenAI-API');
      } finally {
        vi.useRealTimers();
      }
    });

    it('meldet die Fehlermeldung einer 404-Antwort', async () => {
      vi.useFakeTimers();
      try {
        const versprechen = firstValueFrom(service.ergebnis(0));

        // Der erste Versuch laeuft ueber timer(0, ...) und damit erst im naechsten Tick.
        await vi.advanceTimersByTimeAsync(0);
        http
          .expectOne('/api/delivery_notes/0')
          .flush(
            { error: 'Lieferschein nicht gefunden' },
            { status: 404, statusText: 'Not Found' },
          );

        await expect(versprechen).rejects.toThrow('Lieferschein nicht gefunden');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
