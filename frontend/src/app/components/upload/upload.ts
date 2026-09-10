import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { DeliveryNoteService } from '../../services/delivery-note';
import {
  ACCEPTED_TYPES,
  DeliveryNote,
  MAX_FILE_SIZE_BYTES,
  formatBytes,
} from '../../models/delivery-note';

type Status = 'bereit' | 'laedt' | 'fertig' | 'fehler';

@Component({
  imports: [FileUploadModule, MessageModule],
  selector: 'app-upload',
  styleUrl: './upload.css',
  templateUrl: './upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Upload {
  private readonly service = inject(DeliveryNoteService);

  protected readonly acceptedTypes = ACCEPTED_TYPES;
  protected readonly maxFileSize = MAX_FILE_SIZE_BYTES;
  protected readonly formatBytes = formatBytes;

  protected readonly status = signal<Status>('bereit');
  protected readonly note = signal<DeliveryNote | null>(null);
  protected readonly fehler = signal<string | null>(null);

  /**
   * Wird von p-fileupload im customUpload-Modus aufgerufen. PrimeNG laedt dann
   * nichts selbst hoch, sondern uebergibt uns die Dateien.
   */
  protected onUpload(event: FileUploadHandlerEvent): void {
    const file = event.files[0];
    if (!file) return;

    this.status.set('laedt');
    this.fehler.set(null);
    this.note.set(null);

    this.service.upload(file).subscribe({
      next: (note) => {
        this.note.set(note);
        this.status.set('fertig');
      },
      error: (err: Error) => {
        this.fehler.set(err.message || 'Der Upload ist fehlgeschlagen.');
        this.status.set('fehler');
      },
    });
  }

  protected zuruecksetzen(): void {
    this.status.set('bereit');
    this.note.set(null);
    this.fehler.set(null);
  }
}
