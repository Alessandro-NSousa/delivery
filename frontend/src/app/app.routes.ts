import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/home/home-page').then((module) => module.HomePage)
	},
	{
		path: 'cliente',
		loadChildren: () => import('./features/customer/customer.routes').then((module) => module.customerRoutes)
	},
	{
		path: 'estabelecimento',
		loadChildren: () => import('./features/merchant/merchant.routes').then((module) => module.merchantRoutes)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
