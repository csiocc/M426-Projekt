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

/**
 * Der Job schreibt bei einem KI-Fehler `{"fehler": "..."}` als Resultat.
 * Gibt dann die Meldung zurueck, sonst null.
 */
export function fehlerAusAntwort(wert: JsonValue): string | null {
  if (istObjekt(wert) && typeof wert['fehler'] === 'string') return wert['fehler'];
  return null;
}

/** Eine Adresse, wie sie das Schema in app/services/lieferschein_extractor/schema.rb definiert. */
export interface Adresse {
  name: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
}

export interface Position {
  position: number | null;
  artikelnummer: string | null;
  bezeichnung: string;
  menge: number | null;
  einheit: string | null;
}

/** Ein erkannter Lieferschein - genau die Felder des Backend-Schemas. */
export interface Lieferschein {
  kunde: { name: string | null; kundennummer: string | null; adresse: Adresse };
  lieferadresse: Adresse;
  lieferdatum: string | null;
  lieferschein_nummer: string | null;
  bestellnummer: string | null;
  positionen: Position[];
  warnungen: string[];
}

function alsText(wert: JsonValue | undefined): string | null {
  if (typeof wert === 'string') return wert;
  if (typeof wert === 'number') return String(wert);
  return null;
}

function alsZahl(wert: JsonValue | undefined): number | null {
  if (typeof wert === 'number') return wert;
  if (typeof wert === 'string' && wert.trim() !== '' && !isNaN(Number(wert))) return Number(wert);
  return null;
}

function alsAdresse(wert: JsonValue | undefined): Adresse {
  const a = istObjekt(wert) ? wert : {};
  return {
    name: alsText(a['name']),
    strasse: alsText(a['strasse']),
    plz: alsText(a['plz']),
    ort: alsText(a['ort']),
    land: alsText(a['land']),
  };
}

/**
 * Bringt das KI-Resultat in die feste Form, die das Formular bearbeitet.
 * Fehlende Teile werden mit null bzw. leeren Listen aufgefuellt, damit das
 * Formular nie an einem undefined haengen bleibt.
 */
export function normalisiere(daten: JsonValue): Lieferschein {
  const d = istObjekt(daten) ? daten : {};
  const kunde = istObjekt(d['kunde']) ? d['kunde'] : {};
  const positionen = Array.isArray(d['positionen']) ? d['positionen'] : [];
  const warnungen = Array.isArray(d['warnungen']) ? d['warnungen'] : [];
  return {
    kunde: {
      name: alsText(kunde['name']),
      kundennummer: alsText(kunde['kundennummer']),
      adresse: alsAdresse(kunde['adresse']),
    },
    lieferadresse: alsAdresse(d['lieferadresse']),
    lieferdatum: alsText(d['lieferdatum']),
    lieferschein_nummer: alsText(d['lieferschein_nummer']),
    bestellnummer: alsText(d['bestellnummer']),
    positionen: positionen.map((p) => {
      const pos = istObjekt(p) ? p : {};
      return {
        position: alsZahl(pos['position']),
        artikelnummer: alsText(pos['artikelnummer']),
        bezeichnung: alsText(pos['bezeichnung']) ?? '',
        menge: alsZahl(pos['menge']),
        einheit: alsText(pos['einheit']),
      };
    }),
    warnungen: warnungen.filter((w): w is string => typeof w === 'string' && w.trim() !== ''),
  };
}

/** Bereiche in der Reihenfolge, in der die Vorschau die Fehler auflistet. */
export const BEREICHE = ['Kunde', 'Lieferadresse', 'Lieferdatum', 'Artikel'] as const;
export type Bereich = (typeof BEREICHE)[number];

/** Ein fehlender oder fehlerhafter Wert, in Worten fuer die Mitarbeiterin. */
export interface Hinweis {
  /** Welches Formularfeld betroffen ist, z.B. "kunde.name" oder "positionen.1.menge". */
  feld: string;
  bereich: Bereich;
  text: string;
}

/** Anzeigenamen der Adressfelder. */
export const ADRESSFELDER: Record<keyof Adresse, string> = {
  name: 'Name',
  strasse: 'Strasse',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
};

function leer(wert: string | null): boolean {
  return wert === null || wert.trim() === '';
}

/** true, wenn der Text ein echtes Kalenderdatum im Format YYYY-MM-DD ist. */
function istGueltigesDatum(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const datum = new Date(`${text}T00:00:00Z`);
  // new Date rollt 2026-02-30 still auf den 2. Maerz - darum zurueckvergleichen.
  return !isNaN(datum.getTime()) && datum.toISOString().startsWith(text);
}

/**
 * Sucht fehlende oder fehlerhafte Pflichtangaben. Die Warnungen der KI zaehlen
 * bewusst nicht dazu - sie sind Vermutungen und werden getrennt angezeigt.
 * Leere Liste heisst: alle Pflichtangaben vorhanden.
 */
export function pruefeLieferschein(daten: Lieferschein): Hinweis[] {
  const hinweise: Hinweis[] = [];

  if (leer(daten.kunde.name)) {
    hinweise.push({ feld: 'kunde.name', bereich: 'Kunde', text: 'Name fehlt' });
  }
  for (const feld of ['strasse', 'plz', 'ort'] as const) {
    if (leer(daten.kunde.adresse[feld])) {
      const text = `${ADRESSFELDER[feld]} fehlt`;
      hinweise.push({ feld: `kunde.adresse.${feld}`, bereich: 'Kunde', text });
    }
  }

  for (const feld of ['name', 'strasse', 'plz', 'ort'] as const) {
    if (leer(daten.lieferadresse[feld])) {
      const text = `${ADRESSFELDER[feld]} fehlt`;
      hinweise.push({ feld: `lieferadresse.${feld}`, bereich: 'Lieferadresse', text });
    }
  }

  const lieferdatum = daten.lieferdatum;
  if (lieferdatum === null || leer(lieferdatum)) {
    hinweise.push({ feld: 'lieferdatum', bereich: 'Lieferdatum', text: 'Lieferdatum fehlt' });
  } else if (!istGueltigesDatum(lieferdatum)) {
    hinweise.push({
      feld: 'lieferdatum',
      bereich: 'Lieferdatum',
      text: `„${lieferdatum}“ ist kein gültiges Datum`,
    });
  }

  if (daten.positionen.length === 0) {
    hinweise.push({ feld: 'positionen', bereich: 'Artikel', text: 'Keine Artikel erkannt' });
  }
  daten.positionen.forEach((position, i) => {
    // Nummer wie auf dem Lieferschein; ohne erkannte Nummer ab 1 gezaehlt.
    const nummer = `Position ${position.position ?? i + 1}`;
    const titel = leer(position.bezeichnung)
      ? nummer
      : `${nummer} (${position.bezeichnung.trim()})`;
    if (leer(position.bezeichnung)) {
      const text = `${nummer}: Bezeichnung fehlt`;
      hinweise.push({ feld: `positionen.${i}.bezeichnung`, bereich: 'Artikel', text });
    }
    if (position.menge === null) {
      const text = `${titel}: Menge fehlt`;
      hinweise.push({ feld: `positionen.${i}.menge`, bereich: 'Artikel', text });
    } else if (position.menge <= 0) {
      const text = `${titel}: Menge muss grösser 0 sein`;
      hinweise.push({ feld: `positionen.${i}.menge`, bereich: 'Artikel', text });
    }
  });

  return hinweise;
}

/** Fasst Hinweise nach Bereich zusammen, in der festen Reihenfolge von BEREICHE. */
export function gruppiereHinweise(
  hinweise: Hinweis[],
): { bereich: Bereich; hinweise: Hinweis[] }[] {
  return BEREICHE.map((bereich) => ({
    bereich,
    hinweise: hinweise.filter((h) => h.bereich === bereich),
  })).filter((gruppe) => gruppe.hinweise.length > 0);
}
