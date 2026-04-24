const CACHE_NAME = 'dodo-finance-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força atualização imediata, ignorando ciclo de vida padrão do PWA
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache); // Expurga caches sujos de outras sessões
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Assume o controle das abas abertas imediatamente
  );
});

self.addEventListener('fetch', (event) => {
  const url = new url(event.request.url);

  // 1. Network First: Navegação HTML (Dashboard/Relatório) e API. NUNCA armazena sessão cruzada.
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // 2. Cache First: Apenas estáticos imutáveis
  if (url.pathname.match(/\.(css|js|webp|png|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((networkRes) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkRes.clone());
              return networkRes;
            });
          })
        );
      })
    );
    return;
  }

  // Fallback padrão
  event.respondWith(fetch(event.request));
});
