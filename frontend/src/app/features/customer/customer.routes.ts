import { Routes } from '@angular/router';

export const customerRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./customer-home-page').then((module) => module.CustomerHomePage)
  }
];