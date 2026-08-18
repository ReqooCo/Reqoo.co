const ALLOWED_CALLBACK=/^[A-Za-z_$][A-Za-z0-9_$]*$/;

export async function onRequest(context){
  const {request,env}=context;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders()});
  try{
    const d=await readInput(request);
    const result=await deleteOrder(d,env);
    return respond(result,d.callback||'');
  }catch(e){return respond({ok:false,error:String(e?.message||e)})}
}

async function readInput(request){
  const url=new URL(request.url),q=Object.fromEntries(url.searchParams.entries());
  if(request.method==='GET')return q;
  const ct=request.headers.get('content-type')||'';
  if(ct.includes('application/json'))return {...await request.json(),callback:q.callback||''};
  return q;
}
function corsHeaders(){return {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,X-Admin-Token','cache-control':'no-store'}}
function respond(obj,callback=''){
  const text=JSON.stringify(obj);
  if(callback&&ALLOWED_CALLBACK.test(callback))return new Response(`${callback}(${text});`,{headers:{'content-type':'application/javascript; charset=UTF-8',...corsHeaders()}});
  return new Response(text,{headers:{'content-type':'application/json; charset=UTF-8',...corsHeaders()}});
}
async function isAdmin(d,env){
  const token=String(d.token||'');
  if(!token)return false;
  try{
    const row=await env.DB.prepare('SELECT admin_token FROM sim_admin_settings WHERE id=1 LIMIT 1').first();
    const expected=String(row?.admin_token||env.PKSK_ADMIN_TOKEN||'');
    return !!expected&&token===expected;
  }catch(_){
    const expected=String(env.PKSK_ADMIN_TOKEN||'');
    return !!expected&&token===expected;
  }
}
async function deleteOrder(d,env){
  if(!(await isAdmin(d,env)))return {ok:false,error:'Unauthorized'};
  const orderNo=String(d.orderNo||'').trim();
  if(!orderNo)return {ok:false,error:'Order diperlukan'};
  const order=await env.DB.prepare('SELECT id,payment_status,payment_ref FROM orders WHERE id=?').bind(orderNo).first();
  if(!order)return {ok:false,error:'Order tidak dijumpai'};
  const status=String(order.payment_status||'').toLowerCase();
  if(status==='paid'&&String(d.forcePaid||'')!=='DELETE')return {ok:false,error:'Order PAID memerlukan pengesahan DELETE.'};

  const licenses=(await env.DB.prepare('SELECT id,access_code FROM licenses WHERE order_id=?').bind(orderNo).all()).results||[];
  let proofDeleted=false;
  const ref=String(order.payment_ref||'');
  if(ref.startsWith('proof:')&&env.PROOFS){
    const key=ref.slice(6);
    if(key){try{await env.PROOFS.delete(key);proofDeleted=true}catch(_){}}
  }

  for(const l of licenses){
    await env.DB.prepare('DELETE FROM progress WHERE license_id=?').bind(l.id).run();
    await env.DB.prepare('DELETE FROM devices WHERE license_id=?').bind(l.id).run();
    await env.DB.prepare('DELETE FROM licenses WHERE id=?').bind(l.id).run();
  }
  const r=await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(orderNo).run();
  if(!r.meta?.changes)return {ok:false,error:'Order gagal dipadam.'};
  return {ok:true,orderNo,deleted:true,status:String(order.payment_status||'').toUpperCase(),licensesDeleted:licenses.length,proofDeleted};
}
