import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AssistantApi } from '../../core/api/assistant-api';
import { apiErrorMessage } from '../../core/api/api-error';

/** Un pezzo di testo della risposta: testo semplice oppure un riferimento "#id" a un prodotto. */
interface Segment {
  text: string;
  productId?: number;
}

interface ChatEntry {
  role: 'user' | 'assistant' | 'error';
  segments: Segment[];
}

const SUGGESTIONS = [
  "Dov'è il mio ultimo ordine?",
  'Consigliami una macchina da caffè sotto i 100 €',
  'Perché il mio ordine è stato annullato?',
  'Che cuffie avete per correre?',
];

/**
 * Chat con l'assistente AI (assistant-service). L'assistente legge catalogo, ordini, pagamenti e spedizioni
 * con i permessi dell'utente; la cronologia è conservata dal server, qui si tiene solo l'id della conversazione.
 */
@Component({
  selector: 'app-assistant-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Assistente</h1>
        <p class="muted">Chiedi dei tuoi ordini o fatti consigliare un prodotto.</p>
      </div>
      @if (entries().length > 0) {
        <button class="btn btn--ghost" [disabled]="sending()" (click)="newConversation()">Nuova conversazione</button>
      }
    </div>

    @if (available() === false) {
      <div class="alert alert--error">
        L'assistente non è configurato: va inserita la chiave ANTHROPIC_API_KEY nel file .env del back-end.
      </div>
    } @else {
      <section class="card chat">
        <div class="chat__messages" #messages>
          @if (entries().length === 0) {
            <div class="chat__welcome">
              <p class="muted">Prova a chiedere:</p>
              <div class="chat__suggestions">
                @for (suggestion of suggestions; track suggestion) {
                  <button class="chat__chip" [disabled]="sending()" (click)="send(suggestion)">{{ suggestion }}</button>
                }
              </div>
            </div>
          }

          @for (entry of entries(); track $index) {
            <div [class]="'chat__bubble chat__bubble--' + entry.role">
              @for (segment of entry.segments; track $index) {
                @if (segment.productId) {
                  <a [routerLink]="['/products', segment.productId]">{{ segment.text }}</a>
                } @else {
                  <span>{{ segment.text }}</span>
                }
              }
            </div>
          }

          @if (sending()) {
            <div class="chat__bubble chat__bubble--assistant chat__thinking pulse">
              Sto consultando il negozio…
            </div>
          }
        </div>

        <form class="chat__composer" (ngSubmit)="send(message.value)">
          <textarea
            [formControl]="message"
            rows="2"
            maxlength="2000"
            placeholder="Scrivi un messaggio… (Invio per inviare, Maiusc+Invio per andare a capo)"
            (keydown.enter)="onEnter($event)"
          ></textarea>
          <button type="submit" class="btn btn--primary" [disabled]="sending() || message.invalid">Invia</button>
        </form>
        <p class="muted small chat__note">
          Le risposte sono generate dall'intelligenza artificiale a partire dai dati del negozio e possono contenere
          errori. L'assistente non può creare o annullare ordini.
        </p>
      </section>
    }
  `,
  styles: `
    .chat { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
    .chat__messages {
      display: flex; flex-direction: column; gap: 12px;
      min-height: 320px; max-height: 60vh; overflow-y: auto; padding: 20px;
    }
    .chat__welcome { margin: auto 0; }
    .chat__suggestions { display: flex; flex-wrap: wrap; gap: 8px; }
    .chat__chip {
      border: 1px solid var(--border); background: var(--surface-muted); color: var(--text);
      border-radius: 999px; padding: 6px 14px; font: inherit; cursor: pointer;
    }
    .chat__chip:hover:not(:disabled) { border-color: var(--primary); }
    .chat__bubble {
      max-width: min(720px, 85%); padding: 10px 14px; border-radius: var(--radius);
      white-space: pre-line; line-height: 1.5; overflow-wrap: anywhere;
    }
    .chat__bubble--user { align-self: flex-end; background: var(--primary); color: var(--primary-contrast); }
    .chat__bubble--assistant { align-self: flex-start; background: var(--surface-muted); }
    .chat__bubble--error { align-self: flex-start; color: var(--danger); border: 1px solid var(--danger); }
    .chat__thinking { color: var(--text-muted); }
    .chat__composer { display: flex; gap: 10px; padding: 12px 20px; border-top: 1px solid var(--border); }
    .chat__composer textarea {
      flex: 1; resize: vertical; font: inherit; padding: 8px 10px;
      border: 1px solid var(--border); border-radius: var(--radius-small);
      background: var(--surface); color: var(--text);
    }
    .chat__composer .btn { align-self: flex-end; }
    .chat__note { padding: 0 20px 14px; margin: 0; }
  `,
})
export class AssistantPage {
  private readonly api = inject(AssistantApi);
  private readonly injector = inject(Injector);
  private readonly messagesBox = viewChild<ElementRef<HTMLElement>>('messages');

  protected readonly suggestions = SUGGESTIONS;
  protected readonly entries = signal<ChatEntry[]>([]);
  protected readonly sending = signal(false);
  protected readonly available = signal<boolean | null>(null);
  protected readonly message = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });

  private conversationId: string | undefined;

  constructor() {
    this.api.status().subscribe({
      next: (status) => this.available.set(status.available),
      // Se lo stato non è leggibile si prova comunque: l'eventuale errore comparirà nella chat.
      error: () => this.available.set(true),
    });
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.send(this.message.value);
    }
  }

  protected send(text: string): void {
    const question = text.trim();
    if (!question || this.sending()) {
      return;
    }
    this.append('user', question);
    this.message.reset();
    this.sending.set(true);

    this.api.chat({ message: question, conversationId: this.conversationId }).subscribe({
      next: (response) => {
        this.conversationId = response.conversationId;
        this.append('assistant', response.reply);
        this.sending.set(false);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          // Conversazione scaduta sul server: la prossima domanda ne apre una nuova.
          this.conversationId = undefined;
        }
        if (error instanceof HttpErrorResponse && error.status === 503 && this.isNotConfigured(error)) {
          this.available.set(false);
        }
        this.append('error', apiErrorMessage(error));
        this.sending.set(false);
      },
    });
  }

  protected newConversation(): void {
    if (this.conversationId) {
      this.api.deleteConversation(this.conversationId).subscribe({ error: () => undefined });
    }
    this.conversationId = undefined;
    this.entries.set([]);
  }

  private append(role: ChatEntry['role'], text: string): void {
    this.entries.update((entries) => [...entries, { role, segments: role === 'assistant' ? linkProducts(text) : [{ text }] }]);
    afterNextRender(
      () => {
        const box = this.messagesBox()?.nativeElement;
        box?.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }

  private isNotConfigured(error: HttpErrorResponse): boolean {
    const body = typeof error.error === 'object' ? (error.error as { message?: string } | null) : null;
    return body?.message?.includes('ANTHROPIC_API_KEY') ?? false;
  }
}

/** Trasforma i riferimenti "#123" della risposta in link alla pagina del prodotto, senza usare innerHTML. */
function linkProducts(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(/#(\d{1,9})\b/g)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ text: text.slice(last, index) });
    }
    segments.push({ text: match[0], productId: Number(match[1]) });
    last = index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last) });
  }
  return segments;
}
