import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/home/home-page').then((module) => module.HomePage)
	},
	{
		path: 'erro',
		loadComponent: () => import('./features/error/error-page').then((module) => module.ErrorPage)
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
		loadComponent: () => import('./features/error/error-page').then((module) => module.ErrorPage),
		data: {
			title: 'Pagina nao encontrada',
			message: 'A rota informada nao existe ou ainda nao foi implementada neste MVP.',
			code: '404'
		}
	}
];
