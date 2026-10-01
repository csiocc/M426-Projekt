import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateiVorschau } from './datei-vorschau';

async function zeige(datei: File): Promise<ComponentFixture<DateiVorschau>> {
  const fixture = TestBed.createComponent(DateiVorschau);
  fixture.componentRef.setInput('datei', datei);
  await fixture.whenStable();
  return fixture;
}

const element = (fixture: ComponentFixture<DateiVorschau>, selektor: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(selektor);

describe('DateiVorschau', () => {
  // jsdom kennt keine Object-URLs.
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/vorschau');
    URL.revokeObjectURL = vi.fn();
  });

  it('zeigt ein PDF im iframe, ohne Seitenleiste des Viewers', async () => {
    const fixture = await zeige(new File(['x'], 'ls.pdf', { type: 'application/pdf' }));

    expect(element(fixture, 'iframe')?.getAttribute('src')).toBe(
      'blob:http://localhost/vorschau#navpanes=0&view=FitH',
    );
    expect(element(fixture, 'img')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ls.pdf');
  });

  it('zeigt ein Bild als img', async () => {
    const fixture = await zeige(new File(['x'], 'ls.png', { type: 'image/png' }));

    expect(element(fixture, 'img')?.getAttribute('src')).toBe('blob:http://localhost/vorschau');
    expect(element(fixture, 'iframe')).toBeNull();
  });

  it('gibt die Object-URL frei, wenn die Vorschau verschwindet', async () => {
    const fixture = await zeige(new File(['x'], 'ls.pdf', { type: 'application/pdf' }));

    fixture.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/vorschau');
  });
});
