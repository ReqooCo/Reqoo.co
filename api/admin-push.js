import {validPushEndpoint,pushConfigured,sendPush} from './admin-push-delivery.js';
// REQOO push subscription registry. Requires owner session and same-origin requests.
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const validEndpoint=validPushEndpoint;
const bytes=s=>{try{return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}catch{return new Uint8Array()}};
export async function handleAdminPush(request,env,authenticated){
 if(!authenticated)return response({ok:false,error:'Unauthorized'},401);
 const u=new URL(request.url),path=u.pathname;
 const origin=request.headers.get('origin');
 const allowedOrigins=new Set(['https://reqoo.co','https://www.reqoo.co','https://api.reqoo.co','https://admin.reqoo.co']);
 if(origin&&!allowedOrigins.has(origin))return response({ok:false,error:'Invalid origin'},403);
 if(path==='/api/admin-push/config'){
  if(request.method!=='GET')return response({ok:false,error:'Method not allowed'},405);
  const publicKey=String(env.REQOO_VAPID_PUBLIC_KEY||'');
  if(!pushConfigured(env))return response({ok:false,error:'Push is not configured'},503);
  return response({ok:true,publicKey});
 }
 if(!['/api/admin-push/subscribe','/api/admin-push/test','/api/admin-push/status'].includes(path)||!['POST','DELETE'].includes(request.method))return response({ok:false,error:'Not found'},404);
 if(!origin||!allowedOrigins.has(origin))return response({ok:false,error:'Trusted origin required'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return response({ok:false,error:'JSON required'},415);
 if(!env.DB)return response({ok:false,error:'Database unavailable'},503);
 const raw=await request.text();if(raw.length>7000)return response({ok:false,error:'Payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return response({ok:false,error:'Invalid JSON'},400)}
 const endpoint=String(data?.endpoint||'');
 if(!validEndpoint(endpoint))return response({ok:false,error:'Invalid endpoint'},400);
 let operation='storage';
 try{
 if(path==='/api/admin-push/status'){
  const row=await env.DB.prepare('SELECT last_success_at FROM admin_push_subscriptions WHERE endpoint=? AND disabled_at IS NULL').bind(endpoint).first();return response({ok:true,enabled:!!row,lastSuccessAt:row?.last_success_at||null});
 }
 if(path==='/api/admin-push/test'){
  if(request.method!=='POST')return response({ok:false,error:'Method not allowed'},405);
  const row=await env.DB.prepare('SELECT * FROM admin_push_subscriptions WHERE endpoint=? AND disabled_at IS NULL').bind(endpoint).first();
  if(!row)return response({ok:false,error:'Enable notifications on this device first'},404);
  const limit=await env.DB.prepare("UPDATE admin_push_subscriptions SET updated_at=datetime('now') WHERE id=? AND updated_at<=datetime('now','-10 seconds')").bind(row.id).run();
  if(!limit.meta?.changes)return response({ok:false,error:'Wait 10 seconds before testing again'},429);
  operation='delivery';
  const r=await sendPush(env,{endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_secret}},{id:crypto.randomUUID(),title:'REQOO Test',body:'Notifications are working.',url:'/admin/'});await r.body?.cancel();
  if([404,410].includes(r.status))await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(endpoint).run();
  return response({ok:r.ok,accepted:r.ok,...(!r.ok?{error:'Push service rejected delivery',status:r.status}:{})},r.ok?200:502);
 }
 if(request.method==='DELETE'){
  await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(endpoint).run();
  return response({ok:true});
 }
 const p256dh=data?.keys?.p256dh,auth=data?.keys?.auth;
 if(bytes(p256dh||'').length!==65||bytes(p256dh||'')[0]!==4||bytes(auth||'').length!==16)return response({ok:false,error:'Invalid subscription keys'},400);
 try{await crypto.subtle.importKey('raw',bytes(p256dh),{name:'ECDH',namedCurve:'P-256'},false,[])}catch{return response({ok:false,error:'Invalid public key'},400)}
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare("INSERT INTO admin_push_subscriptions (id,endpoint,p256dh,auth_secret) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,updated_at=datetime('now'),disabled_at=NULL").bind(id,endpoint,p256dh,auth).run();
 return response({ok:true});
 }catch(e){console.error('Admin push operation failed',{operation,name:e?.name||'Error'});return response({ok:false,error:operation==='delivery'?'Push delivery unavailable. Try again.':'Subscription storage unavailable'},503)}
}
