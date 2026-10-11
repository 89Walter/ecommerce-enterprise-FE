import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { apiErrorMessage } from '../../core/api/api-error';
import { Page, UserProfile } from '../../core/api/models';
import { UserApi } from '../../core/api/user-api';
import { Paginator } from '../../shared/paginator';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, ReactiveFormsModule, Paginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <input class="toolbar__search" type="search" placeholder="Filtra per email…" [formControl]="email" />
    </div>

    @if (error()) {
      <div class="alert alert--error">{{ error() }}</div>
    }

    @if (page(); as result) {
      <div class="card table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Città predefinita</th>
              <th>Registrato</th>
            </tr>
          </thead>
          <tbody>
            @for (user of result.content; track user.id) {
              <tr>
                <td>
                  <strong>{{ fullName(user) }}</strong>
                  <div class="muted small"><code>{{ user.id }}</code></div>
                </td>
                <td>{{ user.email }}</td>
                <td>{{ user.phone ?? '—' }}</td>
                <td>{{ user.defaultShippingAddress?.city ?? '—' }}</td>
                <td>{{ user.createdAt | date: 'shortDate' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="muted center">Nessun cliente.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-paginator [meta]="result.page" (pageChange)="load($event)" />
    }
  `,
})
export class AdminUsers {
  private readonly users = inject(UserApi);

  protected readonly email = new FormControl('', { nonNullable: true });
  protected readonly page = signal<Page<UserProfile> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.load(0);
    this.email.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load(0));
  }

  protected load(page: number): void {
    this.users.all({ email: this.email.value.trim(), page, size: 20 }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.error.set(null);
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  protected fullName(user: UserProfile): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  }
}
