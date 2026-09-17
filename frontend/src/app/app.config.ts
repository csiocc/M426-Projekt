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
          // Dark Mode nur wenn .app-dark am <html> haengt, statt automatisch per OS-Einstellung.
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng, components, utilities' },
        },
      },
    }),
  ],
};
