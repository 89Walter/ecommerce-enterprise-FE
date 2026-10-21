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

Gli indirizzi predefiniti di gateway e Keycloak sono in [`src/environments/environment.ts`](src/environments/environment.ts) e si possono sovrascrivere senza ricompilare tramite [`public/env.js`](public/env.js), caricato prima di Angular.

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
| Cliente | Assistente AI: domande su ordini e consigli sui prodotti (i riferimenti `#id` diventano link) | `POST /assistant/chat`, `GET /assistant/status` |
| ADMIN | Prodotti: crea, modifica, elimina | `POST` / `PUT` / `DELETE /catalog/products` |
| ADMIN | Prodotti: descrizione proposta da AI, da approvare prima di salvarla | `POST /catalog/products/{id}/description-suggestion` |
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

## Immagine Docker

Il [`Dockerfile`](Dockerfile) compila l'app con Node 22 e la serve con **nginx senza privilegi di root** sulla porta 8080 del container. La configurazione di nginx ([`docker/nginx.conf`](docker/nginx.conf)) rimanda le rotte di Angular a `index.html`, tiene in cache a lungo i file con hash e mai `index.html` e `env.js`.

A ogni avvio, [`docker/40-generate-env-js.sh`](docker/40-generate-env-js.sh) rigenera `env.js` dalle variabili d'ambiente, così la stessa immagine funziona con porte diverse:

| Variabile | Predefinito | Significato |
|---|---|---|
| `API_URL` | `http://localhost:8080/api/v1` | gateway, come lo raggiunge il **browser** |
| `KEYCLOAK_URL` | `http://localhost:9000` | Keycloak, come lo raggiunge il **browser** |

Sono indirizzi pubblici e non i nomi interni della rete Docker, perché le chiamate partono dal browser dell'utente, non dal container.

### Insieme al back-end (consigliato)

Il `docker-compose.yml` del progetto `e-commerce` ha il servizio `frontend`, nel profilo `apps`, che costruisce questa cartella (`../e-commerce-FE`) e imposta le variabili a partire dal `.env`. Dalla cartella `e-commerce`:

```bash
docker compose --profile apps up -d --build
```

### Da solo

```bash
docker build -t ecommerce-web .
```

```bash
docker run --rm -p 127.0.0.1:3000:8080 ecommerce-web
```

La porta pubblicata deve essere 3000 o 5173, le sole ammesse da CORS e Keycloak.

## Build di produzione senza Docker

```bash
npm run build
```

L'output va in `dist/ecommerce-web/browser`, da servire con un qualunque web server statico che reindirizzi le rotte sconosciute su `index.html`.
