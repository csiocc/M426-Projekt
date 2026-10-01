import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { DeliveryNoteService } from '../../services/delivery-note';
import {
  ACCEPTED_TYPES,
  JsonValue,
  MAX_FILE_SIZE_BYTES,
  fehlerAusAntwort,
  formatBytes,
  pruefeLieferschein,
} from '../../models/delivery-note';

/** 'laedt' = Datei geht zum Server, 'analysiert' = Server hat sie, KI rechnet noch. */
type Status = 'bereit' | 'laedt' | 'analysiert' | 'fertig' | 'fehler';

/** Ergebnis von JSON.parse auf den Text im Editor. */
type Geparst = { ok: true; wert: JsonValue } | { ok: false; meldung: string };

/** Einheitliche Einrueckung, damit "wiederherstellen" exakt den Originaltext trifft. */
const alsText = (wert: JsonValue) => JSON.stringify(wert, null, 2);

@Component({
  imports: [ButtonModule, FileUploadModule, MessageModule, TextareaModule],
  selector: 'app-upload',
  styleUrl: './upload.css',
  templateUrl: './upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Upload {
  private readonly service = inject(DeliveryNoteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly acceptedTypes = ACCEPTED_TYPES;
  protected readonly maxFileSize = MAX_FILE_SIZE_BYTES;
  protected readonly formatBytes = formatBytes;

  protected readonly status = signal<Status>('bereit');
  protected readonly dateiname = signal<string | null>(null);
  protected readonly ergebnis = signal<JsonValue | null>(null);
  protected readonly fehler = signal<string | null>(null);

  /** Die hochgeladene Datei, links in der Vorschau angezeigt. */
  protected readonly datei = signal<File | null>(null);
  protected readonly dateiUrl = signal<SafeResourceUrl | null>(null);
  protected readonly istPdf = computed(() => this.datei()?.type === 'application/pdf');
  /** Rohe Object-URL, damit sie beim Zuruecksetzen wieder freigegeben werden kann. */
  private objectUrl: string | null = null;

  /** Inhalt des JSON-Editors rechts - die Nutzerin darf ihn frei bearbeiten. */
  protected readonly jsonText = signal('');
  protected readonly geaendert = computed(() => {
    const original = this.ergebnis();
    return original !== null && this.jsonText() !== alsText(original);
  });
  protected readonly geparst = computed<Geparst>(() => {
    try {
      return { ok: true, wert: JSON.parse(this.jsonText()) as JsonValue };
    } catch (e) {
      return { ok: false, meldung: (e as Error).message };
    }
  });
  /** Fehlende oder fehlerhafte Angaben im aktuellen Editor-Inhalt. */
  protected readonly hinweise = computed(() => {
    const geparst = this.geparst();
    return geparst.ok ? pruefeLieferschein(geparst.wert) : [];
  });

  /** Solange true, ist ein Upload unterwegs und ein zweiter wird abgewiesen. */
  protected readonly laeuft = computed(
    () => this.status() === 'laedt' || this.status() === 'analysiert',
  );

  /** Der laufende Upload, damit "Entfernen" ihn abbrechen kann. */
  private laufend: Subscription | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dateiFreigeben());
  }

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
    this.jsonText.set('');
    this.fehler.set(null);
    this.dateiAnzeigen(file);

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
          // Scheitert die KI, schreibt der Job {"fehler": "..."} als Resultat.
          const fehler = fehlerAusAntwort(result);
          if (fehler !== null) {
            this.fehler.set(fehler);
            this.status.set('fehler');
            return;
          }
          this.ergebnis.set(result);
          this.jsonText.set(alsText(result));
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
    this.jsonText.set('');
    this.fehler.set(null);
    this.dateiFreigeben();
  }

  protected onJsonEingabe(event: Event): void {
    this.jsonText.set((event.target as HTMLTextAreaElement).value);
  }

  /** Verwirft alle Aenderungen im Editor und zeigt wieder das Ergebnis der KI. */
  protected wiederherstellen(): void {
    const original = this.ergebnis();
    if (original !== null) this.jsonText.set(alsText(original));
  }

  private dateiAnzeigen(file: File): void {
    this.dateiFreigeben();
    this.objectUrl = URL.createObjectURL(file);
    this.datei.set(file);
    // blob:-URLs der eigenen Seite sind unbedenklich, Angular verlangt fuer
    // iframe-src aber trotzdem eine ausdrueckliche Freigabe.
    this.dateiUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
  }

  /** Gibt die Object-URL frei, sonst bliebe die Datei bis zum Neuladen im Speicher. */
  private dateiFreigeben(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.datei.set(null);
    this.dateiUrl.set(null);
  }
}
