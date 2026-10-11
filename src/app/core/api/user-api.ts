import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toParams } from './http-params';
import { Page, PageQuery, UpdateProfileRequest, UserProfile } from './models';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  /** Al primo accesso il profilo viene creato dai dati del token. */
  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/me`);
  }

  updateMe(request: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/me`, request);
  }

  /** ADMIN: elenco profili, con filtro opzionale sull'email. */
  all(query: PageQuery & { email?: string }): Observable<Page<UserProfile>> {
    return this.http.get<Page<UserProfile>>(`${this.baseUrl}/admin`, { params: toParams({ ...query }) });
  }
}
