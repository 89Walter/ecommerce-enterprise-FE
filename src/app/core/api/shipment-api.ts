import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { nullIfNotFound, toParams } from './http-params';
import { Page, PageQuery, Shipment, ShipmentStatus } from './models';

@Injectable({ providedIn: 'root' })
export class ShipmentApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/shipments`;

  /** null finché l'ordine non è confermato e lo shipping-service non ha creato la spedizione. */
  forOrder(orderId: number): Observable<Shipment | null> {
    return this.http.get<Shipment>(`${this.baseUrl}/orders/${orderId}`).pipe(nullIfNotFound());
  }

  all(query: PageQuery & { status?: ShipmentStatus | '' }): Observable<Page<Shipment>> {
    return this.http.get<Page<Shipment>>(`${this.baseUrl}/admin`, { params: toParams({ ...query }) });
  }

  /** ADMIN: CREATED -> SHIPPED -> DELIVERED. */
  advance(id: number, status: 'SHIPPED' | 'DELIVERED'): Observable<Shipment> {
    return this.http.patch<Shipment>(`${this.baseUrl}/admin/${id}/status`, { status });
  }
}
