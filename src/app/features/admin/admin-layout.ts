import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <h1>Back-office</h1>
    </div>
    <nav class="tabs">
      <a routerLink="products" routerLinkActive="is-active">Prodotti</a>
      <a routerLink="orders" routerLinkActive="is-active">Ordini</a>
      <a routerLink="shipments" routerLinkActive="is-active">Spedizioni</a>
      <a routerLink="payments" routerLinkActive="is-active">Pagamenti</a>
      <a routerLink="users" routerLinkActive="is-active">Clienti</a>
    </nav>
    <router-outlet />
  `,
})
export class AdminLayout {}
