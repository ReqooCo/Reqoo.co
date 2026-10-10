// Each app owns only its own cache namespace and URL scope.
const PREFIX='reqoo-lra-v', CACHE=PREFIX+'32';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
const APP_PATH='/lra/';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // API responses and other apps must never enter this app's offline cache.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(APP_PATH))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(event.request);
      if(response.ok)event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));
      return response;
    }catch(error){
      const hit=await cache.match(event.request);
      if(hit)return hit;
      if(event.request.mode==='navigate'){
        const page=await cache.match(new URL('index.html',self.registration.scope).href);
        if(page)return page;
      }
      throw error;
    }
  })());
});
