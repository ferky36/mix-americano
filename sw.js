/* Service Worker: layered caching strategy for mix-americano */
const APP_VERSION = '2025-11-27';
const STATIC_CACHE = 'mixam-static-' + APP_VERSION;
const HTML_CACHE   = 'mixam-html-'   + APP_VERSION;
const CORE_FALLBACK = ['index.html']; // minimal app shell for offline navigations

function isSupabase(url){
  try { const u = (typeof url === 'string') ? new URL(url) : url; return /supabase\.co$/i.test(u.hostname); } catch { return false; }
}
function isHTML(req){
  if (req.mode === 'navigate') return true;
  const accept = req.headers.get('Accept') || '';
  return accept.includes('text/html');
}
function isSameOriginStaticAsset(req){
  try{
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return false;
    // static types
    return /\.(?:css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|json|webmanifest|woff2?|ttf)$/i.test(url.pathname);
  }catch{ return false; }
}

self.addEventListener('install', (event)=>{
  event.waitUntil((async()=>{
    try{
      const c = await caches.open(HTML_CACHE);
      await c.addAll(CORE_FALLBACK);
    }catch{}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event)=>{
  event.waitUntil((async()=>{
    const keep = new Set([STATIC_CACHE, HTML_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map(k => keep.has(k) ? null : caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET, auth, and Supabase/API requests
  const hasAuth = !!req.headers.get('Authorization');
  if (req.method !== 'GET' || hasAuth || isSupabase(url)) return;

  // HTML navigations: network-first, fallback to cached index.html
  if (isHTML(req)){
    event.respondWith((async()=>{
      try{
        const res = await fetch(req);
        // Cache a copy of successful navigations for back/forward
        try{ const hc = await caches.open(HTML_CACHE); hc.put(req, res.clone()); }catch{}
        return res;
      }catch{
        // Fallback to last cached request or core index.html
        const hc = await caches.open(HTML_CACHE);
        const match = await hc.match(req, { ignoreSearch:true }) || await hc.match('index.html');
        if (match) return match;
        return new Response('<!doctype html><title>Offline</title><h1>Offline</h1>', { status: 503, headers:{'Content-Type':'text/html'} });
      }
    })());
    return;
  }

  // lang.json should always be fresh: network-first with cached fallback for offline
  if (url.origin === self.location.origin && /\/lang\.json$/i.test(url.pathname)){
    event.respondWith((async()=>{
      let cache;
      try{ cache = await caches.open(STATIC_CACHE); }catch{}
      try{
        const res = await fetch(req, { cache:'no-cache' });
        if (res && res.ok && cache){ try{ await cache.put(req, res.clone()); }catch{} }
        return res;
      }catch{
        if (cache){
          const cached = await cache.match(req, { ignoreSearch:true });
          if (cached) return cached;
        }
        return new Response('{}', { status: 503, headers:{'Content-Type':'application/json'} });
      }
    })());
    return;
  }

  // Same-origin static assets: cache-first (stale-while-revalidate-ish)
  if (isSameOriginStaticAsset(req)){
    event.respondWith((async()=>{
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req, { ignoreSearch:true });
      if (cached){
        // revalidate in background
        fetch(req).then(res=>{ if (res && res.ok) cache.put(req, res.clone()); }).catch(()=>{});
        return cached;
      }
      const res = await fetch(req).catch(()=>null);
      if (res && res.ok){ try{ await cache.put(req, res.clone()); }catch{} }
      return res || new Response('', { status: 504 });
    })());
    return;
  }

  // Default: network-first without caching (third-party assets, etc.)
  event.respondWith(fetch(req).catch(async ()=>{
    // best-effort: if previously cached by HTML/STATIC, return that
    const any = await caches.match(req, { ignoreSearch:true });
    return any || new Response('Offline', { status: 503, headers:{'Content-Type':'text/plain'} });
  }));
});
