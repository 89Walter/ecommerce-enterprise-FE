import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { CatalogApi } from '../../core/api/catalog-api';
import { Page, Product } from '../../core/api/models';
import { CartService } from '../../core/cart/cart.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { Paginator } from '../../shared/paginator';
import { ProductThumb } from '../../shared/product-thumb';

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Novità' },
  { value: 'price,asc', label: 'Prezzo crescente' },
  { value: 'price,desc', label: 'Prezzo decrescente' },
  { value: 'name,asc', label: 'Nome A-Z' },
];
const PAGE_SIZE = 12;

@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, Paginator, ProductThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <h1>Catalogo</h1>
      <p>Scegli i prodotti, aggiungili al carrello e segui l'ordine fino alla consegna.</p>
    </section>

    <div class="toolbar">
      <input
        class="toolbar__search"
        type="search"
        placeholder="Cerca per nome o descrizione…"
        [formControl]="searchControl"
        aria-label="Cerca prodotti"
      />
      <select [value]="sort()" (change)="changeSort($any($event.target).value)" aria-label="Ordina per">
        @for (option of sortOptions; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    } @else if (loading() && !page()) {
      <div class="grid">
        @for (placeholder of [1, 2, 3, 4, 5, 6]; track placeholder) {
          <div class="card card--skeleton"></div>
        }
      </div>
    } @else if (page(); as result) {
      @if (result.content.length === 0) {
        <div class="empty">
          <h2>Nessun prodotto trovato</h2>
          <p>Prova con un'altra ricerca.</p>
        </div>
      } @else {
        <p class="muted">{{ result.page.totalElements }} prodotti</p>
        <div class="grid" [class.is-loading]="loading()">
          @for (product of result.content; track product.id) {
            <article class="card product-card">
              <a [routerLink]="['/products', product.id]" class="product-card__link">
                <app-product-thumb [name]="product.name" />
                <h3>{{ product.name }}</h3>
                <p class="product-card__description">{{ product.description }}</p>
              </a>
              <div class="product-card__footer">
                <strong class="price">{{ product.price | currency }}</strong>
                <button class="btn btn--primary btn--small" (click)="addToCart(product)">Aggiungi</button>
              </div>
            </article>
          }
        </div>
        <app-paginator [meta]="result.page" (pageChange)="goToPage($event)" />
      }
    }
  `,
})
export class ProductList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogApi);
  private readonly cart = inject(CartService);
  private readonly notifications = inject(NotificationService);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly sort = signal(SORT_OPTIONS[0].value);
  protected readonly page = signal<Page<Product> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Ricerca, pagina e ordinamento vivono nell'URL: la pagina è condivisibile e il tasto Indietro funziona.
    this.route.queryParamMap
      .pipe(
        map((params) => ({
          search: params.get('q') ?? '',
          page: Math.max(0, Number(params.get('page')) || 0),
          sort: params.get('sort') ?? SORT_OPTIONS[0].value,
        })),
        tap((query) => {
          this.searchControl.setValue(query.search, { emitEvent: false });
          this.sort.set(query.sort);
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((query) =>
          this.catalog.search({ ...query, size: PAGE_SIZE }).pipe(
            catchError((error: unknown) => {
              this.error.set(apiErrorMessage(error));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.page.set(page);
        this.loading.set(false);
      });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.navigate({ q: search || null, page: null }));
  }

  protected changeSort(sort: string): void {
    this.navigate({ sort, page: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ page: page || null });
  }

  protected addToCart(product: Product): void {
    if (this.cart.add(product)) {
      this.notifications.success(`${product.name} aggiunto al carrello.`);
    } else {
      this.notifications.error('Il carrello può contenere al massimo 50 prodotti diversi.');
    }
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
