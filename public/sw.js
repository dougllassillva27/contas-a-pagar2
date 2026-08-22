const CACHE_NAME = 'dodo-finance';

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
  const reqUrl = new URL(event.request.url);

  // CORREÇÃO: Bypass total do Service Worker para o Soft Refresh para evitar travamento da Promise pendente
  if (reqUrl.searchParams.has('_t')) {
    return; // NÃO chama event.respondWith. O navegador busca diretamente da rede real!
  }

  // Bypass de cache absoluto para ambiente de desenvolvimento local (ignora totalmente o SW)
  if (reqUrl.hostname === 'localhost' || reqUrl.hostname === '127.0.0.1') {
    return; // NÃO chama event.respondWith. O navegador busca nativamente diretamente da rede real!
  }

  // 1. Network First: Navegação HTML (Dashboard/Relatório) e API. NUNCA armazena sessão cruzada.
  if (event.request.mode === 'navigate' || reqUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // 2. Network First: JS/CSS — sempre tenta a rede (deploy novo = arquivo novo),
  // cache apenas como fallback offline. Cache First aqui servia arquivo obsoleto eternamente.
  if (reqUrl.pathname.match(/\.(css|js)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const copia = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return networkRes;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Cache First: Imagens e fontes (raramente mudam; quando mudam, o ?v= do HTML quebra o cache)
  if (reqUrl.pathname.match(/\.(webp|png|woff2|ico)$/)) {
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
