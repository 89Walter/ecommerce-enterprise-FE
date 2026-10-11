import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/api/api-error';
import { PAYMENT_STATUSES, Page, Payment, PaymentStatus } from '../../core/api/models';
import { PaymentApi } from '../../core/api/payment-api';
import { Paginator } from '../../shared/paginator';
import { StatusBadge, statusLabel } from '../../shared/status-badge';

@Component({
  selector: 'app-admin-payments',
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
              <th>Pagamento</th>
              <th>Ordine</th>
              <th class="num">Importo</th>
              <th>Riferimento</th>
              <th>Data</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            @for (payment of result.content; track payment.id) {
              <tr>
                <td class="muted">#{{ payment.id }}</td>
                <td><strong>#{{ payment.orderId }}</strong></td>
                <td class="num">{{ payment.amount | currency: payment.currency }}</td>
                <td>
                  @if (payment.transactionReference) {
                    <code>{{ payment.transactionReference }}</code>
                  }
                  @if (payment.refundReference) {
                    <div class="muted small">Rimborso: {{ payment.refundReference }}</div>
                  }
                  @if (payment.failureReason) {
                    <div class="small text-danger">{{ payment.failureReason }}</div>
                  }
                </td>
                <td>{{ payment.createdAt | date: 'short' }}</td>
                <td><app-status-badge [status]="payment.status" /></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted center">Nessun pagamento.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginator [meta]="result.page" (pageChange)="load($event)" />
    }
  `,
})
export class AdminPayments {
  private readonly payments = inject(PaymentApi);

  protected readonly statuses = PAYMENT_STATUSES;
  protected readonly label = statusLabel;
  protected readonly status = signal<PaymentStatus | ''>('');
  protected readonly page = signal<Page<Payment> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load(0);
  }

  protected filter(status: PaymentStatus | ''): void {
    this.status.set(status);
    this.load(0);
  }

  protected reload(): void {
    this.load(this.page()?.page.number ?? 0);
  }

  protected load(page: number): void {
    this.payments.all({ status: this.status(), page, size: 20 }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }
}
