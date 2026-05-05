import { Routes } from '@angular/router';

export const merchantRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./merchant-home-page').then((module) => module.MerchantHomePage)
  }
];