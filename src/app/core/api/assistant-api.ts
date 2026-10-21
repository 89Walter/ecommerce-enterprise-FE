import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AssistantChatRequest, AssistantChatResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AssistantApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/assistant`;

  /** La cronologia resta sul server: si manda solo il nuovo messaggio e l'id della conversazione. */
  chat(request: AssistantChatRequest): Observable<AssistantChatResponse> {
    return this.http.post<AssistantChatResponse>(`${this.baseUrl}/chat`, request);
  }

  /** false se sul server manca la chiave API: la pagina mostra un avviso invece della chat. */
  status(): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${this.baseUrl}/status`);
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/conversations/${conversationId}`);
  }
}
