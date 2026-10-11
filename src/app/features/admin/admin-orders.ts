import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/api/api-error';
import { ORDER_STATUSES, Order, OrderStatus, Page } from '../../core/api/models';
import { OrderApi } from '../../core/api/order-api';
import { Paginator } from '../../shared/paginator';
import { StatusBadge, statusLabel } from '../../shared/status-badge';

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, Paginator, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <select [value]="status()" (change)="filter($any($event.target).value)" aria-label="Filtra per stato">
        <option value="">Tutti gli stati</option>
        @for (option of statuses; track option) {
          <option [value]="option">{{ label(option) }}</option>
        }
      </select>
      <button class="btn btn--ghost" (click)="reload()">Aggiorna</button>
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    @if (page(); as result) {
      <div class="card table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Data</th>
              <th>Destinatario</th>
              <th class="num">Articoli</th>
              <th class="num">Totale</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            @for (order of result.content; track order.id) {
              <tr class="clickable" (click)="toggle(order.id)">
                <td><strong>#{{ order.id }}</strong></td>
                <td>{{ order.createdAt | date: 'short' }}</td>
                <td>{{ order.shippingAddress.recipientName }}</td>
                <td class="num">{{ itemCount(order) }}</td>
                <td class="num">{{ order.subtotal | currency }}</td>
                <td><app-status-badge [status]="order.status" /></td>
              </tr>
              @if (expanded() === order.id) {
                <tr class="details-row">
                  <td colspan="6">
                    <div class="details">
                      <div>
                        <h3>Articoli</h3>
                        <ul class="plain-list">
                          @for (item of order.items; track item.productId) {
                            <li>{{ item.quantity }} × {{ item.productName }} — {{ item.lineTotal | currency }}</li>
                          }
                        </ul>
                      </div>
                      <div>
                        <h3>Spedizione</h3>
                        <address>
                          {{ order.shippingAddress.addressLine }}<br />
                          {{ order.shippingAddress.postalCode }} {{ order.shippingAddress.city }}
                          ({{ order.shippingAddress.countryCode }})
                        </address>
                      </div>
                      <div>
                        <h3>Cliente</h3>
                        <code class="small">{{ order.customerId }}</code>
                        @if (order.cancellationReason) {
                          <p class="small">Annullato: {{ order.cancellationReason }}</p>
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="6" class="muted center">Nessun ordine.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginator [meta]="result.page" (pageChange)="load($event)" />
    }
  `,
})
export class AdminOrders {
  private readonly orders = inject(OrderApi);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly label = statusLabel;
  protected readonly status = signal<OrderStatus | ''>('');
  protected readonly page = signal<Page<Order> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<number | null>(null);

  constructor() {
    this.load(0);
  }

  protected filter(status: OrderStatus | ''): void {
    this.status.set(status);
    this.load(0);
  }

  protected reload(): void {
    this.load(this.page()?.page.number ?? 0);
  }

  protected load(page: number): void {
    this.orders.all({ status: this.status(), page, size: 20 }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  protected toggle(id: number): void {
    this.expanded.update((current) => (current === id ? null : id));
  }

  protected itemCount(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
