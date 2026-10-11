// Configurazione letta all'avvio, prima di Angular. In sviluppo valgono i valori predefiniti di
// src/environments/environment.ts; nel container Docker questo file viene rigenerato dalle variabili
// d'ambiente API_URL e KEYCLOAK_URL (vedi docker/40-generate-env-js.sh).
window.__env = {};
