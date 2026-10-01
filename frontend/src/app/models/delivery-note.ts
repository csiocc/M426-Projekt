/** Beliebiger JSON-Wert - das KI-Resultat kommt als freies JSON aus dem Backend. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Ein Lieferschein, wie ihn `GET /api/delivery_notes/:id` zurueckgibt.
 * Mehr Felder liefert die API nicht - Dateiname und Groesse kennen wir nur lokal.
 */
export interface DeliveryNote {
  id: number;
  /** Das Analyse-Ergebnis. Bleibt null, solange die KI noch rechnet. */
  result: JsonValue | null;
}

/** Genau die Typen, die das Backend-Modell DeliveryNote akzeptiert. */
const ACCEPTED_TYPE_LIST = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
];

/** Fuer das accept-Attribut des Datei-Dialogs. */
export const ACCEPTED_TYPES = ACCEPTED_TYPE_LIST.join(',');

/** Grenze absichtlich identisch zum Backend-Modell. */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * Prueft eine Datei gegen dieselben Regeln wie das Backend.
 * Gibt eine deutsche Fehlermeldung zurueck oder null, wenn die Datei in Ordnung ist.
 *
 * Das ist bewusst nur Komfort fuer die Nutzerin - die verbindliche Pruefung
 * passiert im Backend, weil Client-Validierung umgehbar ist.
 */
export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPE_LIST.includes(file.type)) {
    return 'Erlaubt sind nur PNG, JPG, WebP, GIF oder PDF.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Die Datei darf hoechstens 20 MB gross sein.';
  }
  return null;
}

/** Formatiert eine Byte-Zahl fuer die Anzeige, z.B. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

type JsonObjekt = { [key: string]: JsonValue };

function istObjekt(wert: JsonValue | undefined): wert is JsonObjekt {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

function istLeer(wert: JsonValue | undefined): boolean {
  return wert === undefined || wert === null || (typeof wert === 'string' && wert.trim() === '');
}

/**
 * Der Job schreibt bei einem KI-Fehler `{"fehler": "..."}` als Resultat.
 * Gibt dann die Meldung zurueck, sonst null.
 */
export function fehlerAusAntwort(wert: JsonValue): string | null {
  if (istObjekt(wert) && typeof wert['fehler'] === 'string') return wert['fehler'];
  return null;
}

/** Prueft die Pflichtfelder einer Adresse und haengt fehlende an die Hinweise an. */
function pruefeAdresse(
  adresse: JsonValue | undefined,
  pfad: string,
  felder: string[],
  hinweise: string[],
): void {
  if (!istObjekt(adresse)) {
    hinweise.push(`${pfad} fehlt`);
    return;
  }
  for (const feld of felder) {
    if (istLeer(adresse[feld])) hinweise.push(`${pfad}.${feld} fehlt`);
  }
}

/** true, wenn der Text ein echtes Kalenderdatum im Format YYYY-MM-DD ist. */
function istGueltigesDatum(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const datum = new Date(`${text}T00:00:00Z`);
  // new Date rollt 2026-02-30 still auf den 2. Maerz - darum zurueckvergleichen.
  return !isNaN(datum.getTime()) && datum.toISOString().startsWith(text);
}

/**
 * Sucht im (evtl. von Hand bearbeiteten) Lieferschein-JSON nach fehlenden oder
 * fehlerhaften Angaben. Die Felder entsprechen dem Schema in
 * app/services/lieferschein_extractor/schema.rb. Gibt eine Liste lesbarer
 * Hinweise zurueck, leer heisst: alle Pflichtangaben vorhanden.
 */
export function pruefeLieferschein(daten: JsonValue): string[] {
  if (!istObjekt(daten)) return ['Das JSON muss ein Objekt sein.'];

  const hinweise: string[] = [];

  const kunde = daten['kunde'];
  if (!istObjekt(kunde)) {
    hinweise.push('kunde fehlt');
  } else {
    if (istLeer(kunde['name'])) hinweise.push('kunde.name fehlt');
    pruefeAdresse(kunde['adresse'], 'kunde.adresse', ['strasse', 'plz', 'ort'], hinweise);
  }

  pruefeAdresse(
    daten['lieferadresse'],
    'lieferadresse',
    ['name', 'strasse', 'plz', 'ort'],
    hinweise,
  );

  const lieferdatum = daten['lieferdatum'];
  if (istLeer(lieferdatum)) {
    hinweise.push('lieferdatum fehlt');
  } else if (typeof lieferdatum !== 'string' || !istGueltigesDatum(lieferdatum)) {
    hinweise.push('lieferdatum ist kein gültiges Datum (YYYY-MM-DD)');
  }

  const positionen = daten['positionen'];
  if (!Array.isArray(positionen) || positionen.length === 0) {
    hinweise.push('positionen: keine Artikel erkannt');
  } else {
    positionen.forEach((position, i) => {
      const pfad = `positionen[${i}]`;
      if (!istObjekt(position)) {
        hinweise.push(`${pfad} ist kein Objekt`);
        return;
      }
      if (istLeer(position['bezeichnung'])) hinweise.push(`${pfad}.bezeichnung fehlt`);
      const menge = position['menge'];
      if (istLeer(menge)) {
        hinweise.push(`${pfad}.menge fehlt`);
      } else if (typeof menge !== 'number' || menge <= 0) {
        hinweise.push(`${pfad}.menge muss eine Zahl grösser 0 sein`);
      }
    });
  }

  // Unsicherheiten, die die KI selbst gemeldet hat.
  const warnungen = daten['warnungen'];
  if (Array.isArray(warnungen)) {
    for (const warnung of warnungen) {
      if (typeof warnung === 'string' && warnung.trim()) hinweise.push(`KI-Warnung: ${warnung}`);
    }
  }

  return hinweise;
}
