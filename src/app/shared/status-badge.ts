import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LABELS: Record<string, string> = {
  PLACED: 'In attesa di pagamento',
  CONFIRMED: 'Confermato',
  SHIPPED: 'Spedito',
  DELIVERED: 'Consegnato',
  CANCELLED: 'Annullato',
  COMPLETED: 'Pagato',
  FAILED: 'Rifiutato',
  REFUNDED: 'Rimborsato',
  CREATED: 'In preparazione',
};

const TONES: Record<string, string> = {
  PLACED: 'warning',
  CONFIRMED: 'info',
  CREATED: 'info',
  SHIPPED: 'accent',
  DELIVERED: 'success',
  COMPLETED: 'success',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
  FAILED: 'danger',
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge--' + tone()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<string>();
  protected readonly label = computed(() => statusLabel(this.status()));
  protected readonly tone = computed(() => TONES[this.status()] ?? 'neutral');
}
