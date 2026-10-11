import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';

type ParamValue = string | number | boolean | null | undefined;

/** Costruisce i query param ignorando i valori vuoti, così i filtri opzionali non vengono inviati. */
export function toParams(values: Record<string, ParamValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** Trasforma un 404 in null: pagamento e spedizione nascono in modo asincrono e all'inizio non esistono. */
export function nullIfNotFound<T>() {
  return (source: Observable<T>): Observable<T | null> =>
    source.pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error),
      ),
    );
}
