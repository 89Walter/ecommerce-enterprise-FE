import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toParams } from './http-params';
import { DescriptionSuggestion, Page, PageQuery, Product, ProductRequest } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/catalog/products`;

  search(query: PageQuery & { search?: string }): Observable<Page<Product>> {
    return this.http.get<Page<Product>>(this.baseUrl, { params: toParams({ ...query }) });
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(request: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, request);
  }

  update(id: number, request: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** ADMIN: chiede a Claude una nuova descrizione. Non salva nulla: per usarla serve update(). */
  suggestDescription(id: number): Observable<DescriptionSuggestion> {
    return this.http.post<DescriptionSuggestion>(`${this.baseUrl}/${id}/description-suggestion`, null);
  }
}
