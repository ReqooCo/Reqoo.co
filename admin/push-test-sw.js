self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let payload={title:'REQOO Notification',body:'You have a new update.'};
  try {if(event.data){const parsed=event.data.json();if(parsed&&typeof parsed==='object')payload={...payload,...parsed}}}catch{}
  const title=String(payload.title||'REQOO Notification').slice(0,100);
  const body=String(payload.body||'You have a new update.').slice(0,240);
  event.waitUntil(self.registration.showNotification(title,{body,tag:'reqoo-push',data:{url:'/admin/'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL('/admin/',self.location.origin).href;
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clients.find(c=>c.url.startsWith(url));
    if(existing)return existing.focus();
    return self.clients.openWindow(url);
  })());
});
