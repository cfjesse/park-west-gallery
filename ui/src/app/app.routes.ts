import { Routes } from '@angular/router';
import { roleGuard } from './guards/role-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home' },
  {
    path: 'login',
    title: 'Login | Park West',
    loadComponent: () => import('./login-module/components/login/login').then((m) => m.Login),
  },
  { path: 'home', loadChildren: () => import('./pages/welcome/welcome.routes').then((m) => m.WELCOME_ROUTES) },
  {
    path: 'accounting',
    title: 'Accounting | Park West',
    loadComponent: () => import('./accounting-module/components/home/home').then((m) => m.Home),
    canActivate: [roleGuard('accountant')],
  },
  {
    path: 'inventory',
    title: 'Inventory | Park West',
    loadComponent: () => import('./inventory-module/components/home/home').then((m) => m.Home),
    canActivate: [roleGuard('inventory_specialist')],
  },
  {
    path: 'customer',
    title: 'Gallery | Park West',
    loadComponent: () => import('./customer-module/components/home/home').then((m) => m.Home),
    canActivate: [roleGuard('customer')],
  },
  { path: '**', redirectTo: '/home' },
];
