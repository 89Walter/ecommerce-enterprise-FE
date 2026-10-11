#!/bin/sh
# Eseguito dall'entrypoint di nginx a ogni avvio del container: scrive in env.js gli indirizzi
# pubblici di gateway e Keycloak, così la stessa immagine funziona con porte o host diversi.
# Con gli stessi indirizzi genera anche gli header di sicurezza, Content-Security-Policy compresa.
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  apiUrl: "${API_URL}",
  keycloakUrl: "${KEYCLOAK_URL}"
};
EOF

echo "env.js generato: apiUrl=${API_URL}, keycloakUrl=${KEYCLOAK_URL}"

# Solo schema, host e porta: nella CSP un percorso restringerebbe la regola a quell'URL esatto.
origin_of() { printf '%s' "$1" | sed -E 's#^(https?://[^/]+).*#\1#'; }
API_ORIGIN=$(origin_of "$API_URL")
KEYCLOAK_ORIGIN=$(origin_of "$KEYCLOAK_URL")

# - script-src 'self': nessuno script inline né da altri domini, la difesa principale contro l'XSS;
# - style-src 'unsafe-inline': Angular inserisce gli stili dei componenti in tag <style>;
# - connect-src: si possono chiamare solo gateway e Keycloak, così un XSS non può spedire i token altrove;
# - frame-src: l'iframe del silent check-sso, che parte da Keycloak e torna su silent-check-sso.html;
# - frame-ancestors 'self': nessun sito esterno può incorniciare il negozio (clickjacking).
CSP="default-src 'self'; \
script-src 'self'; \
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src 'self' https://fonts.gstatic.com; \
img-src 'self' data:; \
connect-src 'self' ${API_ORIGIN} ${KEYCLOAK_ORIGIN}; \
frame-src 'self' ${KEYCLOAK_ORIGIN}; \
frame-ancestors 'self'; \
form-action 'self' ${KEYCLOAK_ORIGIN}; \
base-uri 'self'; \
object-src 'none'"

# Incluso in ogni location di nginx.conf: un add_header dentro una location annulla quelli del blocco server.
HEADERS_FILE=/etc/nginx/security/headers.conf
cat > "$HEADERS_FILE" <<EOF
add_header Content-Security-Policy "${CSP}" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
EOF

# HSTS solo quando il sito è servito in HTTPS, ad esempio dietro un reverse proxy con TLS.
if [ "${HSTS_ENABLED:-false}" = "true" ]; then
  echo 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' >> "$HEADERS_FILE"
fi

echo "Header di sicurezza generati in $HEADERS_FILE"
