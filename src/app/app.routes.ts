import { Routes } from '@angular/router';

import { adminGuard, authGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    title: 'Catalogo · Bottega',
    loadComponent: () => import('./features/catalog/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/:id',
    title: 'Prodotto · Bottega',
    loadComponent: () => import('./features/catalog/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'cart',
    title: 'Carrello · Bottega',
    loadComponent: () => import('./features/cart/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'checkout',
    title: 'Checkout · Bottega',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'orders',
    title: 'I miei ordini · Bottega',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-list').then((m) => m.OrderList),
  },
  {
    path: 'orders/:id',
    title: 'Ordine · Bottega',
    canActivate: [authGuard],
    loadComponent: () => import('./features/orders/order-detail').then((m) => m.OrderDetail),
  },
  {
    path: 'assistant',
    title: 'Assistente · Bottega',
    canActivate: [authGuard],
    loadComponent: () => import('./features/assistant/assistant-page').then((m) => m.AssistantPage),
  },
  {
    path: 'profile',
    title: 'Profilo · Bottega',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        title: 'Admin · Prodotti',
        loadComponent: () => import('./features/admin/admin-products').then((m) => m.AdminProducts),
      },
      {
        path: 'orders',
        title: 'Admin · Ordini',
        loadComponent: () => import('./features/admin/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'shipments',
        title: 'Admin · Spedizioni',
        loadComponent: () => import('./features/admin/admin-shipments').then((m) => m.AdminShipments),
      },
      {
        path: 'payments',
        title: 'Admin · Pagamenti',
        loadComponent: () => import('./features/admin/admin-payments').then((m) => m.AdminPayments),
      },
      {
        path: 'users',
        title: 'Admin · Utenti',
        loadComponent: () => import('./features/admin/admin-users').then((m) => m.AdminUsers),
      },
    ],
  },
  {
    path: '**',
    title: 'Pagina non trovata · Bottega',
    loadComponent: () => import('./features/not-found').then((m) => m.NotFound),
  },
];
