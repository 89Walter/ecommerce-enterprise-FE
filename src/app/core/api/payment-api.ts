import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { nullIfNotFound, toParams } from './http-params';
import { Page, PageQuery, Payment, PaymentStatus } from './models';

@Injectable({ providedIn: 'root' })
export class PaymentApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  /** null finché il payment-service non ha ancora elaborato l'evento ORDER_PLACED. */
  forOrder(orderId: number): Observable<Payment | null> {
    return this.http.get<Payment>(`${this.baseUrl}/orders/${orderId}`).pipe(nullIfNotFound());
  }

  all(query: PageQuery & { status?: PaymentStatus | '' }): Observable<Page<Payment>> {
    return this.http.get<Page<Payment>>(`${this.baseUrl}/admin`, { params: toParams({ ...query }) });
  }
}
