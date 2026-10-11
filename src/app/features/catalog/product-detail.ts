import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { CatalogApi } from '../../core/api/catalog-api';
import { Product } from '../../core/api/models';
import { CartService, MAX_QUANTITY } from '../../core/cart/cart.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { ProductThumb } from '../../shared/product-thumb';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink, ProductThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/" class="back-link">← Torna al catalogo</a>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    } @else if (product(); as product) {
      <article class="product-detail">
        <app-product-thumb [name]="product.name" [large]="true" />
        <div class="product-detail__body">
          <h1>{{ product.name }}</h1>
          <strong class="price price--large">{{ product.price | currency }}</strong>
          <p class="product-detail__description">{{ product.description }}</p>

          <div class="buy-box">
            <label class="field field--inline">
              <span>Quantità</span>
              <input
                type="number"
                min="1"
                [max]="maxQuantity"
                [value]="quantity()"
                (change)="quantity.set(+$any($event.target).value)"
              />
            </label>
            <button class="btn btn--primary btn--large" (click)="addToCart(product)">Aggiungi al carrello</button>
          </div>
          <p class="muted small">Il prezzo definitivo viene fissato al momento dell'ordine.</p>
        </div>
      </article>
    } @else {
      <div class="card card--skeleton card--tall"></div>
    }
  `,
})
export class ProductDetail {
  private readonly catalog = inject(CatalogApi);
  private readonly cart = inject(CartService);
  private readonly notifications = inject(NotificationService);

  protected readonly maxQuantity = MAX_QUANTITY;
  protected readonly product = signal<Product | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly quantity = signal(1);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.product.set(null);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.catalog.get(id).pipe(
            catchError((error: unknown) => {
              this.error.set(apiErrorMessage(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((product) => this.product.set(product));
  }

  protected addToCart(product: Product): void {
    if (this.cart.add(product, this.quantity())) {
      this.notifications.success(`${product.name} aggiunto al carrello.`);
    } else {
      this.notifications.error('Il carrello può contenere al massimo 50 prodotti diversi.');
    }
  }
}
