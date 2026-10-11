import { Injectable, computed, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

import { environment } from '../../../environments/environment';

const INIT_TIMEOUT_MS = 5000;

export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

/**
 * Login tramite Keycloak con Authorization Code + PKCE (client pubblico "ecommerce-web").
 * Il token resta in memoria: alla ricarica della pagina la sessione si recupera con un check-sso silenzioso.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = new Keycloak(environment.keycloak);

  private readonly _user = signal<CurrentUser | null>(null);
  private readonly _roles = signal<string[]>([]);
  private readonly _available = signal(true);

  readonly user = this._user.asReadonly();
  readonly authenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._roles().includes('ADMIN'));
  /** False se Keycloak non era raggiungibile all'avvio: il catalogo resta consultabile, il login no. */
  readonly available = this._available.asReadonly();

  async init(): Promise<void> {
    this.keycloak.onAuthSuccess = () => this.sync();
    this.keycloak.onAuthRefreshSuccess = () => this.sync();
    this.keycloak.onAuthLogout = () => this.sync();
    this.keycloak.onTokenExpired = () => {
      this.keycloak.updateToken(30).catch(() => this.sync());
    };

    try {
      // Se Keycloak rifiuta il client, l'iframe del check-sso non risponde mai: senza timeout l'app non partirebbe.
      await Promise.race([
        this.keycloak.init({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
          checkLoginIframe: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout del check-sso.')), INIT_TIMEOUT_MS),
        ),
      ]);
    } catch (error) {
      console.error('Keycloak non raggiungibile: login disabilitato.', error);
      this._available.set(false);
    }
    this.sync();
  }

  login(returnUrl: string = location.pathname + location.search): Promise<void> {
    return this.keycloak.login({ redirectUri: location.origin + returnUrl });
  }

  register(): Promise<void> {
    return this.keycloak.register({ redirectUri: location.origin + '/' });
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: location.origin + '/' });
  }

  accountUrl(): string {
    return `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account`;
  }

  /** Restituisce un access token valido per almeno 30 secondi, o undefined se l'utente non è autenticato. */
  async getToken(): Promise<string | undefined> {
    if (!this.keycloak.authenticated) {
      return undefined;
    }
    try {
      await this.keycloak.updateToken(30);
      return this.keycloak.token;
    } catch {
      this.keycloak.clearToken();
      this.sync();
      return undefined;
    }
  }

  private sync(): void {
    const token = this.keycloak.tokenParsed;
    if (!this.keycloak.authenticated || !token) {
      this._user.set(null);
      this._roles.set([]);
      return;
    }
    const username = (token['preferred_username'] as string | undefined) ?? '';
    this._user.set({
      id: token.sub ?? '',
      username,
      fullName: (token['name'] as string | undefined) ?? username,
      email: (token['email'] as string | undefined) ?? '',
    });
    this._roles.set(token.realm_access?.roles ?? []);
  }
}
