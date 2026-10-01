import {
  Lieferschein,
  MAX_FILE_SIZE_BYTES,
  fehlerAusAntwort,
  formatBytes,
  gruppiereHinweise,
  normalisiere,
  pruefeLieferschein,
  validateFile,
} from './delivery-note';

function fileOf(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // Grosse Dateien nicht wirklich anlegen - nur die gemeldete Groesse faelschen.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateFile', () => {
  it('akzeptiert ein Bild', () => {
    expect(validateFile(fileOf('ls.png', 'image/png', 1024))).toBeNull();
  });

  it('akzeptiert ein PDF', () => {
    expect(validateFile(fileOf('ls.pdf', 'application/pdf', 1024))).toBeNull();
  });

  it('lehnt eine Textdatei ab', () => {
    expect(validateFile(fileOf('ls.txt', 'text/plain', 1024))).toContain('PNG, JPG');
  });

  it('lehnt HEIC ab, weil das Backend es nicht annimmt', () => {
    expect(validateFile(fileOf('ls.heic', 'image/heic', 1024))).toContain('PNG, JPG');
  });

  it('lehnt Dateien ueber 20 MB ab', () => {
    const zuGross = fileOf('ls.png', 'image/png', MAX_FILE_SIZE_BYTES + 1);
    expect(validateFile(zuGross)).toContain('20 MB');
  });

  it('akzeptiert genau 20 MB', () => {
    expect(validateFile(fileOf('ls.png', 'image/png', MAX_FILE_SIZE_BYTES))).toBeNull();
  });
});

describe('formatBytes', () => {
  it('formatiert Bytes, KB und MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(20 * 1024 * 1024)).toBe('20.0 MB');
  });
});

/** Vollstaendiger Lieferschein nach docs/ki/beispiele/lieferschein-01.erwartet.json. */
function beispiel(): Lieferschein {
  return normalisiere({
    kunde: {
      name: 'Muster AG',
      kundennummer: 'K-1024',
      adresse: { name: null, strasse: 'Bahnhofstrasse 1', plz: '8001', ort: 'Zürich', land: null },
    },
    lieferadresse: {
      name: 'Muster AG / Baustelle Nord',
      strasse: 'Industrieweg 5',
      plz: '8600',
      ort: 'Dübendorf',
      land: null,
    },
    lieferdatum: '2026-09-10',
    lieferschein_nummer: 'LS-2026-0042',
    bestellnummer: 'B-9987',
    positionen: [
      {
        position: 1,
        artikelnummer: 'A-100',
        bezeichnung: 'Schrauben 4x30',
        menge: 250,
        einheit: 'Stk',
      },
      { position: 2, artikelnummer: null, bezeichnung: 'Dübel S8', menge: 1, einheit: 'Stk' },
    ],
    warnungen: [],
  });
}

/** Hinweise als "Bereich: Text", damit die Erwartungen kurz und lesbar bleiben. */
const texte = (daten: Lieferschein) =>
  pruefeLieferschein(daten).map((h) => `${h.bereich}: ${h.text}`);

describe('normalisiere', () => {
  it('uebernimmt ein vollstaendiges Resultat unveraendert', () => {
    const daten = beispiel();
    expect(daten.kunde.name).toBe('Muster AG');
    expect(daten.positionen).toHaveLength(2);
    expect(daten.positionen[0].menge).toBe(250);
  });

  it('fuellt fehlende Teile auf, statt abzustuerzen', () => {
    const daten = normalisiere({ positionen: [{ bezeichnung: 'Dübel', menge: '5' }, 'kaputt'] });
    expect(daten.kunde).toEqual({
      name: null,
      kundennummer: null,
      adresse: { name: null, strasse: null, plz: null, ort: null, land: null },
    });
    expect(daten.lieferdatum).toBeNull();
    // "5" als Text wird zur Zahl, ein kaputter Eintrag zur leeren Position.
    expect(daten.positionen[0].menge).toBe(5);
    expect(daten.positionen[1]).toEqual({
      position: null,
      artikelnummer: null,
      bezeichnung: '',
      menge: null,
      einheit: null,
    });
    expect(normalisiere([1, 2]).positionen).toEqual([]);
  });

  it('behaelt nur echte Warnungen der KI', () => {
    expect(normalisiere({ warnungen: ['Datum unscharf', '', 3] }).warnungen).toEqual([
      'Datum unscharf',
    ]);
  });
});

describe('pruefeLieferschein', () => {
  it('meldet bei einem vollstaendigen Lieferschein nichts', () => {
    expect(pruefeLieferschein(beispiel())).toEqual([]);
  });

  it('meldet fehlenden Kundennamen und leere Adressfelder mit Feldangabe', () => {
    const daten = beispiel();
    daten.kunde.name = null;
    daten.kunde.adresse.ort = '  ';
    expect(pruefeLieferschein(daten)).toEqual([
      { feld: 'kunde.name', bereich: 'Kunde', text: 'Name fehlt' },
      { feld: 'kunde.adresse.ort', bereich: 'Kunde', text: 'Ort fehlt' },
    ]);
  });

  it('meldet fehlende Felder der Lieferadresse', () => {
    const daten = beispiel();
    daten.lieferadresse.plz = null;
    daten.lieferadresse.name = '';
    expect(texte(daten)).toEqual(['Lieferadresse: Name fehlt', 'Lieferadresse: PLZ fehlt']);
  });

  it('meldet fehlendes und ungueltiges Lieferdatum', () => {
    const daten = beispiel();
    daten.lieferdatum = null;
    expect(texte(daten)).toEqual(['Lieferdatum: Lieferdatum fehlt']);

    daten.lieferdatum = '10.09.2026';
    expect(texte(daten)).toEqual(['Lieferdatum: „10.09.2026“ ist kein gültiges Datum']);

    // Formal korrekt, aber diesen Tag gibt es nicht.
    daten.lieferdatum = '2026-02-30';
    expect(texte(daten)[0]).toContain('kein gültiges Datum');
  });

  it('meldet, wenn keine Artikel erkannt wurden', () => {
    const daten = beispiel();
    daten.positionen = [];
    expect(pruefeLieferschein(daten)).toEqual([
      { feld: 'positionen', bereich: 'Artikel', text: 'Keine Artikel erkannt' },
    ]);
  });

  it('nennt Positionen mit Nummer und Bezeichnung statt als JSON-Pfad', () => {
    const daten = beispiel();
    daten.positionen[1].menge = null;
    daten.positionen.push({
      position: null,
      artikelnummer: null,
      bezeichnung: '',
      menge: 0,
      einheit: null,
    });
    expect(pruefeLieferschein(daten)).toEqual([
      {
        feld: 'positionen.1.menge',
        bereich: 'Artikel',
        text: 'Position 2 (Dübel S8): Menge fehlt',
      },
      {
        feld: 'positionen.2.bezeichnung',
        bereich: 'Artikel',
        text: 'Position 3: Bezeichnung fehlt',
      },
      {
        feld: 'positionen.2.menge',
        bereich: 'Artikel',
        text: 'Position 3: Menge muss grösser 0 sein',
      },
    ]);
  });

  it('zaehlt die Warnungen der KI nicht als Fehler', () => {
    const daten = beispiel();
    daten.warnungen = ['Menge in Zeile 2 schlecht lesbar'];
    expect(pruefeLieferschein(daten)).toEqual([]);
  });
});

describe('gruppiereHinweise', () => {
  it('fasst nach Bereich zusammen, in fester Reihenfolge und ohne leere Gruppen', () => {
    const name = { feld: 'kunde.name', bereich: 'Kunde', text: 'Name fehlt' } as const;
    const menge1 = { feld: 'positionen.0.menge', bereich: 'Artikel', text: 'a' } as const;
    const menge2 = { feld: 'positionen.1.menge', bereich: 'Artikel', text: 'b' } as const;
    expect(gruppiereHinweise([menge1, name, menge2])).toEqual([
      { bereich: 'Kunde', hinweise: [name] },
      { bereich: 'Artikel', hinweise: [menge1, menge2] },
    ]);
  });
});

describe('fehlerAusAntwort', () => {
  it('erkennt die Fehlerantwort des Jobs', () => {
    expect(fehlerAusAntwort({ fehler: 'KI nicht erreichbar' })).toBe('KI nicht erreichbar');
  });

  it('gibt fuer ein normales Ergebnis null zurueck', () => {
    expect(fehlerAusAntwort({ kunde: null })).toBeNull();
    expect(fehlerAusAntwort(null)).toBeNull();
  });
});
