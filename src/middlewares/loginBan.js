// ==============================================================================
// 🚫 Middleware de Ban Progressivo por IP (Login Brute-Force)
// Rastreia falhas de login em memória. Bloqueia IPs após N falhas.
// Complementa o rate limiter (que limita requisições, não bane).
// ==============================================================================

const failedAttempts = new Map(); // IP → { count, firstFail, lastFail }

const CONFIG = {
  maxFailures: 10,           // Falhas antes do ban
  banDurationMs: 30 * 60 * 1000, // 30 minutos de ban
  windowMs: 15 * 60 * 1000,      // Janela de contagem (15 min)
};

/**
 * Registra uma falha de login para o IP.
 * Chamado pelo route handler de login quando autenticação falha.
 */
function registerFailure(ip) {
  const now = Date.now();
  const entry = failedAttempts.get(ip);

  if (!entry || (now - entry.firstFail) > CONFIG.windowMs) {
    // Nova janela
    failedAttempts.set(ip, { count: 1, firstFail: now, lastFail: now });
  } else {
    entry.count++;
    entry.lastFail = now;
  }
}

/**
 * Verifica se o IP está banido.
 * Retorna { banned: boolean, remainingSeconds?: number }
 */
function isBanned(ip) {
  const entry = failedAttempts.get(ip);
  if (!entry) return { banned: false };

  const now = Date.now();

  // Janela expirou? Reset.
  if ((now - entry.firstFail) > CONFIG.windowMs) {
    failedAttempts.delete(ip);
    return { banned: false };
  }

  // Atingiu threshold?
  if (entry.count >= CONFIG.maxFailures) {
    const banExpires = entry.lastFail + CONFIG.banDurationMs;
    if (now < banExpires) {
      return { banned: true, remainingSeconds: Math.ceil((banExpires - now) / 1000) };
    }
    // Ban expirou, reset
    failedAttempts.delete(ip);
    return { banned: false };
  }

  return { banned: false };
}

/**
 * Middleware: bloqueia request se IP estiver banido.
 * Aplicar ANTES do rate limiter e da rota de login.
 */
function loginBanMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const check = isBanned(ip);

  if (check.banned) {
    console.log(`[LOGIN-BAN] 🚫 IP banido: ${ip} — ${check.remainingSeconds}s restantes`);
    return res.status(429).json({
      error: `Muitas tentativas de login falharam. Tente novamente em ${Math.ceil(check.remainingSeconds / 60)} minutos.`,
    });
  }

  next();
}

/**
 * Limpa entradas antigas periodicamente (evita memory leak).
 * Rodar a cada 5 minutos.
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of failedAttempts) {
    if ((now - entry.firstFail) > CONFIG.windowMs && (now - entry.lastFail) > CONFIG.banDurationMs) {
      failedAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

module.exports = { loginBanMiddleware, registerFailure, isBanned };
