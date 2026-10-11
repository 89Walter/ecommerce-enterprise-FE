import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PageMeta } from '../core/api/models';

@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as page) {
      @if (page.totalPages > 1) {
        <nav class="paginator" aria-label="Paginazione">
          <button class="btn btn--ghost" [disabled]="page.number === 0" (click)="pageChange.emit(page.number - 1)">
            ← Precedente
          </button>
          <span class="paginator__info">Pagina {{ page.number + 1 }} di {{ page.totalPages }}</span>
          <button
            class="btn btn--ghost"
            [disabled]="page.number >= page.totalPages - 1"
            (click)="pageChange.emit(page.number + 1)"
          >
            Successiva →
          </button>
        </nav>
      }
    }
  `,
})
export class Paginator {
  readonly meta = input<PageMeta | null | undefined>();
  readonly pageChange = output<number>();
}
