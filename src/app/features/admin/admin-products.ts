import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { CatalogApi } from '../../core/api/catalog-api';
import { Page, Product } from '../../core/api/models';
import { NotificationService } from '../../core/notifications/notification.service';
import { Paginator } from '../../shared/paginator';

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <input class="toolbar__search" type="search" placeholder="Cerca prodotti…" [formControl]="search" />
      <button class="btn btn--primary" (click)="startCreate()">+ Nuovo prodotto</button>
    </div>

    @if (editing() !== null) {
      <form class="card editor" [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editing() === 'new' ? 'Nuovo prodotto' : 'Modifica prodotto #' + editingId() }}</h2>
        <div class="form-grid">
          <label class="field">
            <span>Nome</span>
            <input formControlName="name" maxlength="255" />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <small class="field__error">Obbligatorio, massimo 255 caratteri.</small>
            }
          </label>
          <label class="field">
            <span>Prezzo (€)</span>
            <input formControlName="price" type="number" min="0.01" step="0.01" />
            @if (form.controls.price.invalid && form.controls.price.touched) {
              <small class="field__error">Maggiore di zero, al massimo 2 decimali.</small>
            }
          </label>
          <label class="field field--full">
            <span>Descrizione</span>
            <textarea formControlName="description" rows="4"></textarea>
            @if (form.controls.description.invalid && form.controls.description.touched) {
              <small class="field__error">Obbligatoria.</small>
            }
          </label>
        </div>
        <div class="actions">
          <button type="button" class="btn btn--ghost" (click)="editing.set(null)">Annulla</button>
          <button type="submit" class="btn btn--primary" [disabled]="saving()">Salva</button>
        </div>
      </form>
    }

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    @if (page(); as result) {
      <div class="card table-card">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th class="num">Prezzo</th>
              <th>Creato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (product of result.content; track product.id) {
              <tr>
                <td class="muted">#{{ product.id }}</td>
                <td>
                  <strong>{{ product.name }}</strong>
                  <div class="muted small truncate">{{ product.description }}</div>
                </td>
                <td class="num">{{ product.price | currency }}</td>
                <td>{{ product.createdAt | date: 'shortDate' }}</td>
                <td class="row-actions">
                  <button class="btn btn--ghost btn--small" (click)="startEdit(product)">Modifica</button>
                  <button class="btn btn--ghost btn--small btn--danger-text" (click)="remove(product)">Elimina</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="muted center">Nessun prodotto.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginator [meta]="result.page" (pageChange)="load($event)" />
    }
  `,
})
export class AdminProducts {
  private readonly catalog = inject(CatalogApi);
  private readonly notifications = inject(NotificationService);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly page = signal<Page<Product> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<Product | 'new' | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01), Validators.pattern(/^\d{1,8}(\.\d{1,2})?$/)],
    }),
  });

  constructor() {
    this.load(0);
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load(0));
  }

  protected editingId(): number | null {
    const editing = this.editing();
    return editing && editing !== 'new' ? editing.id : null;
  }

  protected load(page: number): void {
    this.catalog.search({ search: this.search.value.trim(), page, size: 20, sort: 'id,desc' }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  protected startCreate(): void {
    this.form.reset();
    this.editing.set('new');
  }

  protected startEdit(product: Product): void {
    this.form.reset({ name: product.name, description: product.description, price: product.price });
    this.editing.set(product);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request = { name: value.name.trim(), description: value.description.trim(), price: Number(value.price) };
    const id = this.editingId();
    this.saving.set(true);
    (id === null ? this.catalog.create(request) : this.catalog.update(id, request)).subscribe({
      next: (product) => {
        this.notifications.success(`Prodotto "${product.name}" salvato.`);
        this.saving.set(false);
        this.editing.set(null);
        this.load(id === null ? 0 : (this.page()?.page.number ?? 0));
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(apiErrorMessage(error));
      },
    });
  }

  protected remove(product: Product): void {
    if (!confirm(`Eliminare definitivamente "${product.name}"?`)) {
      return;
    }
    this.catalog.delete(product.id).subscribe({
      next: () => {
        this.notifications.success('Prodotto eliminato.');
        this.load(this.page()?.page.number ?? 0);
      },
      error: (error: unknown) => this.notifications.error(apiErrorMessage(error)),
    });
  }
}
