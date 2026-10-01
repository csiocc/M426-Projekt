import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * navpanes=0 blendet im PDF-Viewer des Browsers die Seitenleiste aus,
 * view=FitH passt die Seite an die Breite an.
 */
const PDF_ANZEIGE = '#navpanes=0&view=FitH';

/** Zeigt die hochgeladene Originaldatei an: PDF im Browser-Viewer, Bilder als img. */
@Component({
  selector: 'app-datei-vorschau',
  templateUrl: './datei-vorschau.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class DateiVorschau {
  private readonly sanitizer = inject(DomSanitizer);

  readonly datei = input.required<File>();

  protected readonly istPdf = computed(() => this.datei().type === 'application/pdf');

  /** Eine Object-URL pro Datei; das effect unten gibt sie wieder frei. */
  private readonly objectUrl = computed(() => URL.createObjectURL(this.datei()));

  protected readonly url = computed(() => {
    const url = this.istPdf() ? this.objectUrl() + PDF_ANZEIGE : this.objectUrl();
    // blob:-URLs der eigenen Seite sind unbedenklich, Angular verlangt fuer
    // iframe-src aber trotzdem eine ausdrueckliche Freigabe.
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    // Gibt die Datei frei, wenn eine neue kommt oder die Vorschau verschwindet -
    // sonst bliebe sie bis zum Neuladen der Seite im Speicher.
    effect((onCleanup) => {
      const url = this.objectUrl();
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }
}
