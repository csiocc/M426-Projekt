import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DeliveryNoteService, MockDeliveryNoteService } from './delivery-note';

describe('MockDeliveryNoteService', () => {
  let service: DeliveryNoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: DeliveryNoteService, useClass: MockDeliveryNoteService }],
    });
    service = TestBed.inject(DeliveryNoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('gibt zu einer gueltigen Datei einen Datensatz zurueck', async () => {
    const file = new File(['x'], 'ls.png', { type: 'image/png' });
    const note = await firstValueFrom(service.upload(file));

    expect(note.filename).toBe('ls.png');
    expect(note.contentType).toBe('image/png');
    expect(note.id).toBeTruthy();
  });

  it('meldet einen Fehler bei falschem Dateityp', async () => {
    const file = new File(['x'], 'ls.txt', { type: 'text/plain' });
    await expect(firstValueFrom(service.upload(file))).rejects.toThrow('Bilder oder PDF');
  });
});
