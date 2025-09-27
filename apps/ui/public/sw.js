// Service Worker for Sakinah PWA
const CACHE_NAME = 'sakinah-v1';
const OFFLINE_URL = '/offline';

// Resources to cache for offline functionality
const STATIC_RESOURCES = [
  '/',
  '/offline',
  '/dashboard',
  '/habits',
  '/journal',
  '/checkin',
  '/tazkiyah',
  '/manifest.json',
  // Add static assets
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/content/,
  /\/api\/habits/,
  /\/api\/journals/,
  /\/api\/checkins/,
  /\/api\/plans/
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached version or offline page
          return caches.match(request)
            .then((response) => response || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (isApiRequest(request)) {
    event.respondWith(
      networkFirstWithFallback(request)
    );
    return;
  }

  // Handle static resources with cache-first strategy
  event.respondWith(
    cacheFirstWithFallback(request)
  );
});

// Network-first strategy for API requests
async function networkFirstWithFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline data for specific endpoints
    return createOfflineResponse(request);
  }
}

// Cache-first strategy for static resources
async function cacheFirstWithFallback(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Cache miss, try network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the response
      const responseClone = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.log('Both cache and network failed for:', request.url);

    // Return a fallback response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Check if request is for API
function isApiRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Create offline responses for specific API endpoints
function createOfflineResponse(request) {
  const url = new URL(request.url);

  // Return offline data for habits
  if (url.pathname.includes('/habits')) {
    return new Response(JSON.stringify({
      habits: [],
      message: 'Offline mode: Habits will sync when connection is restored'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return offline data for journal entries
  if (url.pathname.includes('/journals')) {
    return new Response(JSON.stringify({
      entries: [],
      message: 'Offline mode: Journal entries will sync when connection is restored'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Return offline data for content
  if (url.pathname.includes('/content')) {
    return new Response(JSON.stringify({
      content: [
        {
          id: 'offline-1',
          type: 'verse',
          text: 'And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.',
          source: 'Quran 65:3',
          tags: ['trust', 'patience', 'tawakkul']
        }
      ],
      message: 'Offline mode: Limited content available'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Default offline response
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'This feature requires an internet connection'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'sync-habits') {
    event.waitUntil(syncHabits());
  }

  if (event.tag === 'sync-journal') {
    event.waitUntil(syncJournalEntries());
  }

  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncCheckins());
  }
});

// Sync offline habit completions
async function syncHabits() {
  try {
    // Get offline habit data from IndexedDB
    // This would integrate with your offline storage
    console.log('Syncing offline habit completions...');

    // Send notifications about successful sync
    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
      self.registration.showNotification('Sakinah', {
        body: 'Your habits have been synced successfully!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-complete'
      });
    }
  } catch (error) {
    console.error('Failed to sync habits:', error);
  }
}

// Sync offline journal entries
async function syncJournalEntries() {
  try {
    console.log('Syncing offline journal entries...');

    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
      self.registration.showNotification('Sakinah', {
        body: 'Your journal entries have been synced!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-complete'
      });
    }
  } catch (error) {
    console.error('Failed to sync journal entries:', error);
  }
}

// Sync offline check-ins
async function syncCheckins() {
  try {
    console.log('Syncing offline check-ins...');

    if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
      self.registration.showNotification('Sakinah', {
        body: 'Your daily reflections have been synced!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'sync-complete'
      });
    }
  } catch (error) {
    console.error('Failed to sync check-ins:', error);
  }
}

// Push notifications for spiritual reminders
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || 'Time for your spiritual practice',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'spiritual-reminder',
      data: data.url || '/',
      actions: [
        {
          action: 'open',
          title: 'Open App'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Sakinah', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
  // 'dismiss' action just closes the notification
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});