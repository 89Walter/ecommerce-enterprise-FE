import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../../core/api/api-error';
import { UserProfile } from '../../core/api/models';
import { UserApi } from '../../core/api/user-api';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { AddressFields, addressValue, createAddressForm } from '../../shared/address-fields';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, ReactiveFormsModule, AddressFields],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Il mio profilo</h1>

    @if (loadError()) {
      <div class="alert alert--error">{{ loadError() }}</div>
    } @else if (profile(); as p) {
      <form class="two-columns" [formGroup]="personal" (ngSubmit)="save()">
        <section class="card">
          <h2>Dati personali</h2>
          <div class="form-grid">
            <label class="field">
              <span>Nome</span>
              <input formControlName="firstName" autocomplete="given-name" />
            </label>
            <label class="field">
              <span>Cognome</span>
              <input formControlName="lastName" autocomplete="family-name" />
            </label>
            <label class="field field--full">
              <span>Telefono</span>
              <input formControlName="phone" type="tel" autocomplete="tel" placeholder="+39 333 1234567" />
              @if (personal.controls.phone.invalid) {
                <small class="field__error">Solo cifre, spazi e un + iniziale (6-20 caratteri).</small>
              }
            </label>
          </div>

          <h2 class="section-title">Indirizzo predefinito</h2>
          <label class="checkbox">
            <input type="checkbox" [formControl]="hasAddress" />
            Usa un indirizzo predefinito per i nuovi ordini
          </label>
          @if (hasAddress.value) {
            <app-address-fields [form]="address" />
          }
        </section>

        <aside class="card summary">
          <h2>Account</h2>
          <div class="kv">
            <span>Email</span>
            <span>{{ p.email }}</span>
            <span>Cliente dal</span>
            <span>{{ p.createdAt | date: 'longDate' }}</span>
          </div>
          <p class="muted small">Email e password sono gestite da Keycloak.</p>
          <a class="btn btn--ghost btn--block" [href]="auth.accountUrl()" target="_blank" rel="noopener">
            Gestisci account e password
          </a>
          <button type="submit" class="btn btn--primary btn--block" [disabled]="saving()">
            {{ saving() ? 'Salvataggio…' : 'Salva modifiche' }}
          </button>
        </aside>
      </form>
    } @else {
      <div class="card card--skeleton card--tall"></div>
    }
  `,
})
export class Profile {
  private readonly users = inject(UserApi);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly personal = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    lastName: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.pattern(/^$|^\+?[0-9 ]{6,20}$/) }),
  });
  protected readonly hasAddress = new FormControl(false, { nonNullable: true });
  protected readonly address = createAddressForm();

  constructor() {
    this.users.me().subscribe({
      next: (profile) => this.apply(profile),
      error: (error: unknown) => this.loadError.set(apiErrorMessage(error)),
    });
  }

  protected save(): void {
    const includeAddress = this.hasAddress.value;
    if (this.personal.invalid || (includeAddress && this.address.invalid)) {
      this.personal.markAllAsTouched();
      this.address.markAllAsTouched();
      return;
    }
    const { firstName, lastName, phone } = this.personal.getRawValue();
    this.saving.set(true);
    this.users
      .updateMe({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        defaultShippingAddress: includeAddress ? addressValue(this.address) : null,
      })
      .subscribe({
        next: (profile) => {
          this.apply(profile);
          this.saving.set(false);
          this.notifications.success('Profilo aggiornato.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notifications.error(apiErrorMessage(error));
        },
      });
  }

  private apply(profile: UserProfile): void {
    this.profile.set(profile);
    this.personal.setValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phone: profile.phone ?? '',
    });
    this.hasAddress.setValue(profile.defaultShippingAddress !== null);
    this.address.reset(profile.defaultShippingAddress ?? undefined);
  }
}
