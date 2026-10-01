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
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { DeliveryNoteService } from '../../services/delivery-note';
import {
  ACCEPTED_TYPES,
  ADRESSFELDER,
  Adresse,
  JsonValue,
  Lieferschein,
  MAX_FILE_SIZE_BYTES,
  Position,
  fehlerAusAntwort,
  formatBytes,
  gruppiereHinweise,
  normalisiere,
  pruefeLieferschein,
} from '../../models/delivery-note';

/** 'laedt' = Datei geht zum Server, 'analysiert' = Server hat sie, KI rechnet noch. */
type Status = 'bereit' | 'laedt' | 'analysiert' | 'fertig' | 'fehler';

/** Rechte Seite: bearbeitbares Formular oder Vorschau der JSON-Ausgabe. */
type Ansicht = 'formular' | 'json';

type Kopffeld = 'lieferdatum' | 'lieferschein_nummer' | 'bestellnummer';

/** Leeres Eingabefeld heisst "nicht vorhanden" - so wie die KI es mit null meldet. */
function textAus(event: Event): string | null {
  const wert = (event.target as HTMLInputElement).value;
  return wert === '' ? null : wert;
}

/** Rohe API-Antworten koennen den ganzen JSON-Body enthalten - fuer die Anzeige kuerzen. */
const MAX_FEHLER_LAENGE = 300;
function kuerzen(text: string): string {
  return text.length > MAX_FEHLER_LAENGE ? `${text.slice(0, MAX_FEHLER_LAENGE)} …` : text;
}

function zahlAus(event: Event): number | null {
  const wert = (event.target as HTMLInputElement).value;
  return wert === '' || isNaN(Number(wert)) ? null : Number(wert);
}

@Component({
  imports: [
    ButtonModule,
    FileUploadModule,
    InputTextModule,
    MessageModule,
    TagModule,
    TextareaModule,
  ],
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
  protected readonly kundenAdressfelder: (keyof Adresse)[] = ['strasse', 'plz', 'ort', 'land'];
  protected readonly lieferAdressfelder: (keyof Adresse)[] = [
    'name',
    'strasse',
    'plz',
    'ort',
    'land',
  ];
  protected readonly adressfelder = ADRESSFELDER;

  protected readonly status = signal<Status>('bereit');
  protected readonly dateiname = signal<string | null>(null);
  /** Das Resultat der KI, unveraendert - Grundlage fuer "wiederherstellen". */
  protected readonly ergebnis = signal<Lieferschein | null>(null);
  /** Technisches Detail zum Fehler - bei rohen API-Antworten gekuerzt. */
  protected readonly fehler = signal<string | null>(null);
  /** Verstaendliche Ueberschrift ueber dem Detail. */
  protected readonly fehlerTitel = signal('');

  /** Die hochgeladene Datei, links in der Vorschau angezeigt. */
  protected readonly datei = signal<File | null>(null);
  protected readonly dateiUrl = signal<SafeResourceUrl | null>(null);
  protected readonly istPdf = computed(() => this.datei()?.type === 'application/pdf');
  /** Rohe Object-URL, damit sie beim Zuruecksetzen wieder freigegeben werden kann. */
  private objectUrl: string | null = null;

  /** Die Daten im Formular - die Nutzerin korrigiert sie hier vor dem Export. */
  protected readonly daten = signal<Lieferschein | null>(null);
  protected readonly ansicht = signal<Ansicht>('formular');
  /** Beide Listen starten zugeklappt: die Fehler stehen schon an den Feldern,
   *  die KI-Hinweise sind nur Zusatzinfo. Die Badges oben zeigen die Anzahl. */
  protected readonly fehlerOffen = signal(false);
  protected readonly kiOffen = signal(false);

  protected readonly jsonAusgabe = computed(() => {
    const daten = this.daten();
    return daten ? JSON.stringify(daten, null, 2) : '';
  });
  /**
   * Was gerade im JSON-Tab getippt wird. Solange null, zeigt der Tab die
   * aktuelle Ausgabe. Der Entwurf bleibt stehen, auch wenn er (noch) kein
   * gueltiges JSON ist - sonst wuerde der Text beim Tippen ueberschrieben.
   */
  private readonly jsonEntwurf = signal<string | null>(null);
  protected readonly jsonText = computed(() => this.jsonEntwurf() ?? this.jsonAusgabe());
  /** Parser-Meldung, wenn der Entwurf kein gueltiges JSON ist. */
  protected readonly jsonFehler = signal<string | null>(null);
  protected readonly geaendert = computed(() => {
    const original = this.ergebnis();
    return original !== null && this.jsonAusgabe() !== JSON.stringify(original, null, 2);
  });
  /** Fehlende oder fehlerhafte Pflichtangaben im aktuellen Formular. */
  protected readonly hinweise = computed(() => {
    const daten = this.daten();
    return daten ? pruefeLieferschein(daten) : [];
  });
  protected readonly hinweisGruppen = computed(() => gruppiereHinweise(this.hinweise()));
  /** Feld -> Fehlertext, damit das Formular betroffene Felder markieren kann. */
  protected readonly feldFehler = computed(
    () => new Map(this.hinweise().map((h) => [h.feld, h.text])),
  );
  /** Unsicherheiten, die die KI selbst gemeldet hat - getrennt von den Fehlern. */
  protected readonly kiHinweise = computed(() => this.daten()?.warnungen ?? []);

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
    this.daten.set(null);
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
        next: (result: JsonValue) => {
          // Scheitert die KI, schreibt der Job {"fehler": "..."} als Resultat.
          const fehler = fehlerAusAntwort(result);
          // Das Backend antwortet dabei mit 200 - der Fehler steckt nur im Inhalt.
          if (fehler !== null) {
            this.fehlerTitel.set('Die KI konnte den Lieferschein nicht auslesen.');
            this.fehler.set(kuerzen(fehler));
            this.status.set('fehler');
            return;
          }
          const lieferschein = normalisiere(result);
          this.ergebnis.set(lieferschein);
          this.daten.set(structuredClone(lieferschein));
          this.zeigeAnsicht('formular');
          this.fehlerOffen.set(false);
          this.kiOffen.set(false);
          this.status.set('fertig');
        },
        error: (err: Error) => {
          this.fehlerTitel.set('Der Lieferschein konnte nicht verarbeitet werden.');
          this.fehler.set(kuerzen(err.message || 'Der Upload ist fehlgeschlagen.'));
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
    this.daten.set(null);
    this.jsonEntwurf.set(null);
    this.jsonFehler.set(null);
    this.fehler.set(null);
    this.dateiFreigeben();
  }

  /** Verwirft alle Aenderungen (Formular und JSON) und zeigt wieder das Ergebnis der KI. */
  protected wiederherstellen(): void {
    const original = this.ergebnis();
    if (original === null) return;
    this.daten.set(structuredClone(original));
    this.jsonEntwurf.set(null);
    this.jsonFehler.set(null);
  }

  /**
   * Wechselt zwischen Formular und JSON. Ein ungueltiger JSON-Entwurf wird dabei
   * verworfen - das Formular zeigt ohnehin den letzten gueltigen Stand.
   */
  protected zeigeAnsicht(ansicht: Ansicht): void {
    this.jsonEntwurf.set(null);
    this.jsonFehler.set(null);
    this.ansicht.set(ansicht);
  }

  /**
   * Bearbeitung im JSON-Tab. Jeder gueltige Stand geht sofort ins Formular
   * (inkl. Pruefung und Markierungen). Ungueltiges JSON wird nur gemeldet.
   */
  protected onJsonEingabe(event: Event): void {
    const text = (event.target as HTMLTextAreaElement).value;
    this.jsonEntwurf.set(text);
    try {
      this.daten.set(normalisiere(JSON.parse(text) as JsonValue));
      this.jsonFehler.set(null);
    } catch (e) {
      this.jsonFehler.set((e as Error).message);
    }
  }

  /** Springt aus der Fehlerliste zum betroffenen Feld. */
  protected zumFeld(feld: string): void {
    const warJson = this.ansicht() === 'json';
    this.zeigeAnsicht('formular');
    const fokus = () => document.getElementById(`feld-${feld}`)?.focus();
    // Kommt man aus dem JSON-Tab, existiert das Feld erst nach dem naechsten Rendern.
    if (warJson) setTimeout(fokus);
    else fokus();
  }

  protected setzeKunde(feld: 'name' | 'kundennummer', event: Event): void {
    this.aendern((d) => (d.kunde[feld] = textAus(event)));
  }

  protected setzeAdresse(ziel: 'kunde' | 'lieferadresse', feld: keyof Adresse, event: Event): void {
    this.aendern((d) => {
      const adresse = ziel === 'kunde' ? d.kunde.adresse : d.lieferadresse;
      adresse[feld] = textAus(event);
    });
  }

  protected setzeKopf(feld: Kopffeld, event: Event): void {
    this.aendern((d) => (d[feld] = textAus(event)));
  }

  protected setzeText(
    index: number,
    feld: 'artikelnummer' | 'bezeichnung' | 'einheit',
    event: Event,
  ): void {
    this.aendern((d) => {
      const wert = textAus(event);
      if (feld === 'bezeichnung') d.positionen[index].bezeichnung = wert ?? '';
      else d.positionen[index][feld] = wert;
    });
  }

  protected setzeMenge(index: number, event: Event): void {
    this.aendern((d) => (d.positionen[index].menge = zahlAus(event)));
  }

  protected positionHinzufuegen(): void {
    this.aendern((d) => {
      const hoechste = Math.max(0, ...d.positionen.map((p) => p.position ?? 0));
      const neu: Position = {
        position: hoechste + 1,
        artikelnummer: null,
        bezeichnung: '',
        menge: null,
        einheit: null,
      };
      d.positionen.push(neu);
    });
  }

  protected positionEntfernen(index: number): void {
    this.aendern((d) => d.positionen.splice(index, 1));
  }

  /** Aendert eine Kopie der Daten - so loest das Signal sicher eine Neuberechnung aus. */
  private aendern(aenderung: (daten: Lieferschein) => unknown): void {
    const daten = this.daten();
    if (!daten) return;
    const kopie = structuredClone(daten);
    aenderung(kopie);
    this.daten.set(kopie);
  }

  private dateiAnzeigen(file: File): void {
    this.dateiFreigeben();
    this.objectUrl = URL.createObjectURL(file);
    this.datei.set(file);
    // navpanes=0 blendet im PDF-Viewer des Browsers die Seitenleiste aus,
    // view=FitH passt die Seite an die Breite an. Betrifft nur den PDF-Viewer.
    const url =
      file.type === 'application/pdf' ? `${this.objectUrl}#navpanes=0&view=FitH` : this.objectUrl;
    // blob:-URLs der eigenen Seite sind unbedenklich, Angular verlangt fuer
    // iframe-src aber trotzdem eine ausdrueckliche Freigabe.
    this.dateiUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  /** Gibt die Object-URL frei, sonst bliebe die Datei bis zum Neuladen im Speicher. */
  private dateiFreigeben(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.datei.set(null);
    this.dateiUrl.set(null);
  }
}
