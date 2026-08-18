(function(){
'use strict';
function family(){const n=navigator,s=screen,raw=[n.platform,n.language,(n.languages||[]).join(','),Intl.DateTimeFormat().resolvedOptions().timeZone,s.width,s.height,s.colorDepth,n.hardwareConcurrency,n.maxTouchPoints,n.deviceMemory||0].join('|');let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return 'FAM-'+(h>>>0).toString(16)}
function sync(){const code=String(localStorage.getItem('reqoo_pksk_license')||'').trim().toUpperCase();if(!code)return;const id=family();localStorage.setItem('reqoo_pksk_device_id',id);const cb='pkskDeviceFix_'+Date.now();window[cb]=function(r){try{delete window[cb]}catch(_){}if(r&&r.ok&&typeof window.load==='function')setTimeout(()=>window.load(),0)};const s=document.createElement('script');s.src='/api/pksk-session?'+new URLSearchParams({action:'registerDevice',callback:cb,code,deviceId:id,userAgent:navigator.userAgent,setNo:1});s.onerror=()=>{try{delete window[cb]}catch(_){}};document.body.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
