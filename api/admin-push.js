// REQOO push subscription registry. Requires owner session and same-origin requests.
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const validEndpoint=(s)=>{try{const u=new URL(s);return u.protocol==='https:'&&u.username===''&&u.password===''&&s.length<=2048}catch{return false}};
const keyOk=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{12,180}$/.test(s);
export async function handleAdminPush(request,env,authenticated){
 if(!authenticated)return response({ok:false,error:'Unauthorized'},401);
 const u=new URL(request.url),path=u.pathname;
 if(request.headers.get('origin')&&request.headers.get('origin')!==u.origin)return response({ok:false,error:'Invalid origin'},403);
 if(path==='/api/admin-push/config'){
  if(request.method!=='GET')return response({ok:false,error:'Method not allowed'},405);
  const publicKey=String(env.REQOO_VAPID_PUBLIC_KEY||'');
  if(!/^[A-Za-z0-9_-]{80,100}$/.test(publicKey))return response({ok:false,error:'Push is not configured'},503);
  return response({ok:true,publicKey});
 }
 if(path!=='/api/admin-push/subscribe'||!['POST','DELETE'].includes(request.method))return response({ok:false,error:'Not found'},404);
 if(request.headers.get('origin')!==u.origin)return response({ok:false,error:'Same-origin required'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return response({ok:false,error:'JSON required'},415);
 if(!env.DB)return response({ok:false,error:'Database unavailable'},503);
 const raw=await request.text();if(raw.length>7000)return response({ok:false,error:'Payload too large'},413);
 let data;try{data=JSON.parse(raw)}catch{return response({ok:false,error:'Invalid JSON'},400)}
 const endpoint=String(data?.endpoint||'');
 if(!validEndpoint(endpoint))return response({ok:false,error:'Invalid endpoint'},400);
 try{
 if(request.method==='DELETE'){
  await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE endpoint=?').bind(endpoint).run();
  return response({ok:true});
 }
 const p256dh=data?.keys?.p256dh,auth=data?.keys?.auth;
 if(!keyOk(p256dh)||!keyOk(auth))return response({ok:false,error:'Invalid subscription keys'},400);
 const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 await env.DB.prepare("INSERT INTO admin_push_subscriptions (id,endpoint,p256dh,auth_secret) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,updated_at=datetime('now'),disabled_at=NULL").bind(id,endpoint,p256dh,auth).run();
 return response({ok:true});
 }catch{return response({ok:false,error:'Subscription storage unavailable'},503)}
}
