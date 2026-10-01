import { JsonValue, istJsonObjekt } from './delivery-note';

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

/** Anzeigenamen der Adressfelder. */
export const ADRESSFELDER: Record<keyof Adresse, string> = {
  name: 'Name',
  strasse: 'Strasse',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
};

// ---------------------------------------------------------------------------
// Normalisieren: freies KI-JSON -> fester Lieferschein
// ---------------------------------------------------------------------------

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
  const adresse = istJsonObjekt(wert) ? wert : {};
  return {
    name: alsText(adresse['name']),
    strasse: alsText(adresse['strasse']),
    plz: alsText(adresse['plz']),
    ort: alsText(adresse['ort']),
    land: alsText(adresse['land']),
  };
}

function alsPosition(wert: JsonValue): Position {
  const position = istJsonObjekt(wert) ? wert : {};
  return {
    position: alsZahl(position['position']),
    artikelnummer: alsText(position['artikelnummer']),
    bezeichnung: alsText(position['bezeichnung']) ?? '',
    menge: alsZahl(position['menge']),
    einheit: alsText(position['einheit']),
  };
}

function alsListe(wert: JsonValue | undefined): JsonValue[] {
  return Array.isArray(wert) ? wert : [];
}

/**
 * Bringt das KI-Resultat in die feste Form, die das Formular bearbeitet.
 * Fehlende Teile werden mit null bzw. leeren Listen aufgefuellt, damit das
 * Formular nie an einem undefined haengen bleibt. Unbekannte Felder fallen weg.
 */
export function normalisiere(daten: JsonValue): Lieferschein {
  const lieferschein = istJsonObjekt(daten) ? daten : {};
  const kunde = istJsonObjekt(lieferschein['kunde']) ? lieferschein['kunde'] : {};
  return {
    kunde: {
      name: alsText(kunde['name']),
      kundennummer: alsText(kunde['kundennummer']),
      adresse: alsAdresse(kunde['adresse']),
    },
    lieferadresse: alsAdresse(lieferschein['lieferadresse']),
    lieferdatum: alsText(lieferschein['lieferdatum']),
    lieferschein_nummer: alsText(lieferschein['lieferschein_nummer']),
    bestellnummer: alsText(lieferschein['bestellnummer']),
    positionen: alsListe(lieferschein['positionen']).map(alsPosition),
    warnungen: alsListe(lieferschein['warnungen']).filter(
      (warnung): warnung is string => typeof warnung === 'string' && warnung.trim() !== '',
    ),
  };
}

/** Eine leere Zeile mit der naechsten freien Positionsnummer. */
export function neuePosition(positionen: Position[]): Position {
  const hoechsteNummer = Math.max(0, ...positionen.map((p) => p.position ?? 0));
  return {
    position: hoechsteNummer + 1,
    artikelnummer: null,
    bezeichnung: '',
    menge: null,
    einheit: null,
  };
}

// ---------------------------------------------------------------------------
// Pruefen: fehlende oder fehlerhafte Pflichtangaben
// ---------------------------------------------------------------------------

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

export interface HinweisGruppe {
  bereich: Bereich;
  hinweise: Hinweis[];
}

function istLeer(wert: string | null): boolean {
  return wert === null || wert.trim() === '';
}

/** true, wenn der Text ein echtes Kalenderdatum im Format YYYY-MM-DD ist. */
function istGueltigesDatum(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const datum = new Date(`${text}T00:00:00Z`);
  // new Date rollt 2026-02-30 still auf den 2. Maerz - darum zurueckvergleichen.
  return !isNaN(datum.getTime()) && datum.toISOString().startsWith(text);
}

function pruefeAdresse(
  adresse: Adresse,
  pfad: string,
  bereich: Bereich,
  pflichtfelder: (keyof Adresse)[],
): Hinweis[] {
  return pflichtfelder
    .filter((feld) => istLeer(adresse[feld]))
    .map((feld) => ({ feld: `${pfad}.${feld}`, bereich, text: `${ADRESSFELDER[feld]} fehlt` }));
}

function pruefeKunde(kunde: Lieferschein['kunde']): Hinweis[] {
  const name: Hinweis[] = istLeer(kunde.name)
    ? [{ feld: 'kunde.name', bereich: 'Kunde', text: 'Name fehlt' }]
    : [];
  return [
    ...name,
    ...pruefeAdresse(kunde.adresse, 'kunde.adresse', 'Kunde', ['strasse', 'plz', 'ort']),
  ];
}

function pruefeLieferdatum(lieferdatum: string | null): Hinweis[] {
  const feld = 'lieferdatum';
  const bereich = 'Lieferdatum';
  if (lieferdatum === null || istLeer(lieferdatum)) {
    return [{ feld, bereich, text: 'Lieferdatum fehlt' }];
  }
  if (!istGueltigesDatum(lieferdatum)) {
    return [{ feld, bereich, text: `„${lieferdatum}“ ist kein gültiges Datum` }];
  }
  return [];
}

function pruefePosition(position: Position, index: number): Hinweis[] {
  // Nummer wie auf dem Lieferschein; ohne erkannte Nummer ab 1 gezaehlt.
  const nummer = `Position ${position.position ?? index + 1}`;
  const pfad = `positionen.${index}`;
  const hinweise: Hinweis[] = [];

  if (istLeer(position.bezeichnung)) {
    hinweise.push({
      feld: `${pfad}.bezeichnung`,
      bereich: 'Artikel',
      text: `${nummer}: Bezeichnung fehlt`,
    });
  }

  // Mit Bezeichnung findet man die Zeile im PDF schneller.
  const titel = istLeer(position.bezeichnung)
    ? nummer
    : `${nummer} (${position.bezeichnung.trim()})`;
  if (position.menge === null) {
    hinweise.push({ feld: `${pfad}.menge`, bereich: 'Artikel', text: `${titel}: Menge fehlt` });
  } else if (position.menge <= 0) {
    hinweise.push({
      feld: `${pfad}.menge`,
      bereich: 'Artikel',
      text: `${titel}: Menge muss grösser 0 sein`,
    });
  }
  return hinweise;
}

function pruefePositionen(positionen: Position[]): Hinweis[] {
  if (positionen.length === 0) {
    return [{ feld: 'positionen', bereich: 'Artikel', text: 'Keine Artikel erkannt' }];
  }
  return positionen.flatMap(pruefePosition);
}

/**
 * Sucht fehlende oder fehlerhafte Pflichtangaben. Die Warnungen der KI zaehlen
 * bewusst nicht dazu - sie sind Vermutungen und werden getrennt angezeigt.
 * Leere Liste heisst: alle Pflichtangaben vorhanden.
 */
export function pruefeLieferschein(daten: Lieferschein): Hinweis[] {
  return [
    ...pruefeKunde(daten.kunde),
    ...pruefeAdresse(daten.lieferadresse, 'lieferadresse', 'Lieferadresse', [
      'name',
      'strasse',
      'plz',
      'ort',
    ]),
    ...pruefeLieferdatum(daten.lieferdatum),
    ...pruefePositionen(daten.positionen),
  ];
}

/** Fasst Hinweise nach Bereich zusammen, in der festen Reihenfolge von BEREICHE. */
export function gruppiereHinweise(hinweise: Hinweis[]): HinweisGruppe[] {
  return BEREICHE.map((bereich) => ({
    bereich,
    hinweise: hinweise.filter((hinweis) => hinweis.bereich === bereich),
  })).filter((gruppe) => gruppe.hinweise.length > 0);
}
