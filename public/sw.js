self.addEventListener('fetch', (event) => {
  // Service Worker simplificado apenas para cumprir requisito mínimo do PWA reinstalável no Chrome.
  // Bypass de rede para garantir sempre a versão mais nova do servidor sem lidar com cache-busting complexo.
  event.respondWith(fetch(event.request));
});
