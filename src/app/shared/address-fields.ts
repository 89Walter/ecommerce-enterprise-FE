import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Address } from '../core/api/models';

export type AddressForm = FormGroup<{
  recipientName: FormControl<string>;
  addressLine: FormControl<string>;
  city: FormControl<string>;
  postalCode: FormControl<string>;
  countryCode: FormControl<string>;
}>;

/** Stesse regole di ShippingAddressRequest (order-service) e AddressRequest (user-service). */
export function createAddressForm(address?: Partial<Address> | null): AddressForm {
  return new FormGroup({
    recipientName: new FormControl(address?.recipientName ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    addressLine: new FormControl(address?.addressLine ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    city: new FormControl(address?.city ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    postalCode: new FormControl(address?.postalCode ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    countryCode: new FormControl(address?.countryCode ?? 'IT', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
    }),
  });
}

export function addressValue(form: AddressForm): Address {
  const value = form.getRawValue();
  return { ...value, countryCode: value.countryCode.toUpperCase() };
}

@Component({
  selector: 'app-address-fields',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-grid" [formGroup]="form()">
      <label class="field field--full">
        <span>Destinatario</span>
        <input formControlName="recipientName" autocomplete="name" />
        @if (invalid('recipientName')) {
          <small class="field__error">Obbligatorio, massimo 120 caratteri.</small>
        }
      </label>
      <label class="field field--full">
        <span>Indirizzo</span>
        <input formControlName="addressLine" autocomplete="street-address" />
        @if (invalid('addressLine')) {
          <small class="field__error">Obbligatorio, massimo 255 caratteri.</small>
        }
      </label>
      <label class="field">
        <span>Città</span>
        <input formControlName="city" autocomplete="address-level2" />
        @if (invalid('city')) {
          <small class="field__error">Obbligatoria.</small>
        }
      </label>
      <label class="field">
        <span>CAP</span>
        <input formControlName="postalCode" autocomplete="postal-code" />
        @if (invalid('postalCode')) {
          <small class="field__error">Obbligatorio.</small>
        }
      </label>
      <label class="field">
        <span>Paese</span>
        <input formControlName="countryCode" maxlength="2" autocomplete="country" class="uppercase" />
        @if (invalid('countryCode')) {
          <small class="field__error">Codice di due lettere, es. IT.</small>
        }
      </label>
    </div>
  `,
})
export class AddressFields {
  readonly form = input.required<AddressForm>();

  protected invalid(name: keyof AddressForm['controls']): boolean {
    const control = this.form().controls[name];
    return control.invalid && (control.touched || control.dirty);
  }
}
