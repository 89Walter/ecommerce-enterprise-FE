import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toParams } from './http-params';
import { CreateOrderRequest, Order, OrderStatus, Page, PageQuery } from './models';

@Injectable({ providedIn: 'root' })
export class OrderApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  create(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, request);
  }

  /** Solo gli ordini dell'utente autenticato. */
  mine(query: PageQuery = {}): Observable<Page<Order>> {
    return this.http.get<Page<Order>>(this.baseUrl, { params: toParams({ ...query }) });
  }

  get(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  cancel(id: number, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  /** ADMIN: tutti gli ordini, con filtro opzionale per stato. */
  all(query: PageQuery & { status?: OrderStatus | '' }): Observable<Page<Order>> {
    return this.http.get<Page<Order>>(`${this.baseUrl}/admin`, { params: toParams({ ...query }) });
  }
}
