import { Routes } from '@angular/router';
import { Upload } from './components/upload/upload';

export const routes: Routes = [
  { path: '', component: Upload, title: 'Lieferschein hochladen' },
  { path: '**', redirectTo: '' },
];
