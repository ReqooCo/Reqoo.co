const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8"};
function allowedOrigin(o){return ["https://admin.reqoo.co","https://shop.reqoo.co","https://reqoo.co","https://www.reqoo.co"].includes(o)}
function json(d,s,o){return new Response(JSON.stringify(d),{status:s??200,headers:{...JSON_HEADERS,"Access-Control-Allow-Origin":allowedOrigin(o)?o:"null","Access-Control-Allow-Credentials":"true","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type, X-Admin-Key","Vary":"Origin","Cache-Control":"no-store"}})}
function admin(r,e){const k=r.headers.get("X-Admin-Key");return Boolean(e.ADMIN_KEY&&k&&k===e.ADMIN_KEY)}
async function canAccessOrder(r,e,id){
  if(admin(r,e))return true;
  const url=new URL(r.url);const token=String(url.searchParams.get('token')||'').trim();
  if(!token)return false;
  const order=await e.DB.prepare('SELECT public_token FROM orders WHERE id=? LIMIT 1').bind(id).first();
  return Boolean(order?.public_token&&order.public_token===token);
}
async function markPaidByCustomer(r,e,o,id){
  if(!(await canAccessOrder(r,e,id)))return json({error:"Order access denied"},403,o);
  const order=await e.DB.prepare("SELECT id,total_minor,payment_status FROM orders WHERE id=?").bind(id).first();
  if(!order)return json({error:"Order not found"},404,o);
  if(order.payment_status==="paid")return json({ok:true,status:"paid",message:"Order sudah dibayar."},200,o);
  const now=new Date().toISOString();
  const existing=await e.DB.prepare("SELECT id,status FROM payments WHERE order_id=? AND method='qr' ORDER BY created_at DESC LIMIT 1").bind(id).first();
  if(existing)await e.DB.prepare("UPDATE payments SET status='pending_verification',amount_minor=?,currency='MYR',metadata_json=?,updated_at=? WHERE id=?").bind(order.total_minor,JSON.stringify({customer_marked_paid:true}),now,existing.id);
  else await e.DB.prepare("INSERT INTO payments (id,order_id,provider,provider_reference,method,amount_minor,currency,status,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,"manual_qr",null,"qr",order.total_minor,"MYR","pending_verification",JSON.stringify({customer_marked_paid:true}),now,now).run();
  return json({ok:true,status:"pending_verification",message:"Bayaran ditanda dan menunggu pengesahan admin."},200,o)
}
async function verify(r,e,o,id){
  if(!admin(r,e))return json({error:"Admin key required"},401,o);
  const order=await e.DB.prepare("SELECT id,total_minor,payment_status FROM orders WHERE id=?").bind(id).first();
  if(!order)return json({error:"Order not found"},404,o);
  const payment=await e.DB.prepare("SELECT id,status FROM payments WHERE order_id=? AND method='qr' ORDER BY created_at DESC LIMIT 1").bind(id).first();
  if(!payment)return json({error:"Tiada bayaran QR untuk order ini"},400,o);
  const now=new Date().toISOString();
  await e.DB.prepare("UPDATE payments SET status='paid',paid_at=?,updated_at=?,metadata_json=? WHERE id=?").bind(now,now,JSON.stringify({verified_by:"admin",verified_at:now}),payment.id).run();
  await e.DB.prepare("UPDATE orders SET payment_status='paid',updated_at=? WHERE id=?").bind(now,id).run();
  return json({ok:true,status:"paid",order_id:id},200,o)
}
export async function manualPayment(request,env){
  const origin=request.headers.get("Origin")||"";
  if(request.method==="OPTIONS")return json({},204,origin);
  const u=new URL(request.url);
  const m=u.pathname.match(/^\/payments\/qr\/mark-paid\/([^/]+)$/);
  if(request.method==="POST"&&m)return markPaidByCustomer(request,env,origin,decodeURIComponent(m[1]));
  const v=u.pathname.match(/^\/payments\/qr\/verify\/([^/]+)$/);
  if(request.method==="POST"&&v)return verify(request,env,origin,decodeURIComponent(v[1]));
  return json({error:"Not found"},404,origin)
}
