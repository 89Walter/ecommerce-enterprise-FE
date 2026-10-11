import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { UserProfile } from '../../core/api/models';
import { OrderApi } from '../../core/api/order-api';
import { UserApi } from '../../core/api/user-api';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { AddressFields, addressValue, createAddressForm } from '../../shared/address-fields';

@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, AddressFields],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/cart" class="back-link">← Torna al carrello</a>
    <h1>Checkout</h1>

    @if (cart.isEmpty()) {
      <div class="empty">
        <h2>Non c'è nulla da ordinare</h2>
        <a routerLink="/" class="btn btn--primary">Vai al catalogo</a>
      </div>
    } @else {
      <form class="two-columns" [formGroup]="address" (ngSubmit)="placeOrder()">
        <section class="card">
          <h2>Indirizzo di spedizione</h2>
          <app-address-fields [form]="address" />
          <label class="checkbox">
            <input type="checkbox" [formControl]="saveAsDefault" />
            Salva come indirizzo predefinito
          </label>
        </section>

        <aside class="card summary">
          <h2>Il tuo ordine</h2>
          <ul class="summary__items">
            @for (item of cart.items(); track item.productId) {
              <li>
                <span>{{ item.quantity }} × {{ item.name }}</span>
                <span>{{ item.price * item.quantity | currency }}</span>
              </li>
            }
          </ul>
          <div class="summary__row summary__row--total">
            <span>Totale stimato</span>
            <span>{{ cart.total() | currency }}</span>
          </div>
          <p class="muted small">
            Il pagamento viene elaborato subito dopo la conferma: potrai seguirne l'esito nella pagina dell'ordine.
          </p>
          @if (error()) {
            <div class="alert alert--error">{{ error() }}</div>
          }
          <button type="submit" class="btn btn--primary btn--block" [disabled]="submitting()">
            {{ submitting() ? 'Invio in corso…' : 'Conferma e paga' }}
          </button>
        </aside>
      </form>
    }
  `,
})
export class Checkout {
  private readonly orders = inject(OrderApi);
  private readonly users = inject(UserApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  protected readonly cart = inject(CartService);

  protected readonly address = createAddressForm({ recipientName: this.auth.user()?.fullName ?? '' });
  protected readonly saveAsDefault = new FormControl(true, { nonNullable: true });
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  private profile: UserProfile | null = null;

  constructor() {
    // Il profilo serve solo a precompilare l'indirizzo: se lo user-service non risponde si procede comunque.
    this.users
      .me()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((profile) => {
        this.profile = profile;
        if (profile?.defaultShippingAddress && this.address.pristine) {
          this.address.setValue(profile.defaultShippingAddress);
          this.saveAsDefault.setValue(false);
        }
      });
  }

  protected placeOrder(): void {
    if (this.address.invalid) {
      this.address.markAllAsTouched();
      return;
    }
    const shippingAddress = addressValue(this.address);
    this.submitting.set(true);
    this.error.set(null);

    this.orders
      .create({
        items: this.cart.items().map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress,
      })
      .subscribe({
        next: (order) => {
          this.cart.clear();
          if (this.saveAsDefault.value) {
            this.saveDefaultAddress(shippingAddress);
          }
          this.notifications.success(`Ordine #${order.id} creato.`);
          void this.router.navigate(['/orders', order.id]);
        },
        error: (error: unknown) => {
          this.error.set(apiErrorMessage(error));
          this.submitting.set(false);
        },
      });
  }

  private saveDefaultAddress(address: ReturnType<typeof addressValue>): void {
    this.users
      .updateMe({
        firstName: this.profile?.firstName ?? null,
        lastName: this.profile?.lastName ?? null,
        phone: this.profile?.phone ?? null,
        defaultShippingAddress: address,
      })
      .subscribe({ error: () => this.notifications.info("Non è stato possibile salvare l'indirizzo predefinito.") });
  }
}
