import {buildPushPayload} from './vendor/web-push.js';
export function validPushEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&value.length<=2048&&(u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com') }catch{return false}}
export function pushConfigured(env){return /^[A-Za-z0-9_-]{87}$/.test(env.REQOO_VAPID_PUBLIC_KEY||'')&&/^[A-Za-z0-9_-]{43}$/.test(env.REQOO_VAPID_PRIVATE_KEY||'')}
export async function sendPush(env,subscription,payload,transport=fetch){
 if(!pushConfigured(env))throw Error('Push is not configured');
 if(!validPushEndpoint(subscription.endpoint))throw Error('Invalid push service');
 const request=await buildPushPayload({data:JSON.stringify(payload),options:{ttl:3600}},subscription,{subject:'https://reqoo.co',publicKey:env.REQOO_VAPID_PUBLIC_KEY,privateKey:env.REQOO_VAPID_PRIVATE_KEY});
 return transport(subscription.endpoint,{...request,redirect:'manual',signal:AbortSignal.timeout(15000)});
}
// Called only after the canonical write succeeds. Failures never undo an order/payment.
export async function notifyAdmin(env,eventId,title,orderId){
 if(!pushConfigured(env))return;
 try{
  const order=await env.DB.prepare('SELECT order_no FROM orders WHERE id=?').bind(orderId).first();
  const payload=JSON.stringify({id:eventId,title,body:order?.order_no?`Order ${order.order_no}`:'Open Admin for details.',url:'/admin/'});
  const inserted=await env.DB.prepare('INSERT OR IGNORE INTO admin_push_events(id,payload) VALUES(?,?)').bind(eventId,payload).run();
  if(!(inserted.meta?.changes??inserted.changes))return;
  await env.DB.prepare('INSERT OR IGNORE INTO admin_push_deliveries(event_id,subscription_id) SELECT ?,id FROM admin_push_subscriptions WHERE disabled_at IS NULL').bind(eventId).run();
  const task=dispatchPush(env).catch(()=>console.error('Push dispatch pending'));
  if(env.PUSH_CTX)env.PUSH_CTX.waitUntil(task);else await task;
 }catch{console.error('Push event could not be queued')}
}
export async function dispatchPush(env,transport=fetch){
 if(!pushConfigured(env))return;
 const rows=(await env.DB.prepare("SELECT d.event_id,d.subscription_id,e.payload,s.endpoint,s.p256dh,s.auth_secret FROM admin_push_deliveries d JOIN admin_push_events e ON e.id=d.event_id JOIN admin_push_subscriptions s ON s.id=d.subscription_id WHERE d.status='pending' AND d.attempts<6 AND s.disabled_at IS NULL AND d.next_attempt_at<=unixepoch() AND e.created_at>datetime('now','-1 day') LIMIT 10").all()).results||[];
 for(const row of rows){
  // Atomic claim. An ambiguous timeout stays 'sending': do not send twice.
  const claim=await env.DB.prepare("UPDATE admin_push_deliveries SET status='sending',attempts=attempts+1 WHERE event_id=? AND subscription_id=? AND status='pending'").bind(row.event_id,row.subscription_id).run();
  if(!claim.meta?.changes)continue;
  try{
   const r=await sendPush(env,{endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_secret}},JSON.parse(row.payload),transport);
   await r.body?.cancel();
   if(r.status===404||r.status===410){await env.DB.prepare('DELETE FROM admin_push_subscriptions WHERE id=?').bind(row.subscription_id).run();}
   const state=r.ok?'sent':(r.status===429||r.status>=500)?'pending':'failed';
   await env.DB.prepare('UPDATE admin_push_deliveries SET status=?,last_status=?,next_attempt_at=unixepoch()+300 WHERE event_id=? AND subscription_id=?').bind(state,r.status,row.event_id,row.subscription_id).run();
   if(r.ok)await env.DB.prepare("UPDATE admin_push_subscriptions SET last_success_at=datetime('now') WHERE id=?").bind(row.subscription_id).run();
  }catch{await env.DB.prepare("UPDATE admin_push_deliveries SET status='uncertain' WHERE event_id=? AND subscription_id=?").bind(row.event_id,row.subscription_id).run();}
 }
}
