(()=>{
 const panel=document.createElement('details');panel.className='rqPush';panel.innerHTML='<summary>Notifications</summary><p id="rqPushStatus" role="status" aria-live="polite">Checking this device…</p><div><button type="button" id="rqPushEnable">Enable Notifications</button> <button type="button" id="rqPushDisable">Disable Notifications</button> <button type="button" id="rqPushTest">Send Test Notification</button></div>';
 const css=document.createElement('style');css.textContent='.rqPush{margin:12px auto;padding:12px 14px;max-width:960px;border:1px solid #C5A36A;border-radius:14px;background:#fff;color:#145744;box-shadow:0 4px 16px #14574412;font:13px -apple-system,sans-serif}.rqPush summary{cursor:pointer;font-weight:700}.rqPush button{min-height:44px;padding:8px 12px;border:1px solid #145744;border-radius:9px;background:#E9F2EC;color:#145744;font:inherit;cursor:pointer;margin:3px 0}.rqPush button:disabled{opacity:.45}.rqPush p{color:#145744}';document.head.append(css);
 const main=document.querySelector('main');if(main)main.before(panel);else document.body.prepend(panel);
 const status=panel.querySelector('p'),enable=panel.querySelector('#rqPushEnable'),disable=panel.querySelector('#rqPushDisable'),test=panel.querySelector('#rqPushTest');
 let registration;
 const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
 const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>navigator.standalone||matchMedia('(display-mode: standalone)').matches;
 const say=s=>status.textContent=s;
 async function api(path,body,method='POST'){const r=await fetch('/api/admin-push/'+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(r.status===401?'Sign in to Admin first.':d.error||'Request failed');return d}
 async function reg(){registration=await navigator.serviceWorker.register('/admin/push-test-sw.js',{scope:'/admin/'});if(!registration.active){const worker=registration.installing||registration.waiting;if(worker)await new Promise((resolve,reject)=>{const check=()=>worker.state==='activated'?resolve():worker.state==='redundant'?reject(Error('Service worker failed to activate.')):null;worker.addEventListener('statechange',check);check()})}return registration}
 async function refresh(){if(!supported()){say('Notifications are unavailable in this browser.');enable.disabled=disable.disabled=test.disabled=true;return}if(ios()&&!standalone()){say('In Safari, use Share → Add to Home Screen, then open REQOO Admin from its icon.');enable.disabled=disable.disabled=test.disabled=true;return}const r=await reg(),sub=await r.pushManager.getSubscription();let active=false;if(sub){const d=await api('status',{endpoint:sub.endpoint});active=d.enabled}say(active?'Enabled on this device.':Notification.permission==='denied'?'Blocked. Allow notifications in your device settings.':'Disabled on this device.');enable.disabled=active||Notification.permission==='denied';disable.disabled=!sub;test.disabled=!active}
 async function action(fn){enable.disabled=disable.disabled=test.disabled=true;try{await fn()}catch(e){say(e.message);enable.disabled=false;disable.disabled=false;test.disabled=false}}
 enable.onclick=()=>action(async()=>{
  // The permission call must begin synchronously in the click handler on iOS.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted.');
  const r=await reg(),configResponse=await fetch('/api/admin-push/config',{cache:'no-store'}),config=await configResponse.json();if(!configResponse.ok)throw Error(config.error||'Sign in first.');
  const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  let sub=await r.pushManager.getSubscription();if(sub&&JSON.stringify(Array.from(new Uint8Array(sub.options.applicationServerKey)))!==JSON.stringify(Array.from(key))){await sub.unsubscribe();sub=null}
  sub=sub||await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await api('subscribe',sub.toJSON());await refresh();say('Enabled. Wait 10 seconds, then send a test notification.');
 });
 disable.onclick=()=>action(async()=>{const sub=await (await reg()).pushManager.getSubscription();if(sub){await api('subscribe',{endpoint:sub.endpoint},'DELETE');await sub.unsubscribe()}await refresh()});
 test.onclick=()=>action(async()=>{const sub=await (await reg()).pushManager.getSubscription();if(!sub)throw Error('Enable notifications first.');await api('test',{endpoint:sub.endpoint});await refresh();say('Test accepted by the push service. Check your notifications.');});
 refresh().catch(e=>say(e.message));
})();
