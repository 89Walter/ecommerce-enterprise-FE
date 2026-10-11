/** Indirizzi del back-end locale: gateway (porta 8080) e Keycloak (porta 9000), vedi docker-compose.yml. */
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1',
  keycloak: {
    url: 'http://localhost:9000',
    realm: 'ecommerce',
    clientId: 'ecommerce-web',
  },
};
