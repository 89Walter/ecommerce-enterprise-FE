import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Il catalogo non gestisce immagini: mostriamo un riquadro colorato, stabile per ogni prodotto, con le iniziali. */
@Component({
  selector: 'app-product-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="thumb" [class.thumb--large]="large()" [style.--hue]="hue()" aria-hidden="true">{{ initials() }}</div>`,
})
export class ProductThumb {
  readonly name = input.required<string>();
  readonly large = input(false);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  protected readonly hue = computed(() => {
    let hash = 0;
    for (const char of this.name()) {
      hash = (hash * 31 + char.charCodeAt(0)) % 360;
    }
    return hash;
  });
}
