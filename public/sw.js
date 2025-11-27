// Service Worker para Web Push Notifications
const CACHE_VERSION = 'v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado');
  // Força a ativação imediata do novo SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(
    // Limpa caches antigos e assume controle imediatamente
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_VERSION)
            .map(name => caches.delete(name))
        );
      }),
      clients.claim()
    ])
  );
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  if (!event.data) {
    console.warn('[SW] Push sem dados');
    return;
  }

  const data = event.data.json();
  console.log('[SW] Dados do push:', data);

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: data.icon || '/favicon-96x96.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      orderId: data.orderId,
      storeId: data.storeId
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: true,
    tag: data.tag || 'notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nova Notificação', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tenta focar em uma janela existente
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Abre nova janela se não encontrar
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
