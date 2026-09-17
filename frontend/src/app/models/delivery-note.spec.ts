import { MAX_FILE_SIZE_BYTES, formatBytes, validateFile } from './delivery-note';

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
