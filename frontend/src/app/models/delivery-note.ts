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
