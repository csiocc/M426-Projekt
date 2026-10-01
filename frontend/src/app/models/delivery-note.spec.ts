import {
  JsonValue,
  MAX_FILE_SIZE_BYTES,
  fehlerAusAntwort,
  formatBytes,
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
function beispiel(): { [key: string]: JsonValue } {
  return {
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
      {
        position: 2,
        artikelnummer: null,
        bezeichnung: 'Palette (Leergut)',
        menge: 1,
        einheit: 'Palette',
      },
    ],
    warnungen: [],
  };
}

describe('pruefeLieferschein', () => {
  it('meldet bei einem vollstaendigen Lieferschein nichts', () => {
    expect(pruefeLieferschein(beispiel())).toEqual([]);
  });

  it('meldet fehlenden Kundennamen und leere Adressfelder', () => {
    const daten = beispiel();
    const kunde = daten['kunde'] as { [key: string]: JsonValue };
    kunde['name'] = null;
    (kunde['adresse'] as { [key: string]: JsonValue })['ort'] = '  ';
    expect(pruefeLieferschein(daten)).toEqual(['kunde.name fehlt', 'kunde.adresse.ort fehlt']);
  });

  it('meldet eine fehlende Lieferadresse', () => {
    const daten = beispiel();
    daten['lieferadresse'] = null;
    expect(pruefeLieferschein(daten)).toEqual(['lieferadresse fehlt']);
  });

  it('meldet fehlendes und ungueltiges Lieferdatum', () => {
    const daten = beispiel();
    daten['lieferdatum'] = null;
    expect(pruefeLieferschein(daten)).toEqual(['lieferdatum fehlt']);

    daten['lieferdatum'] = '10.09.2026';
    expect(pruefeLieferschein(daten)[0]).toContain('kein gültiges Datum');

    // Formal korrekt, aber diesen Tag gibt es nicht.
    daten['lieferdatum'] = '2026-02-30';
    expect(pruefeLieferschein(daten)[0]).toContain('kein gültiges Datum');
  });

  it('meldet, wenn keine Artikel erkannt wurden', () => {
    const daten = beispiel();
    daten['positionen'] = [];
    expect(pruefeLieferschein(daten)).toEqual(['positionen: keine Artikel erkannt']);
  });

  it('meldet fehlende Bezeichnung und fehlerhafte Mengen pro Position', () => {
    const daten = beispiel();
    daten['positionen'] = [
      { bezeichnung: '', menge: null },
      { bezeichnung: 'Dübel', menge: '5' },
      { bezeichnung: 'Matte', menge: 0 },
      'kaputt',
    ];
    expect(pruefeLieferschein(daten)).toEqual([
      'positionen[0].bezeichnung fehlt',
      'positionen[0].menge fehlt',
      'positionen[1].menge muss eine Zahl grösser 0 sein',
      'positionen[2].menge muss eine Zahl grösser 0 sein',
      'positionen[3] ist kein Objekt',
    ]);
  });

  it('uebernimmt die Warnungen der KI', () => {
    const daten = beispiel();
    daten['warnungen'] = ['Menge in Zeile 2 schlecht lesbar'];
    expect(pruefeLieferschein(daten)).toEqual(['KI-Warnung: Menge in Zeile 2 schlecht lesbar']);
  });

  it('meldet, wenn das JSON kein Objekt ist', () => {
    expect(pruefeLieferschein([1, 2])).toEqual(['Das JSON muss ein Objekt sein.']);
    expect(pruefeLieferschein({})).toContain('kunde fehlt');
  });
});

describe('fehlerAusAntwort', () => {
  it('erkennt die Fehlerantwort des Jobs', () => {
    expect(fehlerAusAntwort({ fehler: 'KI nicht erreichbar' })).toBe('KI nicht erreichbar');
  });

  it('gibt fuer ein normales Ergebnis null zurueck', () => {
    expect(fehlerAusAntwort(beispiel())).toBeNull();
    expect(fehlerAusAntwort(null)).toBeNull();
  });
});
