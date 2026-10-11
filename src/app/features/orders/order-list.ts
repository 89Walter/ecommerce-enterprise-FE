import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/api/api-error';
import { Order, Page } from '../../core/api/models';
import { OrderApi } from '../../core/api/order-api';
import { Paginator } from '../../shared/paginator';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-order-list',
  imports: [CurrencyPipe, DatePipe, RouterLink, Paginator, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>I miei ordini</h1>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    } @else if (page(); as result) {
      @if (result.content.length === 0) {
        <div class="empty">
          <h2>Nessun ordine</h2>
          <p>Quando effettuerai un ordine lo troverai qui.</p>
          <a routerLink="/" class="btn btn--primary">Vai al catalogo</a>
        </div>
      } @else {
        <div class="order-cards">
          @for (order of result.content; track order.id) {
            <a class="card order-card" [routerLink]="['/orders', order.id]">
              <div class="order-card__head">
                <strong>Ordine #{{ order.id }}</strong>
                <app-status-badge [status]="order.status" />
              </div>
              <span class="muted">{{ order.createdAt | date: 'medium' }}</span>
              <span class="order-card__items">{{ itemSummary(order) }}</span>
              <strong class="price">{{ order.subtotal | currency }}</strong>
            </a>
          }
        </div>
        <app-paginator [meta]="result.page" (pageChange)="load($event)" />
      }
    } @else {
      <div class="card card--skeleton"></div>
    }
  `,
})
export class OrderList {
  private readonly orders = inject(OrderApi);

  protected readonly page = signal<Page<Order> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load(0);
  }

  protected load(page: number): void {
    this.orders.mine({ page, size: 10 }).subscribe({
      next: (result) => this.page.set(result),
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  protected itemSummary(order: Order): string {
    const names = order.items.map((item) => item.productName);
    return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} e altri ${names.length - 2}`;
  }
}
