// Service Worker MotiveMe - PWA Support et Cache Intelligent
const CACHE_NAME = 'motiveme-v1.0.2-debug';
const STATIC_CACHE_NAME = 'motiveme-static-v1.0.2-debug';
const DYNAMIC_CACHE_NAME = 'motiveme-dynamic-v1.0.2-debug';

// Mode développement: désactiver le cache agressif
const isDevelopment = location.hostname === 'localhost' || location.hostname.includes('replit.dev');

// Fichiers à mettre en cache pour le fonctionnement offline
const STATIC_FILES = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/modules/auth.js',
  '/js/modules/challenges.js',
  '/js/modules/database.js',
  '/js/modules/ui.js',
  '/js/modules/validators.js',
  '/js/modules/badges.js',
  '/js/modules/email.js',
  '/js/modules/analytics.js',
  '/js/components/modal.js',
  '/js/components/notification.js',
  '/manifest.json'
];

// URLs à mettre en cache dynamiquement
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/cdnjs\.cloudflare\.com/,
  /^http:\/\/localhost:3000\/api/
];

// URLs à ne jamais mettre en cache
const NO_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/session/
];

// ========== INSTALLATION ==========
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// ========== ACTIVATION ==========
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Supprimer les anciens caches
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated successfully');
        return self.clients.claim();
      })
  );
});

// ========== STRATÉGIE DE CACHE ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ne pas mettre en cache certaines URLs
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return fetch(request);
  }

  // Stratégie Cache First pour les fichiers statiques
  if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie Network First pour l'API backend
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

  // Stratégie Stale While Revalidate pour les autres ressources
  if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Par défaut: Network First avec fallback
  event.respondWith(networkWithFallback(request));
});

// ========== STRATÉGIES DE CACHE ==========

// Cache First: Cherche d'abord dans le cache, sinon réseau
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache First strategy failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network First: Cherche d'abord sur le réseau, sinon cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(JSON.stringify({
      error: 'Offline - Data not available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale While Revalidate: Retourne le cache et met à jour en arrière-plan
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Network with Fallback: Réseau avec fallback vers cache ou page offline
async function networkWithFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback pour la navigation
    if (request.destination === 'document') {
      return caches.match('/');
    }

    return new Response('Offline', { status: 503 });
  }
}

// ========== GESTION BACKGROUND SYNC ==========
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync event:', event.tag);

  if (event.tag === 'background-checkin') {
    event.waitUntil(syncCheckins());
  }

  if (event.tag === 'background-challenge') {
    event.waitUntil(syncChallenges());
  }
});

async function syncCheckins() {
  try {
    console.log('🔄 Syncing offline check-ins...');

    // Récupérer les check-ins en attente depuis IndexedDB
    const pendingCheckins = await getStoredCheckins();

    for (const checkin of pendingCheckins) {
      try {
        await sendCheckin(checkin);
        await removeStoredCheckin(checkin.id);
        console.log('✅ Check-in synced:', checkin.id);
      } catch (error) {
        console.error('❌ Failed to sync check-in:', checkin.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

async function syncChallenges() {
  try {
    console.log('🔄 Syncing offline challenges...');
    // Logique de synchronisation des challenges
  } catch (error) {
    console.error('❌ Challenge sync failed:', error);
  }
}

// ========== NOTIFICATIONS PUSH ==========
self.addEventListener('push', (event) => {
  console.log('📢 Push notification received');

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || '1',
      url: data.url || '/'
    },
    actions: data.actions || [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/icon-72x72.png'
      }
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MotiveMe', options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    const url = event.notification.data.url || '/';
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        // Chercher un client ouvert
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Ouvrir une nouvelle fenêtre si aucun client trouvé
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// ========== UTILITAIRES INDEXEDDB ==========
async function getStoredCheckins() {
  // Simulation - à implémenter avec IndexedDB
  return [];
}

async function removeStoredCheckin(id) {
  // Simulation - à implémenter avec IndexedDB
  console.log('Removing stored check-in:', id);
}

async function sendCheckin(checkin) {
  try {
    const response = await fetch('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(checkin)
    });

    if (response.ok) {
      console.log('✅ Check-in envoyé:', checkin);
      return true;
    }

    console.error('❌ Erreur envoi check-in');
    return false;
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
    return false;
  }
}

// ========== MESSAGES VERS L'APPLICATION ==========
self.addEventListener('message', (event) => {
  console.log('💬 Message received in SW:', event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CACHE_UPDATE':
        event.waitUntil(updateCache());
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});

async function updateCache() {
  console.log('🔄 Updating cache...');
  const cache = await caches.open(STATIC_CACHE_NAME);
  return cache.addAll(STATIC_FILES);
}

console.log('🎯 MotiveMe Service Worker loaded successfully');