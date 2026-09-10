import { Service } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DeliveryNote, validateFile } from '../models/delivery-note';

/**
 * Schnittstelle zum Backend.
 *
 * Bewusst als abstrakte Klasse: die Komponenten haengen nur hiervon ab.
 * Sobald die Rails-API steht, wird in app.config.ts lediglich eine andere
 * Implementierung eingetragen - an den Komponenten aendert sich nichts.
 *
 * autoProvided: false, weil eine abstrakte Klasse nicht instanziiert werden
 * kann - sie dient nur als Token und wird in app.config.ts zugewiesen.
 */
@Service({ autoProvided: false })
export abstract class DeliveryNoteService {
  abstract upload(file: File): Observable<DeliveryNote>;
}

/**
 * Platzhalter, solange es kein Backend gibt: nimmt die Datei entgegen,
 * simuliert Netzwerklatenz und gibt einen erfundenen Datensatz zurueck.
 */
@Service({ autoProvided: false })
export class MockDeliveryNoteService extends DeliveryNoteService {
  upload(file: File): Observable<DeliveryNote> {
    const problem = validateFile(file);
    if (problem) {
      return throwError(() => new Error(problem)).pipe(delay(300));
    }

    const note: DeliveryNote = {
      id: crypto.randomUUID(),
      filename: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date(),
    };
    return of(note).pipe(delay(800));
  }
}
