// Service Worker for Receipt Scanner PWA
const CACHE_NAME = 'receipt-scanner-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/history',
  '/export',
  '/offline.html',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png'
];

// Dynamic cache for API responses and images
const DYNAMIC_CACHE_NAME = 'receipt-scanner-dynamic-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Install failed', error);
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
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and other schemes
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, try to serve offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline - İnternet bağlantısı gerekli', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for queued receipts (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'receipt-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncReceipts());
  }
});

async function syncReceipts() {
  try {
    // Future: Sync locally stored receipts when back online
    console.log('Service Worker: Syncing receipts...');
    
    // Get queued receipts from IndexedDB
    const queuedReceipts = await getQueuedReceipts();
    
    if (queuedReceipts.length > 0) {
      // Process each queued receipt
      for (const receipt of queuedReceipts) {
        try {
          // Future: Send to server or cloud storage
          console.log('Service Worker: Processing queued receipt', receipt.id);
          
          // Mark as synced
          await markReceiptAsSynced(receipt.id);
        } catch (error) {
          console.error('Service Worker: Failed to sync receipt', receipt.id, error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Helper functions for future IndexedDB integration
async function getQueuedReceipts() {
  // Future: Get receipts from IndexedDB that need syncing
  return [];
}

async function markReceiptAsSynced(receiptId) {
  // Future: Mark receipt as synced in IndexedDB
  console.log('Service Worker: Marked receipt as synced', receiptId);
}

// Push notification support (future enhancement)
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/icon-96.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'Görüntüle',
        icon: '/assets/images/icon-96.png'
      },
      {
        action: 'dismiss',
        title: 'İptal',
        icon: '/assets/images/icon-96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Fiş Tarayıcı', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});