import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { DeliveryNoteService } from '../../services/delivery-note';
import {
  ACCEPTED_TYPES,
  JsonValue,
  MAX_FILE_SIZE_BYTES,
  formatBytes,
} from '../../models/delivery-note';

/** 'laedt' = Datei geht zum Server, 'analysiert' = Server hat sie, KI rechnet noch. */
type Status = 'bereit' | 'laedt' | 'analysiert' | 'fertig' | 'fehler';

@Component({
  imports: [ButtonModule, FileUploadModule, MessageModule, JsonPipe],
  selector: 'app-upload',
  styleUrl: './upload.css',
  templateUrl: './upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Upload {
  private readonly service = inject(DeliveryNoteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly acceptedTypes = ACCEPTED_TYPES;
  protected readonly maxFileSize = MAX_FILE_SIZE_BYTES;
  protected readonly formatBytes = formatBytes;

  protected readonly status = signal<Status>('bereit');
  protected readonly dateiname = signal<string | null>(null);
  protected readonly ergebnis = signal<JsonValue | null>(null);
  protected readonly fehler = signal<string | null>(null);

  /** Solange true, ist ein Upload unterwegs und ein zweiter wird abgewiesen. */
  protected readonly laeuft = computed(
    () => this.status() === 'laedt' || this.status() === 'analysiert',
  );

  /** Der laufende Upload, damit "Entfernen" ihn abbrechen kann. */
  private laufend: Subscription | null = null;

  /**
   * PrimeNG haengt nur an Bilder eine objectURL fuer die Vorschau. Fehlt sie,
   * ist es ein PDF und die Zeile zeigt stattdessen ein Icon.
   */
  protected vorschau(datei: File): SafeUrl | null {
    return (datei as File & { objectURL?: SafeUrl }).objectURL ?? null;
  }

  /**
   * Wird von p-fileupload im customUpload-Modus aufgerufen. PrimeNG laedt dann
   * nichts selbst hoch, sondern uebergibt uns die Dateien.
   */
  protected onUpload(event: FileUploadHandlerEvent): void {
    // Sperre gegen einen zweiten Klick auf "Hochladen": PrimeNG deaktiviert den
    // Knopf zwar rechnerisch ueber uploadedFileCount, das ist aber ein einfaches
    // Feld ohne Signal - das computed dahinter rechnet nicht neu und der Knopf
    // bleibt anklickbar. Ohne diese Zeile ginge dieselbe Datei zweimal raus.
    if (this.laeuft()) return;

    const file = event.files[0];
    if (!file) return;

    this.status.set('laedt');
    this.dateiname.set(file.name);
    this.ergebnis.set(null);
    this.fehler.set(null);

    this.laufend = this.service
      .upload(file)
      .pipe(
        // Ab hier liegt die Datei beim Server, wir warten nur noch auf die KI.
        tap(() => this.status.set('analysiert')),
        switchMap((id) => this.service.ergebnis(id)),
        // Beendet das Polling, wenn die Nutzerin die Seite verlaesst.
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.ergebnis.set(result);
          this.status.set('fertig');
        },
        error: (err: Error) => {
          this.fehler.set(err.message || 'Der Upload ist fehlgeschlagen.');
          this.status.set('fehler');
        },
      });
  }

  protected zuruecksetzen(uploader: FileUpload): void {
    // Bricht einen noch laufenden Upload ab, sonst schriebe dessen Antwort
    // spaeter ein Ergebnis in die frisch geleerte Oberflaeche.
    this.laufend?.unsubscribe();
    this.laufend = null;

    // PrimeNG zaehlt uploadedFileCount beim Hochladen hoch, setzt den Zaehler
    // beim Entfernen aber nicht zurueck. Zusammen mit fileLimit=1 bliebe
    // "Datei auswählen" danach dauerhaft gesperrt.
    uploader.uploadedFileCount = 0;
    // uploadedFileCount ist ein einfaches Feld. Das computed hinter dem Knopf
    // liest daneben nur das Signal _files, haengt also allein an der Dateiliste.
    // Erst diese Zuweisung stoesst die Neuberechnung an - sonst wirkte das
    // Zuruecksetzen nur zufaellig, weil onRemove/onClear die Liste ohnehin aendern.
    uploader.files = [];

    this.status.set('bereit');
    this.dateiname.set(null);
    this.ergebnis.set(null);
    this.fehler.set(null);
  }
}
