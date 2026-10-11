import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  exhaustMap,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  take,
  takeWhile,
  timer,
} from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { Order, Payment, Shipment } from '../../core/api/models';
import { OrderApi } from '../../core/api/order-api';
import { PaymentApi } from '../../core/api/payment-api';
import { ShipmentApi } from '../../core/api/shipment-api';
import { NotificationService } from '../../core/notifications/notification.service';
import { StatusBadge } from '../../shared/status-badge';

interface OrderSnapshot {
  order: Order;
  payment: Payment | null;
  shipment: Shipment | null;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

/**
 * Dopo la creazione l'ordine avanza tramite eventi RabbitMQ (pagamento, spedizione, rimborso):
 * finché c'è un passaggio automatico in sospeso la pagina si aggiorna da sola.
 */
function isAwaitingEvents({ order, payment, shipment }: OrderSnapshot): boolean {
  switch (order.status) {
    case 'PLACED':
      return true;
    case 'CONFIRMED':
      return shipment === null;
    case 'CANCELLED':
      return payment?.status === 'COMPLETED' || shipment?.status === 'CREATED';
    default:
      return false;
  }
}

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/orders" class="back-link">← Tutti gli ordini</a>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    @if (snapshot(); as s) {
      <div class="page-head">
        <div>
          <h1>Ordine #{{ s.order.id }}</h1>
          <span class="muted">Effettuato il {{ s.order.createdAt | date: 'medium' }}</span>
        </div>
        <div class="page-head__actions">
          @if (polling()) {
            <span class="muted small pulse">Aggiornamento in corso…</span>
          }
          <app-status-badge [status]="s.order.status" />
        </div>
      </div>

      @if (s.order.status === 'CANCELLED') {
        <div class="alert alert--neutral">
          <strong>Ordine annullato</strong>
          @if (s.order.cancelledAt) {
            il {{ s.order.cancelledAt | date: 'medium' }}
          }
          @if (s.order.cancellationReason) {
            <div>Motivo: {{ s.order.cancellationReason }}</div>
          }
          @if (s.order.refundedAt) {
            <div>Rimborso eseguito il {{ s.order.refundedAt | date: 'medium' }}.</div>
          }
        </div>
      } @else {
        <ol class="timeline">
          @for (step of steps(); track step.label) {
            <li class="timeline__step" [class.is-done]="step.at" [class.is-current]="step.current">
              <span class="timeline__dot"></span>
              <span class="timeline__label">{{ step.label }}</span>
              <span class="timeline__date">{{ step.at ? (step.at | date: 'short') : '—' }}</span>
            </li>
          }
        </ol>
      }

      <div class="two-columns">
        <section class="card">
          <h2>Articoli</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Prodotto</th>
                <th class="num">Prezzo</th>
                <th class="num">Qtà</th>
                <th class="num">Totale</th>
              </tr>
            </thead>
            <tbody>
              @for (item of s.order.items; track item.productId) {
                <tr>
                  <td>
                    <a [routerLink]="['/products', item.productId]">{{ item.productName }}</a>
                  </td>
                  <td class="num">{{ item.unitPrice | currency }}</td>
                  <td class="num">{{ item.quantity }}</td>
                  <td class="num">{{ item.lineTotal | currency }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Totale</td>
                <td class="num">
                  <strong>{{ s.order.subtotal | currency }}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div class="stack">
          <section class="card">
            <h2>Pagamento</h2>
            @if (s.payment; as payment) {
              <div class="kv">
                <span>Stato</span>
                <app-status-badge [status]="payment.status" />
                <span>Importo</span>
                <span>{{ payment.amount | currency: payment.currency }}</span>
                @if (payment.transactionReference) {
                  <span>Transazione</span>
                  <code>{{ payment.transactionReference }}</code>
                }
                @if (payment.refundReference) {
                  <span>Rimborso</span>
                  <code>{{ payment.refundReference }}</code>
                }
              </div>
              @if (payment.failureReason) {
                <div class="alert alert--error">{{ payment.failureReason }}</div>
              }
            } @else {
              <p class="muted">In elaborazione…</p>
            }
          </section>

          <section class="card">
            <h2>Spedizione</h2>
            <address>
              {{ s.order.shippingAddress.recipientName }}<br />
              {{ s.order.shippingAddress.addressLine }}<br />
              {{ s.order.shippingAddress.postalCode }} {{ s.order.shippingAddress.city }}
              ({{ s.order.shippingAddress.countryCode }})
            </address>
            @if (s.shipment; as shipment) {
              <div class="kv">
                <span>Stato</span>
                <app-status-badge [status]="shipment.status" />
                @if (shipment.carrier) {
                  <span>Corriere</span>
                  <span>{{ shipment.carrier }}</span>
                }
                @if (shipment.trackingCode) {
                  <span>Tracking</span>
                  <code>{{ shipment.trackingCode }}</code>
                }
              </div>
            } @else if (s.order.status !== 'CANCELLED') {
              <p class="muted">La spedizione verrà creata dopo la conferma del pagamento.</p>
            }
          </section>

          @if (canCancel()) {
            <section class="card">
              <h2>Annulla ordine</h2>
              @if (cancelOpen()) {
                <label class="field">
                  <span>Motivo</span>
                  <textarea rows="3" [formControl]="cancelReason" maxlength="500"></textarea>
                </label>
                <div class="actions">
                  <button class="btn btn--ghost" (click)="cancelOpen.set(false)">Indietro</button>
                  <button class="btn btn--danger" [disabled]="cancelReason.invalid || cancelling()" (click)="cancel(s.order.id)">
                    Conferma annullamento
                  </button>
                </div>
              } @else {
                <p class="muted small">Puoi annullare finché l'ordine non è stato spedito. Il pagamento verrà rimborsato.</p>
                <button class="btn btn--ghost btn--danger-text" (click)="cancelOpen.set(true)">Annulla ordine</button>
              }
            </section>
          }
        </div>
      </div>
    } @else if (!error()) {
      <div class="card card--skeleton card--tall"></div>
    }
  `,
})
export class OrderDetail {
  private readonly orders = inject(OrderApi);
  private readonly payments = inject(PaymentApi);
  private readonly shipments = inject(ShipmentApi);
  private readonly notifications = inject(NotificationService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  protected readonly snapshot = signal<OrderSnapshot | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly polling = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly cancelReason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });

  protected readonly canCancel = computed(() => {
    const status = this.snapshot()?.order.status;
    return status === 'PLACED' || status === 'CONFIRMED';
  });

  protected readonly steps = computed(() => {
    const order = this.snapshot()?.order;
    if (!order) {
      return [];
    }
    const steps = [
      { label: 'Ordinato', at: order.createdAt },
      { label: 'Pagato e confermato', at: order.confirmedAt },
      { label: 'Spedito', at: order.shippedAt },
      { label: 'Consegnato', at: order.deliveredAt },
    ];
    const currentIndex = steps.findIndex((step) => !step.at);
    return steps.map((step, index) => ({ ...step, current: index === currentIndex }));
  });

  constructor() {
    const orderId$ = inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id'))));

    combineLatest([orderId$, this.refresh$])
      .pipe(
        switchMap(([orderId]) => {
          this.polling.set(true);
          return timer(0, POLL_INTERVAL_MS).pipe(
            take(MAX_POLLS),
            exhaustMap(() => this.loadSnapshot(orderId)),
            takeWhile((snapshot) => snapshot !== null && isAwaitingEvents(snapshot), true),
            finalize(() => this.polling.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((snapshot) => {
        if (snapshot) {
          this.snapshot.set(snapshot);
          this.error.set(null);
        }
      });
  }

  protected cancel(orderId: number): void {
    this.cancelling.set(true);
    this.orders.cancel(orderId, this.cancelReason.value.trim()).subscribe({
      next: () => {
        this.notifications.success(`Ordine #${orderId} annullato.`);
        this.cancelOpen.set(false);
        this.cancelling.set(false);
        this.refresh$.next();
      },
      error: (error: unknown) => {
        this.notifications.error(apiErrorMessage(error));
        this.cancelling.set(false);
        this.refresh$.next();
      },
    });
  }

  private loadSnapshot(orderId: number): Observable<OrderSnapshot | null> {
    return forkJoin({
      order: this.orders.get(orderId),
      payment: this.payments.forOrder(orderId).pipe(catchError(() => of(null))),
      shipment: this.shipments.forOrder(orderId).pipe(catchError(() => of(null))),
    }).pipe(
      catchError((error: unknown) => {
        this.error.set(apiErrorMessage(error));
        return of(null);
      }),
    );
  }
}
