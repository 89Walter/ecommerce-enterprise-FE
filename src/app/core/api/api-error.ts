import { HttpErrorResponse } from '@angular/common/http';

/** Corpo di ApiErrorResponse / ValidationErrorResponse dei microservizi. */
interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string>;
}

/** Messaggio leggibile per l'utente a partire da un errore HTTP del gateway o di un servizio. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Si è verificato un errore inatteso.';
  }
  if (error.status === 0) {
    return 'Impossibile contattare il server. Verifica che il gateway sia avviato.';
  }
  if (error.status === 401) {
    return 'Sessione scaduta: accedi di nuovo.';
  }
  if (error.status === 403) {
    return 'Non hai i permessi per questa operazione.';
  }
  const body = (typeof error.error === 'object' ? error.error : null) as ApiErrorBody | null;
  const details = body?.errors ? Object.values(body.errors) : [];
  if (details.length > 0) {
    return details.join(' ');
  }
  if (body?.message) {
    return body.message;
  }
  if (error.status === 503 || error.status === 504) {
    return 'Il servizio non è al momento disponibile. Riprova tra poco.';
  }
  return `Errore ${error.status}.`;
}
