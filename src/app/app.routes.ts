import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'config',
        loadComponent: () => import('./pages/config-page/config-page.component').then((m) => m.ConfigPageComponent)
      },
      {
        path: 'fixtures',
        loadComponent: () => import('./pages/fixtures-page/fixtures-page.component').then((m) => m.FixturesPageComponent)
      },
      {
        path: 'ranking',
        loadComponent: () => import('./pages/ranking-page/ranking-page.component').then((m) => m.RankingPageComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'config' }
    ]
  },
  { path: '**', redirectTo: '' }
];
