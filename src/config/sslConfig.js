// ==============================================================================
// 🔒 Configuração de TLS do Postgres
//
// Segue a semântica do libpq (sslmode na DATABASE_URL):
//   disable                  → sem TLS
//   allow / prefer / require → cifra o tráfego, sem validar o certificado
//   verify-ca / verify-full  → valida o certificado
//
// DB_SSL_REJECT_UNAUTHORIZED=true|false sobrepõe a decisão (ex.: provedor com CA
// pública que usa sslmode=require).
// ==============================================================================

function montarSsl(url, override = process.env.DB_SSL_REJECT_UNAUTHORIZED) {
  const modo = (String(url || '').match(/[?&]sslmode=([a-z-]+)/i) || [])[1];
  const forcar = String(override || '').toLowerCase();
  const verificar = forcar === 'true' ? true : forcar === 'false' ? false : null;

  if (!modo && verificar === null) {
    return false; // URL não pede SSL: conexão local, sem TLS
  }

  const modoNormalizado = String(modo || 'require').toLowerCase();
  if (modoNormalizado === 'disable') {
    return false;
  }

  const validar = verificar !== null ? verificar : ['verify-ca', 'verify-full'].includes(modoNormalizado);
  return { rejectUnauthorized: validar };
}

module.exports = { montarSsl };
