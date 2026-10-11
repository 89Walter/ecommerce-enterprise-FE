interface RuntimeEnv {
  apiUrl?: string;
  keycloakUrl?: string;
}

/** Valori impostati da public/env.js, che nel container Docker viene generato dalle variabili d'ambiente. */
const runtime: RuntimeEnv = (globalThis as { __env?: RuntimeEnv }).__env ?? {};

/** Predefiniti: back-end locale con gateway sulla porta 8080 e Keycloak sulla 9000 (vedi docker-compose.yml). */
export const environment = {
  apiUrl: runtime.apiUrl || 'http://localhost:8080/api/v1',
  keycloak: {
    url: runtime.keycloakUrl || 'http://localhost:9000',
    realm: 'ecommerce',
    clientId: 'ecommerce-web',
  },
};
