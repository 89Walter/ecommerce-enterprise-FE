# syntax=docker/dockerfile:1
FROM node:24.21.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# nginx senza privilegi di root, in ascolto sulla porta 8080 del container.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine
# Cartella scrivibile dall'utente nginx: ci finiscono gli header di sicurezza generati all'avvio.
USER root
RUN install -d -o 101 -g 101 /etc/nginx/security
USER 101
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-generate-env-js.sh /docker-entrypoint.d/40-generate-env-js.sh
COPY --from=build --chown=101:101 /app/dist/ecommerce-web/browser /usr/share/nginx/html

# Indirizzi pubblici raggiunti dal browser dell'utente, non dalla rete interna di Docker.
ENV API_URL=http://localhost:8080/api/v1 \
    KEYCLOAK_URL=http://localhost:9000

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
