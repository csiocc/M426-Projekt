/** Ein hochgeladener Lieferschein, wie ihn das Backend spaeter zurueckgibt. */
export interface DeliveryNote {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

/** Grenzen absichtlich identisch zum Backend-Modell (DeliveryNote-Validierungen). */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = 'image/*,application/pdf';

/**
 * Prueft eine Datei gegen dieselben Regeln wie das Backend.
 * Gibt eine deutsche Fehlermeldung zurueck oder null, wenn die Datei in Ordnung ist.
 *
 * Das ist bewusst nur Komfort fuer die Nutzerin - die verbindliche Pruefung
 * passiert im Backend, weil Client-Validierung umgehbar ist.
 */
export function validateFile(file: File): string | null {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  if (!isImage && !isPdf) {
    return 'Nur Bilder oder PDF-Dateien sind erlaubt.';
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
