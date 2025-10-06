/* Simple service worker for Scoremate PWA */
const CACHE_NAME = 'scoremate-sw-v1';
const CORE_FALLBACK = ['/', './', 'index.html'];

self.addEventListener('install', (event)=>{
  event.waitUntil((async()=>{
    try{ const c = await caches.open(CACHE_NAME); await c.addAll(CORE_FALLBACK); }catch{}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event)=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k!==CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// Network-first with cache fallback
self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if (req.method !== 'GET') return; // bypass non-GET
  event.respondWith((async()=>{
    try{
      const net = await fetch(req);
      const copy = net.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, copy).catch(()=>{});
      return net;
    }catch{
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(req, { ignoreSearch:true });
      return hit || new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});

