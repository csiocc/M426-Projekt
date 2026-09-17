import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, first, map, switchMap, take, throwError, timer } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DeliveryNote, JsonValue, validateFile } from '../models/delivery-note';

/** Basis-Pfad der Rails-API. Der Angular-Dev-Proxy leitet /api an localhost:3000 weiter. */
const API_URL = '/api/delivery_notes';

/** Abstand zwischen zwei Nachfragen, solange die KI noch rechnet. */
const POLL_INTERVAL_MS = 1500;

/** Obergrenze, damit nicht endlos gepollt wird. */
const POLL_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Schnittstelle zum Backend.
 *
 * Bewusst als abstrakte Klasse: die Komponenten haengen nur hiervon ab und
 * koennen im Test gegen eine Attrappe getauscht werden.
 *
 * autoProvided: false, weil eine abstrakte Klasse nicht instanziiert werden
 * kann - sie dient nur als Token und wird in app.config.ts zugewiesen.
 */
@Service({ autoProvided: false })
export abstract class DeliveryNoteService {
  /** Laedt die Datei hoch und liefert die id des angelegten Lieferscheins. */
  abstract upload(file: File): Observable<number>;

  /** Fragt nach, bis das Analyse-Ergebnis vorliegt, und gibt es dann zurueck. */
  abstract ergebnis(id: number): Observable<JsonValue>;
}

@Service({ autoProvided: false })
export class HttpDeliveryNoteService extends DeliveryNoteService {
  private readonly http = inject(HttpClient);

  upload(file: File): Observable<number> {
    // Erspart einen sinnlosen Request, wenn die Datei ohnehin abgelehnt wuerde.
    const problem = validateFile(file);
    if (problem) {
      return throwError(() => new Error(problem));
    }

    // Feldname "file", weil der Controller params[:file] liest.
    const formular = new FormData();
    formular.append('file', file);

    return this.http.post<{ id: number }>(API_URL, formular).pipe(
      map((antwort) => antwort.id),
      catchError((fehler) => throwError(() => new Error(fehlermeldung(fehler)))),
    );
  }

  /**
   * Die API legt den Lieferschein sofort an, das Ergebnis der KI kommt aber
   * erst spaeter. Bis dahin liefert GET `result: null` - also fragen wir im
   * Takt nach und geben den ersten Treffer zurueck.
   */
  ergebnis(id: number): Observable<JsonValue> {
    const maxVersuche = Math.ceil(POLL_TIMEOUT_MS / POLL_INTERVAL_MS);

    return timer(0, POLL_INTERVAL_MS).pipe(
      take(maxVersuche),
      switchMap(() => this.http.get<DeliveryNote>(`${API_URL}/${id}`)),
      // Laeuft take() ab, bevor ein Ergebnis da ist, wirft first() - das ist
      // unser Timeout und landet unten im catchError.
      first((note) => note.result !== null),
      map((note) => note.result as JsonValue),
      catchError((fehler) =>
        throwError(
          () =>
            new Error(
              fehler instanceof HttpErrorResponse
                ? fehlermeldung(fehler)
                : 'Die Analyse dauert ungewöhnlich lange. Bitte später erneut versuchen.',
            ),
        ),
      ),
    );
  }
}

/** Uebersetzt eine Fehlerantwort der API in einen Satz fuer die Nutzerin. */
function fehlermeldung(fehler: unknown): string {
  if (!(fehler instanceof HttpErrorResponse)) {
    return 'Unerwarteter Fehler.';
  }
  if (fehler.status === 0) {
    return 'Der Server ist nicht erreichbar.';
  }

  // 422 liefert { errors: [...] }, 404 liefert { error: "..." }.
  const rumpf = fehler.error as { errors?: string[]; error?: string } | null;
  if (rumpf?.errors?.length) {
    return rumpf.errors.join(' ');
  }
  if (rumpf?.error) {
    return rumpf.error;
  }
  return `Der Server hat mit Status ${fehler.status} geantwortet.`;
}
