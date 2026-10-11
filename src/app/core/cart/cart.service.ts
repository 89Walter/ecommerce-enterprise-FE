import { Injectable, computed, effect, signal } from '@angular/core';

import { Product } from '../api/models';

export interface CartItem {
  productId: number;
  name: string;
  /** Prezzo visto nel catalogo; quello definitivo lo fissa l'order-service alla creazione dell'ordine. */
  price: number;
  quantity: number;
}

const STORAGE_KEY = 'ecommerce.cart';
/** Limiti di CreateOrderRequest / OrderItemRequest. */
export const MAX_DISTINCT_ITEMS = 50;
export const MAX_QUANTITY = 99;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(readStoredCart());

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this._items().reduce((sum, item) => sum + item.price * item.quantity, 0));
  readonly isEmpty = computed(() => this._items().length === 0);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
      } catch {
        // Storage non disponibile (navigazione privata): il carrello resta solo in memoria.
      }
    });
  }

  /** Restituisce false se il carrello ha già il numero massimo di prodotti distinti. */
  add(product: Product, quantity = 1): boolean {
    const existing = this._items().find((item) => item.productId === product.id);
    if (existing) {
      this.setQuantity(product.id, existing.quantity + quantity);
      return true;
    }
    if (this._items().length >= MAX_DISTINCT_ITEMS) {
      return false;
    }
    this._items.update((items) => [
      ...items,
      { productId: product.id, name: product.name, price: product.price, quantity: clamp(quantity) },
    ]);
    return true;
  }

  setQuantity(productId: number, quantity: number): void {
    this._items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity: clamp(quantity) } : item)),
    );
  }

  remove(productId: number): void {
    this._items.update((items) => items.filter((item) => item.productId !== productId));
  }

  clear(): void {
    this._items.set([]);
  }
}

function clamp(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity) || 1));
}

function readStoredCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}
