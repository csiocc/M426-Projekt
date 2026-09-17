import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { DeliveryNoteService, HttpDeliveryNoteService } from './services/delivery-note';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: DeliveryNoteService, useClass: HttpDeliveryNoteService },
    providePrimeNG({
      // PrimeNG 22 verlangt einen Lizenzschluessel (Community-Lizenz ist fuer uns
      // gratis: Studenten/Non-Profit). Holen unter https://primeui.dev/licenses/community
      // Ohne gueltigen Key: Konsolen-Warnung + Hinweis-Banner unten rechts.
      license:
        'eyJpZCI6IjUzNWQ0MWU1LWE0MzYtNGIyZC04ODRjLWRlNmEwNDVmODI1NSIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODg4NDcwOTAsImV4cCI6MTgyMDM4MzA5MH0.G3Gcacpx1mtRVUHVDUMwYsqFnuMYxc_ArYgQ5CuUHN2OC0QM9-dlupckn7jmDgPCcL91i3Qo9LsRHlNDskfOCg',
      theme: {
        preset: Aura,
        options: {
          // Dark Mode folgt der OS-Einstellung (prefers-color-scheme). Vorher stand
          // hier '.app-dark' - die Klasse hat aber nie jemand gesetzt, damit war der
          // Dark Mode tot. Ohne Umschalter in der Oberflaeche ist 'system' das
          // Richtige, und Tailwinds dark: haengt am selben Schalter.
          darkModeSelector: 'system',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng, components, utilities' },
        },
      },
    }),
  ],
};
