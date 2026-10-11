import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/api/api-error';
import { Page, SHIPMENT_STATUSES, Shipment, ShipmentStatus } from '../../core/api/models';
import { ShipmentApi } from '../../core/api/shipment-api';
import { NotificationService } from '../../core/notifications/notification.service';
import { Paginator } from '../../shared/paginator';
import { StatusBadge, statusLabel } from '../../shared/status-badge';

@Component({
  selector: 'app-admin-shipments',
  imports: [DatePipe, Paginator, StatusBadge],
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
              <th>Spedizione</th>
              <th>Ordine</th>
              <th>Destinatario</th>
              <th>Tracking</th>
              <th>Creata</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (shipment of result.content; track shipment.id) {
              <tr>
                <td class="muted">#{{ shipment.id }}</td>
                <td><strong>#{{ shipment.orderId }}</strong></td>
                <td>
                  {{ shipment.recipientName }}
                  <div class="muted small">{{ shipment.city }} ({{ shipment.countryCode }})</div>
                </td>
                <td>
                  @if (shipment.trackingCode) {
                    <code>{{ shipment.trackingCode }}</code>
                    <div class="muted small">{{ shipment.carrier }}</div>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>{{ shipment.createdAt | date: 'short' }}</td>
                <td><app-status-badge [status]="shipment.status" /></td>
                <td class="row-actions">
                  @if (shipment.status === 'CREATED') {
                    <button class="btn btn--primary btn--small" [disabled]="busy() === shipment.id" (click)="advance(shipment, 'SHIPPED')">
                      Segna spedita
                    </button>
                  } @else if (shipment.status === 'SHIPPED') {
                    <button class="btn btn--primary btn--small" [disabled]="busy() === shipment.id" (click)="advance(shipment, 'DELIVERED')">
                      Segna consegnata
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="muted center">Nessuna spedizione.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginator [meta]="result.page" (pageChange)="load($event)" />
    }
  `,
})
export class AdminShipments {
  private readonly shipments = inject(ShipmentApi);
  private readonly notifications = inject(NotificationService);

  protected readonly statuses = SHIPMENT_STATUSES;
  protected readonly label = statusLabel;
  protected readonly status = signal<ShipmentStatus | ''>('');
  protected readonly page = signal<Page<Shipment> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);

  constructor() {
    this.load(0);
  }

  protected filter(status: ShipmentStatus | ''): void {
    this.status.set(status);
    this.load(0);
  }

  protected reload(): void {
    this.load(this.page()?.page.number ?? 0);
  }

  protected load(page: number): void {
    this.shipments.all({ status: this.status(), page, size: 20 }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  protected advance(shipment: Shipment, status: 'SHIPPED' | 'DELIVERED'): void {
    this.busy.set(shipment.id);
    this.shipments.advance(shipment.id, status).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.notifications.success(`Spedizione dell'ordine #${updated.orderId}: ${statusLabel(updated.status)}.`);
        // Aggiorna la riga sul posto per non perdere pagina e filtro.
        this.page.update((page) =>
          page && { ...page, content: page.content.map((item) => (item.id === updated.id ? updated : item)) },
        );
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.notifications.error(apiErrorMessage(error));
      },
    });
  }
}
