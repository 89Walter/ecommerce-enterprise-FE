# e-commerce-FE — frontend web (Angular)

Single-page application in **Angular 20** (componenti standalone, signals, change detection zoneless) per l'e-commerce a microservizi. Parla solo con il **gateway** (`http://localhost:8080/api/v1`) e delega il login a **Keycloak**.

## Avvio

Prerequisiti: Node.js 20.19+ (o 22.12+), back-end avviato come da README del progetto `e-commerce` (cartella `../e-commerce`).

```bash
cd e-commerce-FE
```

```bash
npm install
```

```bash
npm start
```

L'app è su **http://localhost:3000**. La porta non è casuale: è già autorizzata sia nel CORS del gateway (`CORS_ALLOWED_ORIGINS`) sia nei redirect URI del client Keycloak `ecommerce-web`. Se la cambi, aggiorna entrambi.

Gli indirizzi di gateway e Keycloak sono in [`src/environments/environment.ts`](src/environments/environment.ts).

## Autenticazione

- Client Keycloak `ecommerce-web`: pubblico, **Authorization Code + PKCE (S256)**, nessun segreto nel browser.
- Il token resta in memoria (`keycloak-js`); alla ricarica la sessione si recupera con un *check-sso* silenzioso (`public/silent-check-sso.html`).
- L'interceptor HTTP aggiunge `Authorization: Bearer …` solo alle chiamate verso il gateway e rinnova il token se scade entro 30 secondi.
- I ruoli si leggono da `realm_access.roles`: `ADMIN` sblocca il back-office. È solo una comodità di interfaccia: i permessi veri li controllano gateway e servizi.

Se Keycloak non risponde all'avvio, il catalogo resta consultabile e l'header mostra un avviso.

## Funzionalità

| Area | Pagina | API usate |
|---|---|---|
| Pubblico | Catalogo con ricerca, ordinamento e paginazione (stato nell'URL) | `GET /catalog/products` |
| Pubblico | Dettaglio prodotto | `GET /catalog/products/{id}` |
| Pubblico | Carrello (salvato in `localStorage`) | — |
| Cliente | Checkout con indirizzo precompilato dal profilo | `GET /users/me`, `POST /orders`, `PUT /users/me` |
| Cliente | I miei ordini | `GET /orders` |
| Cliente | Dettaglio ordine: timeline, pagamento, spedizione, annullamento | `GET /orders/{id}`, `GET /payments/orders/{id}`, `GET /shipments/orders/{id}`, `POST /orders/{id}/cancel` |
| Cliente | Profilo e indirizzo predefinito | `GET` / `PUT /users/me` |
| ADMIN | Prodotti: crea, modifica, elimina | `POST` / `PUT` / `DELETE /catalog/products` |
| ADMIN | Ordini con filtro per stato | `GET /orders/admin` |
| ADMIN | Spedizioni: segna spedita / consegnata | `GET /shipments/admin`, `PATCH /shipments/admin/{id}/status` |
| ADMIN | Pagamenti e clienti | `GET /payments/admin`, `GET /users/admin` |

### Stati asincroni

Dopo `POST /orders` l'ordine è `PLACED` e avanza tramite eventi RabbitMQ (pagamento → conferma → spedizione). La pagina di dettaglio **si aggiorna da sola ogni 3 secondi** finché c'è un passaggio automatico in sospeso (pagamento, creazione spedizione, rimborso dopo l'annullamento), per al massimo un minuto.

Per provare il pagamento rifiutato, ordina più di `PAYMENT_MAX_APPROVED_AMOUNT` (5000 € di default).

## Struttura

```
src/app/
├── core/
│   ├── api/            # client HTTP per servizio, modelli dei DTO, gestione errori
│   ├── auth/           # Keycloak, interceptor, guard
│   ├── cart/           # carrello (signal + localStorage)
│   └── notifications/  # toast
├── shared/             # badge di stato, paginatore, campi indirizzo, miniatura prodotto
└── features/
    ├── catalog/  cart/  checkout/  orders/  profile/
    └── admin/          # back-office, caricato solo per il ruolo ADMIN
```

Tutte le pagine sono caricate in lazy loading. Lo stile è un unico foglio globale ([`src/styles.scss`](src/styles.scss)) con token CSS e tema scuro automatico.

## Build di produzione

```bash
npm run build
```

L'output va in `dist/ecommerce-web/browser`, da servire con un qualunque web server statico che reindirizzi le rotte sconosciute su `index.html`.
