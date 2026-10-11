import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <h1>Pagina non trovata</h1>
      <p>L'indirizzo che hai aperto non esiste.</p>
      <a routerLink="/" class="btn btn--primary">Torna al catalogo</a>
    </div>
  `,
})
export class NotFound {}
