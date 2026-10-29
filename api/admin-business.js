/* Business workspace APIs. Owner auth is bridged by worker.js; staff permissions
   are checked server-side before any legacy handler receives an owner token. */
const S=v=>String(v??'').trim(),now=()=>new Date().toISOString(),uid=p=>p+'_'+crypto.randomUUID();
export const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function sign(secret,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))}
function equal(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256))}
export function staffCookie(value='',ttl=0){return 'rq_staff_session='+encodeURIComponent(value)+'; Path=/api/; Max-Age='+ttl+'; HttpOnly; Secure; SameSite=Strict'}
export async function staffIdentity(request,env,secret){
 const match=(request.headers.get('cookie')||'').match(/(?:^|;\s*)rq_staff_session=([^;]+)/);if(!match||!secret)return null;
 try{const raw=decodeURIComponent(match[1]),parts=raw.split('.');if(parts.length!==4)return null;const [id,version,exp,sig]=parts,n=Math.floor(Date.now()/1000);if(Number(exp)<=n||Number(exp)>n+28860)return null;const expected=await sign(secret,'staff:'+parts.slice(0,3).join('.'));if(!equal(expected,sig))return null;const r=await env.DB.prepare('SELECT id,name,role,version FROM reqoo_staff WHERE id=? AND active=1').bind(id).first();return r&&Number(r.version)===Number(version)?{id:r.id,name:r.name,role:r.role}:null}catch{return null}
}
export async function staffLogin(request,env,secret,d){
 if(request.method!=='POST')return json({ok:false,error:'Gunakan POST.'},405);
 const username=S(d.username).toLowerCase(),password=String(d.token||d.password||'');if(!/^[a-z0-9._-]{3,60}$/.test(username)||password.length<8||password.length>256)return json({ok:false,error:'Maklumat login tidak sah.'},401);
 // Rate-limit both account and source. Keys are hashed; no password or IP is logged.
 const source=request.headers.get('cf-connecting-ip')||'local',keys=await Promise.all([sign(secret,'login-user:'+username),sign(secret,'login-source:'+source)]),time=Math.floor(Date.now()/1000);
 for(const key of keys){const r=await env.DB.prepare('SELECT attempts,reset_at FROM reqoo_staff_attempts WHERE key=?').bind(key).first();if(r&&r.reset_at>time&&r.attempts>=10)return json({ok:false,error:'Terlalu banyak cubaan. Cuba selepas 15 minit.'},429)}
 await env.DB.batch(keys.map(key=>env.DB.prepare('INSERT INTO reqoo_staff_attempts(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').bind(key,time+900,time,time)));
 const user=await env.DB.prepare('SELECT * FROM reqoo_staff WHERE username=? AND active=1').bind(username).first();const computed=await passwordHash(password,user?.salt||'invalid-account-timing-salt');
 if(!user||!equal(computed,user.password_hash))return json({ok:false,error:'Username atau password salah.'},401);
 const payload=[user.id,user.version,time+28800].join('.'),res=json({ok:true,authenticated:true,role:user.role,name:user.name,expiresIn:28800});
 res.headers.append('set-cookie',staffCookie(payload+'.'+await sign(secret,'staff:'+payload),28800));res.headers.append('set-cookie','rq_admin_session=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');return res;
}
const commonReads=['ordersDashboard','getOrder','productionDashboard','getProductionMeta','listProductionMeta','getOrderArtwork','paymentSummary'];
const salesReads=['listCostMaterials','quotationHistory','listDocuments','getDocument','documentFlow','documentWorkspaces','documentSettings','documentLinks','paymentSummary','listPayments','getPaymentReceipt','documentsFinanceDashboard','documentsMonthlySummary','customerDashboard','customerDetail','customerRecords'];
const salesWrites=['saveCostMaterial','createCustomQuotation','updateCustomQuotation','updateCustomQuotationStatus','convertCustomQuotationToOrder','createOrderQuotation','createDocument'];
export function staffAllowed(role,path,method,d){
 const action=S(d.action),read=method==='GET';
 if(path==='/api/admin-session')return true;
 if(path==='/api/admin-business')return read&&['identity','globalSearch','orderProgress','customerLookup',...(role==='sales'?['todayTasks']:[])].includes(action);
 if(path==='/api/shop-admin'){
  if(read)return commonReads.includes(action)||(role==='sales'&&salesReads.includes(action));
  if(method!=='POST')return false;
  if(action==='setWorkStatus')return role==='production'&&['processing','fulfilled','delivered'].includes(S(d.status));
  if(action==='status')return role==='production'&&['processing','fulfilled'].includes(S(d.status));
  if(['saveProductionMeta'].includes(action))return role==='production';
  return role==='sales'&&salesWrites.includes(action);
 }
 return false;
}
export async function auditStart(env,request,d){
 const actor=env.ADMIN_ACTOR||{id:'owner',name:'Owner',role:'owner'},id=uid('audit');
 const detail={};for(const k of ['basePrice','salePriceMinor','status','type','amountMinor','actualPaidMinor','paymentType','materialsMinor','labourMinor','shippingMinor','otherMinor','role','active'])if(d[k]!==undefined)detail[k]=String(d[k]).slice(0,100);
 if(d.action==='saveProduct'&&S(d.id)){try{const previous=await env.DB.prepare('SELECT base_price_minor,sale_price_minor,status FROM products WHERE id=?').bind(S(d.id)).first();if(previous)detail.before=previous}catch{}}
 await env.DB.prepare('INSERT INTO reqoo_admin_activity(id,actor_id,actor_name,role,action,target,detail_json,outcome,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,actor.id,actor.name,actor.role,S(d.action).slice(0,80),S(d.orderId||d.documentId||d.productId||d.staffId||d.id).slice(0,160),JSON.stringify(detail),'started',now()).run();return id;
}
export async function auditEnd(env,id,response){
 const row=await env.DB.prepare('SELECT detail_json FROM reqoo_admin_activity WHERE id=?').bind(id).first(),detail=JSON.parse(row?.detail_json||'{}');
 try{const body=await response.clone().json(),source=body.document||body.payment||body.order;if(source){detail.after={};for(const k of ['id','number','receipt_number','total_minor','amount_minor','status','payment_status','fulfillment_status'])if(source[k]!=null)detail.after[k]=source[k]}}catch{}
 await env.DB.prepare('UPDATE reqoo_admin_activity SET outcome=?,detail_json=? WHERE id=?').bind(response.ok?'success':'failed:'+response.status,JSON.stringify(detail),id).run()
}
const LIMIT=40;
function amount(v){const n=Number(v??0);if(!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('Kos mestilah jumlah sah dalam sen, tanpa nilai negatif.');return n}
function page(d){return Math.max(0,Math.min(1000000,Math.floor(Number(d.offset)||0)))}
const orderQuery='SELECT o.*,c.name customer_name,c.phone customer_phone FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ';
export async function businessApi(request,env,d){
 const actor=env.ADMIN_ACTOR||{id:'owner',name:'Owner',role:'owner'},owner=actor.role==='owner',action=S(d.action),post=request.method==='POST';
 if(!owner&&!staffAllowed(actor.role,'/api/admin-business',request.method,d))return json({ok:false,error:'Akses ini hanya untuk Owner.'},403);
 const writes=['archiveWorkspace','restoreWorkspace','saveOrderCosts','saveStaff'];if(writes.includes(action)&&!post)return json({ok:false,error:'Gunakan POST untuk perubahan.'},405);
 try{
 if(action==='identity')return json({ok:true,identity:actor});
 if(action==='globalSearch'){
  const q=S(d.q).slice(0,160);if(q.length<2)return json({ok:true,results:[]});
  const pattern=q.toLowerCase(),results=[];
  const orders=(await env.DB.prepare(orderQuery+"WHERE instr(lower(COALESCE(o.order_no,o.id)||' '||COALESCE(c.name,'')||' '||COALESCE(c.phone,'')),?)>0 ORDER BY o.created_at DESC,o.id DESC LIMIT 12").bind(pattern).all()).results||[];
  for(const o of orders)results.push({kind:'Order',title:o.order_no||o.id,subtitle:o.customer_name||'',url:'/admin/orders.html?order='+encodeURIComponent(o.id)});
  if(actor.role!=='production'){
   const docs=(await env.DB.prepare("SELECT id,order_id,number,type,customer_name FROM reqoo_documents WHERE instr(lower(number||' '||COALESCE(customer_name,'')||' '||COALESCE(customer_phone,'')),?)>0 ORDER BY created_at DESC,id DESC LIMIT 12").bind(pattern).all()).results||[];
   for(const r of docs)results.push({kind:r.type,title:r.number,subtitle:r.customer_name||'',url:'/admin/documents.html?order='+encodeURIComponent(r.order_id)});
   const payments=(await env.DB.prepare("SELECT p.receipt_number,p.order_id,c.name FROM reqoo_payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN customers c ON c.id=o.customer_id WHERE p.status='confirmed' AND instr(lower(p.receipt_number||' '||COALESCE(c.name,'')||' '||COALESCE(c.phone,'')),?)>0 ORDER BY p.created_at DESC,p.id DESC LIMIT 12").bind(pattern).all()).results||[];
   for(const r of payments)if(!results.some(x=>x.title===r.receipt_number))results.push({kind:'Resit',title:r.receipt_number,subtitle:r.name||'',url:'/admin/documents.html?order='+encodeURIComponent(r.order_id)});
   const cs=(await env.DB.prepare("SELECT id,name,phone FROM customers WHERE status='active' AND instr(lower(name||' '||COALESCE(phone,'')||' '||COALESCE(email,'')),?)>0 ORDER BY name,id LIMIT 8").bind(pattern).all()).results||[];
   for(const c of cs)results.push({kind:'Pelanggan',title:c.name,subtitle:c.phone||'',url:'/admin/customers.html?customer='+encodeURIComponent(c.id)});
  }
  return json({ok:true,results,limited:results.length>=12});
 }
 if(action==='customerLookup'){
  const q=S(d.q).slice(0,100);if(q.length<2)return json({ok:true,customers:[]});
  const rows=(await env.DB.prepare("SELECT id,name,phone,email FROM customers WHERE status='active' AND instr(lower(name||' '||COALESCE(phone,'')||' '||COALESCE(email,'')),lower(?))>0 ORDER BY name,id LIMIT 12").bind(q).all()).results||[];return json({ok:true,customers:rows});
 }
 if(action==='orderProgress'){
  const o=await env.DB.prepare(orderQuery+'WHERE o.id=?').bind(S(d.orderId)).first();if(!o)return json({ok:false,error:'Order tidak dijumpai.'},404);
  const docs=(await env.DB.prepare('SELECT type,status,number FROM reqoo_documents WHERE order_id=? ORDER BY created_at,id').bind(o.id).all()).results||[];
  const paid=Number((await env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) total FROM reqoo_payments WHERE order_id=? AND status='confirmed'").bind(o.id).first())?.total||0),quote=docs.find(x=>x.type==='quotation'),invoice=docs.find(x=>x.type==='invoice'),delivered=o.fulfillment_status==='fulfilled'&&!!(await env.DB.prepare('SELECT delivered_at FROM reqoo_order_handoffs WHERE order_id=?').bind(o.id).first()),cancelled=o.fulfillment_status==='cancelled'||o.payment_status==='cancelled';
  const stages=[{key:'quotation',label:'Quotation',done:!!quote,optional:!quote&&(!!invoice||['processing','fulfilled'].includes(o.fulfillment_status))},{key:'approval',label:'Kelulusan',done:quote?['accepted','converted'].includes(quote.status):true,optional:!quote},{key:'payment',label:'Bayaran / deposit',done:paid>0||['paid','partial'].includes(o.payment_status)},{key:'production',label:'Production',done:['processing','fulfilled'].includes(o.fulfillment_status)},{key:'delivery',label:'Serahan',done:delivered},{key:'settled',label:'Lunas',done:paid>=Number(o.total_minor)||o.payment_status==='paid'}];
  const next=cancelled?null:stages.find(x=>!x.done&&!x.optional);return json({ok:true,orderId:o.id,cancelled,stages,next:next?.key||'complete',message:cancelled?'Order dibatalkan.':next?({quotation:'Sediakan quotation atau teruskan invoice untuk order terus.',approval:'Dapatkan kelulusan pelanggan sebelum meneruskan.',payment:'Sediakan invoice dan rekod bayaran / deposit.',production:'Semak item dan mula production.',delivery:'Tandakan siap, kemudian rekod serahan.',settled:'Rekod baki bayaran.'}[next.key]):'Semua langkah selesai.',url:next?.key==='production'?'/admin/production.html?q='+encodeURIComponent(o.order_no||o.id):'/admin/documents.html?order='+encodeURIComponent(o.id)});
 }
 if(action==='todayTasks'){
  const offset=page(d),kind=['all','quotation','payment','production','delivery'].includes(d.kind)?d.kind:'all';
  const sql="WITH tasks AS (SELECT 'quotation' kind,d.id id,d.order_id,d.number reference,d.customer_name customer,COALESCE(d.due_at,d.created_at) due_at,'Quotation menunggu kelulusan' title FROM reqoo_documents d WHERE d.type='quotation' AND d.status NOT IN ('accepted','converted','rejected','cancelled','void') AND NOT EXISTS(SELECT 1 FROM reqoo_documents i WHERE i.order_id=d.order_id AND i.type='invoice') UNION ALL SELECT 'payment',o.id,o.id,COALESCE(o.order_no,o.id),c.name,o.created_at,'Bayaran / baki belum selesai' FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.payment_status IN ('pending','partial') AND o.fulfillment_status!='cancelled' UNION ALL SELECT 'production',o.id,o.id,COALESCE(o.order_no,o.id),c.name,COALESCE(m.due_date,o.created_at),'Production perlu disiapkan' FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN shop_production_meta m ON m.order_id=o.id WHERE o.payment_status IN ('paid','partial') AND o.fulfillment_status IN ('pending','processing') UNION ALL SELECT 'delivery',o.id,o.id,COALESCE(o.order_no,o.id),c.name,o.updated_at,'Rekod serahan' FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE o.fulfillment_status='fulfilled' AND NOT EXISTS(SELECT 1 FROM reqoo_order_handoffs h WHERE h.order_id=o.id)) SELECT * FROM tasks WHERE (?='all' OR kind=?) AND (kind='payment' OR NOT EXISTS(SELECT 1 FROM reqoo_workspace_archives a WHERE a.order_id=tasks.order_id)) ORDER BY due_at,id LIMIT 41 OFFSET ?";
  const rows=(await env.DB.prepare(sql).bind(kind,kind,offset).all()).results||[];return json({ok:true,tasks:rows.slice(0,40).map(t=>({...t,url:t.kind==='production'?'/admin/production.html?q='+encodeURIComponent(t.reference):'/admin/documents.html?order='+encodeURIComponent(t.order_id)})),offset,hasMore:rows.length>40});
 }
 if(action==='archiveWorkspace'||action==='restoreWorkspace'){
  const id=S(d.orderId);if(!id||S(d.confirmReference)!==S(d.reference))return json({ok:false,error:'Rujukan tidak sepadan. Muat semula.'},400);
  const o=await env.DB.prepare('SELECT id,order_no FROM orders WHERE id=?').bind(id).first(),doc=await env.DB.prepare("SELECT MAX(CASE WHEN type='quotation' THEN number END) quote_number,MAX(CASE WHEN type='invoice' THEN number END) invoice_number,MIN(number) other_number FROM reqoo_documents WHERE order_id=?").bind(id).first();
  const ref=o?.order_no||doc?.quote_number||doc?.invoice_number||o?.id||doc?.other_number;if(!ref)return json({ok:false,error:'Rekod tidak dijumpai.'},404);if(S(d.reference)!==ref)return json({ok:false,error:'Rujukan berubah. Muat semula.'},409);
  if(action==='archiveWorkspace'){await env.DB.prepare('INSERT INTO reqoo_workspace_archives(order_id,reference,reason,actor_name,created_at) VALUES(?,?,?,?,?) ON CONFLICT(order_id) DO NOTHING').bind(id,ref,S(d.reason).slice(0,300),actor.name,now()).run()}
  else await env.DB.prepare('DELETE FROM reqoo_workspace_archives WHERE order_id=?').bind(id).run();
  return json({ok:true,archived:action==='archiveWorkspace'});
 }
 if(action==='archives')return json({ok:true,items:(await env.DB.prepare('SELECT * FROM reqoo_workspace_archives ORDER BY created_at DESC,order_id LIMIT 41 OFFSET ?').bind(page(d)).all()).results||[]});
 if(action==='orderCosts'||action==='saveOrderCosts'){
  const id=S(d.orderId),order=await env.DB.prepare('SELECT id,total_minor,payment_status,fulfillment_status FROM orders WHERE id=?').bind(id).first();if(!order)return json({ok:false,error:'Order tidak dijumpai.'},404);
  if(action==='saveOrderCosts'){
   const vals=['materialsMinor','labourMinor','shippingMinor','otherMinor'].map(k=>amount(d[k])),revision=Number(d.revision||0);
   if(revision===0){const exists=await env.DB.prepare('SELECT revision FROM reqoo_order_costs WHERE order_id=?').bind(id).first();if(exists)return json({ok:false,error:'Kos telah dikemas kini. Muat semula sebelum simpan.'},409);await env.DB.prepare('INSERT INTO reqoo_order_costs(order_id,materials_minor,labour_minor,shipping_minor,other_minor,note,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?,1,?,?)').bind(id,...vals,S(d.note).slice(0,500),now(),actor.name).run()}
   else{const r=await env.DB.prepare('UPDATE reqoo_order_costs SET materials_minor=?,labour_minor=?,shipping_minor=?,other_minor=?,note=?,revision=revision+1,updated_at=?,updated_by=? WHERE order_id=? AND revision=?').bind(...vals,S(d.note).slice(0,500),now(),actor.name,id,revision).run();if(Number(r.meta?.changes??r.changes??0)!==1)return json({ok:false,error:'Kos berubah dalam sesi lain. Muat semula.'},409)}
  }
  const cost=await env.DB.prepare('SELECT * FROM reqoo_order_costs WHERE order_id=?').bind(id).first();return json({ok:true,order,cost:cost||null});
 }
 if(action==='marginReport'){
  const q=S(d.q).slice(0,100),offset=page(d),limit=Math.min(40,Math.max(5,Math.floor(Number(d.limit)||40))),rows=(await env.DB.prepare("SELECT o.id,o.order_no,o.total_minor,o.payment_status,o.fulfillment_status,c.name customer_name,k.materials_minor,k.labour_minor,k.shipping_minor,k.other_minor,k.revision,k.updated_at FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN reqoo_order_costs k ON k.order_id=o.id WHERE instr(lower(COALESCE(o.order_no,o.id)||' '||COALESCE(c.name,'')),lower(?))>0 AND NOT EXISTS(SELECT 1 FROM reqoo_workspace_archives a WHERE a.order_id=o.id) AND o.fulfillment_status!='cancelled' AND o.payment_status NOT IN ('cancelled','failed','refunded') ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?").bind(q,limit+1,offset).all()).results||[];
  return json({ok:true,items:rows.slice(0,limit).map(r=>({...r,cost_minor:r.revision?Number(r.materials_minor)+Number(r.labour_minor)+Number(r.shipping_minor)+Number(r.other_minor):null,profit_minor:r.revision?Number(r.total_minor)-Number(r.materials_minor)-Number(r.labour_minor)-Number(r.shipping_minor)-Number(r.other_minor):null})),offset,limit,hasMore:rows.length>limit});
 }
 if(action==='staffList')return json({ok:true,staff:(await env.DB.prepare('SELECT id,username,name,role,active,version,created_at FROM reqoo_staff ORDER BY name,id').all()).results||[]});
 if(action==='saveStaff'){
  const id=S(d.staffId),role=S(d.role),name=S(d.name).slice(0,80),username=S(d.username).toLowerCase(),password=String(d.password||'');if(!['sales','production'].includes(role)||!name||!/^[a-z0-9._-]{3,60}$/.test(username))return json({ok:false,error:'Nama, username dan role tidak sah.'},400);
  if((!id||password)&& (password.length<12||password.length>256))return json({ok:false,error:'Password staf perlu 12–256 aksara.'},400);
  const existing=id?await env.DB.prepare('SELECT id FROM reqoo_staff WHERE id=?').bind(id).first():null;if(id&&!existing)return json({ok:false,error:'Staf tidak dijumpai.'},404);
  const taken=await env.DB.prepare('SELECT id FROM reqoo_staff WHERE username=? AND id!=?').bind(username,id).first();if(taken)return json({ok:false,error:'Username telah digunakan.'},409);
  if(id){if(password){const salt=crypto.randomUUID(),hash=await passwordHash(password,salt);await env.DB.prepare('UPDATE reqoo_staff SET username=?,name=?,role=?,active=?,password_hash=?,salt=?,version=version+1,updated_at=? WHERE id=?').bind(username,name,role,d.active===false?0:1,hash,salt,now(),id).run()}else await env.DB.prepare('UPDATE reqoo_staff SET username=?,name=?,role=?,active=?,version=version+1,updated_at=? WHERE id=?').bind(username,name,role,d.active===false?0:1,now(),id).run()}
  else{const salt=crypto.randomUUID(),hash=await passwordHash(password,salt);await env.DB.prepare('INSERT INTO reqoo_staff(id,username,name,role,password_hash,salt,active,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(uid('staff'),username,name,role,hash,salt,d.active===false?0:1,now(),now()).run()}
  return json({ok:true});
 }
 if(action==='activity')return json({ok:true,items:(await env.DB.prepare('SELECT id,actor_name,role,action,target,detail_json,outcome,created_at FROM reqoo_admin_activity ORDER BY created_at DESC,id DESC LIMIT 41 OFFSET ?').bind(page(d)).all()).results||[]});
 return json({ok:false,error:'Tindakan tidak dijumpai.'},404);
 }catch(e){console.error('Admin business action failed:',action);return json({ok:false,error:e.message&&/Kos mestilah/.test(e.message)?e.message:'Tindakan gagal. Muat semula dan cuba lagi.'},e.message&&/Kos mestilah/.test(e.message)?400:500)}
}
