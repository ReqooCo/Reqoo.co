// Per-app cache; all API requests remain network-only.
const PREFIX='reqoo-siv-v',CACHE=PREFIX+'2',ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'],APP='/siv/';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(APP))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  try{const r=await fetch(e.request);if(r.ok)e.waitUntil(c.put(e.request,r.clone()).catch(()=>{}));return r}
  catch(error){const hit=await c.match(e.request);if(hit)return hit;if(e.request.mode==='navigate'){const page=await c.match(new URL('index.html',self.registration.scope).href);if(page)return page}throw error}
 })());
});