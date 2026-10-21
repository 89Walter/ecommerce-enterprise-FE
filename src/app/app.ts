import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';
import { NotificationService } from './core/notifications/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="container topbar__inner">
        <a routerLink="/" class="brand" (click)="menuOpen.set(false)">
          <span class="brand__mark">B</span>
          <span>Bottega</span>
        </a>

        <button class="topbar__toggle btn btn--ghost" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">☰</button>

        <nav class="topbar__nav" [class.is-open]="menuOpen()" (click)="menuOpen.set(false)">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Catalogo</a>
          @if (auth.authenticated()) {
            <a routerLink="/orders" routerLinkActive="is-active">I miei ordini</a>
            <a routerLink="/assistant" routerLinkActive="is-active">Assistente</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="is-active">Back-office</a>
          }

          <span class="topbar__spacer"></span>

          <a routerLink="/cart" routerLinkActive="is-active" class="cart-link">
            Carrello
            @if (cart.count() > 0) {
              <span class="cart-link__count">{{ cart.count() }}</span>
            }
          </a>

          @if (auth.user(); as user) {
            <a routerLink="/profile" routerLinkActive="is-active" class="user-chip" [title]="user.email">
              <span class="user-chip__avatar">{{ user.fullName.charAt(0).toUpperCase() }}</span>
              {{ user.fullName }}
            </a>
            <button class="btn btn--ghost" (click)="auth.logout()">Esci</button>
          } @else {
            <button class="btn btn--ghost" [disabled]="!auth.available()" (click)="auth.register()">Registrati</button>
            <button class="btn btn--primary" [disabled]="!auth.available()" (click)="auth.login()">Accedi</button>
          }
        </nav>
      </div>
    </header>

    @if (!auth.available()) {
      <div class="banner">
        Login non disponibile: Keycloak su localhost:9000 non risponde o non conosce il client "ecommerce-web". Puoi
        comunque sfogliare il catalogo.
      </div>
    }

    <main class="container page">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="container">Bottega · demo dell'e-commerce a microservizi</div>
    </footer>

    <div class="toasts" aria-live="polite">
      @for (notification of notifications.notifications(); track notification.id) {
        <div [class]="'toast toast--' + notification.kind" (click)="notifications.dismiss(notification.id)">
          {{ notification.text }}
        </div>
      }
    </div>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  protected readonly notifications = inject(NotificationService);
  protected readonly menuOpen = signal(false);
}
