import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleAdminPush} from '../api/admin-push.js';
import {sendPush,notifyAdmin,dispatchPush} from '../api/admin-push-delivery.js';
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
const b64=v=>Buffer.from(v).toString('base64url');
const env={REQOO_VAPID_PRIVATE_KEY:jwk.d,REQOO_VAPID_PUBLIC_KEY:b64(await crypto.subtle.exportKey('raw',pair.publicKey))};
const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const auth=crypto.getRandomValues(new Uint8Array(16));
const subscription={endpoint:'https://web.push.apple.com/test',keys:{p256dh:b64(await crypto.subtle.exportKey('raw',receiver.publicKey)),auth:b64(auth)}};
const sqlite=new DatabaseSync(':memory:');
for(const p of ['20261102_admin_push_subscriptions.sql','20261102_admin_push_delivery.sql'])sqlite.exec(fs.readFileSync(new URL('../migrations/'+p,import.meta.url),'utf8'));
sqlite.exec("CREATE TABLE orders(id TEXT PRIMARY KEY,order_no TEXT); INSERT INTO orders VALUES('o1','RQ-TEST')");
env.DB={prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:sqlite.prepare(sql).run(...args)}}}}};
const request=(path,body,origin='https://admin.reqoo.co',method='POST')=>new Request('https://api.reqoo.co/api/admin-push/'+path,{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('owner authentication, origin CSRF and endpoint allowlist',async()=>{
 assert.equal((await handleAdminPush(request('subscribe',subscription),env,false)).status,401);
 assert.equal((await handleAdminPush(request('subscribe',subscription,'https://evil.test'),env,true)).status,403);
 assert.equal((await handleAdminPush(request('subscribe',subscription,''),env,true)).status,403);
 assert.equal((await handleAdminPush(request('subscribe',{...subscription,endpoint:'https://127.0.0.1/'}),env,true)).status,400);
 assert.equal((await handleAdminPush(request('subscribe',{...subscription,keys:{p256dh:'bad',auth:'bad'}}),env,true)).status,400);
});
test('two devices, upsert without duplicates, device status and disable',async()=>{
 for(const endpoint of [subscription.endpoint,subscription.endpoint+'2',subscription.endpoint])assert.equal((await handleAdminPush(request('subscribe',{...subscription,endpoint}),env,true)).status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_push_subscriptions').get().n,2);
 assert.equal((await (await handleAdminPush(request('status',subscription),env,true)).json()).enabled,true);
 assert.equal((await handleAdminPush(request('subscribe',{endpoint:subscription.endpoint+'2'},undefined,'DELETE'),env,true)).status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_push_subscriptions').get().n,1);
});
test('RFC8291 payload decrypts and VAPID signature verifies',async()=>{
 await sendPush(env,subscription,{title:'REQOO Test'},async(url,req)=>{
  const headers=new Headers(req.headers);assert.equal(headers.get('content-encoding'),'aes128gcm');
  const authorization=headers.get('authorization');assert.match(authorization,/^vapid t=/);
  const token=authorization.match(/t=([^,]+)/)[1],parts=token.split('.');
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pair.publicKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts[0]+'.'+parts[1])),true);
  assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).aud,'https://web.push.apple.com');
  const body=new Uint8Array(req.body),salt=body.slice(0,16),len=body[20],sender=body.slice(21,21+len);
  const senderKey=await crypto.subtle.importKey('raw',sender,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:senderKey},receiver.privateKey,256);
  const derive=async(ikm,salt,info,bits)=>crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']),bits);
  const info=Buffer.concat([Buffer.from('WebPush: info\0'),Buffer.from(subscription.keys.p256dh,'base64url'),sender]);
  const ikm=await derive(shared,auth,info,256),cek=await derive(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),128),nonce=await derive(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),96);
  const clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']),body.slice(21+len)));
  let end=clear.length-1;while(clear[end]===0)end--;assert.equal(clear[end],2);assert.deepEqual(JSON.parse(new TextDecoder().decode(clear.slice(0,end))),{title:'REQOO Test'});
  assert.equal(req.redirect,'manual');return new Response(null,{status:201});
 });
});
test('deduplication, concurrent claims, expiry removal and retry status',async()=>{
 const tasks=[];const e={...env,PUSH_CTX:{waitUntil(p){tasks.push(p)}}};
 // Queue without external delivery; claim with a controlled transport below.
 const original=globalThis.fetch;let count=0;globalThis.fetch=async()=>{count++;return new Response(null,{status:201})};
 try{await notifyAdmin(e,'order:o1','New Order','o1');await Promise.all(tasks);await notifyAdmin(e,'order:o1','New Order','o1');await Promise.all(tasks);assert.equal(count,1);
 await Promise.all([dispatchPush(e),dispatchPush(e)]);assert.equal(count,1);
 await env.DB.prepare("INSERT INTO admin_push_events(id,payload) VALUES('expired','{}')").run();await env.DB.prepare("INSERT INTO admin_push_deliveries(event_id,subscription_id) SELECT 'expired',id FROM admin_push_subscriptions").run();await dispatchPush(e,async()=>new Response(null,{status:410}));assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM admin_push_subscriptions').get().n,0);
 }finally{globalThis.fetch=original}
});

test('Cloudflare-compatible redirect handling does not follow push-service redirects',async()=>{
 let calls=0;
 const response=await sendPush(env,subscription,{title:'Test'},async(url,init)=>{
  calls++;if(init.redirect==='error')throw new TypeError('Invalid redirect value at the edge');
  assert.equal(init.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://untrusted.example/'}});
 });
 assert.equal(response.status,302);assert.equal(response.ok,false);assert.equal(calls,1);
});
