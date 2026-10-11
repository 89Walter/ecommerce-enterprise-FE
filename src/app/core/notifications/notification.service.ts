import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly _notifications = signal<Notification[]>([]);

  readonly notifications = this._notifications.asReadonly();

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text, 7000);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((notification) => notification.id !== id));
  }

  private push(kind: Notification['kind'], text: string, durationMs = 4000): void {
    const id = this.nextId++;
    this._notifications.update((list) => [...list, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
