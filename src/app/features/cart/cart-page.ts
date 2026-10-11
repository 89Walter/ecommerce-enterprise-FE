import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { CartService, MAX_QUANTITY } from '../../core/cart/cart.service';
import { ProductThumb } from '../../shared/product-thumb';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink, ProductThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Carrello</h1>

    @if (cart.isEmpty()) {
      <div class="empty">
        <h2>Il carrello è vuoto</h2>
        <p>Sfoglia il catalogo e aggiungi qualcosa.</p>
        <a routerLink="/" class="btn btn--primary">Vai al catalogo</a>
      </div>
    } @else {
      <div class="two-columns">
        <section class="card">
          <ul class="line-items">
            @for (item of cart.items(); track item.productId) {
              <li class="line-item">
                <app-product-thumb [name]="item.name" />
                <div class="line-item__info">
                  <a [routerLink]="['/products', item.productId]">{{ item.name }}</a>
                  <span class="muted">{{ item.price | currency }} cad.</span>
                </div>
                <input
                  class="line-item__qty"
                  type="number"
                  min="1"
                  [max]="maxQuantity"
                  [value]="item.quantity"
                  (change)="cart.setQuantity(item.productId, +$any($event.target).value)"
                  [attr.aria-label]="'Quantità di ' + item.name"
                />
                <strong class="line-item__total">{{ item.price * item.quantity | currency }}</strong>
                <button class="btn btn--icon" (click)="cart.remove(item.productId)" [attr.aria-label]="'Rimuovi ' + item.name">
                  ✕
                </button>
              </li>
            }
          </ul>
        </section>

        <aside class="card summary">
          <h2>Riepilogo</h2>
          <div class="summary__row">
            <span>Articoli</span>
            <span>{{ cart.count() }}</span>
          </div>
          <div class="summary__row summary__row--total">
            <span>Totale stimato</span>
            <span>{{ cart.total() | currency }}</span>
          </div>
          <p class="muted small">Spedizione gratuita. Il totale definitivo è calcolato al momento dell'ordine.</p>
          <button class="btn btn--primary btn--block" (click)="checkout()">
            @if (auth.authenticated()) {
              Procedi all'ordine
            } @else {
              Accedi per ordinare
            }
          </button>
          <button class="btn btn--ghost btn--block" (click)="cart.clear()">Svuota carrello</button>
        </aside>
      </div>
    }
  `,
})
export class CartPage {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly maxQuantity = MAX_QUANTITY;

  protected checkout(): void {
    if (this.auth.authenticated()) {
      void this.router.navigate(['/checkout']);
    } else {
      void this.auth.login('/checkout');
    }
  }
}
