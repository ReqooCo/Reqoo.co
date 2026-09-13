import { onRequest as legacy } from './shop-admin-flow-v6.js';

const S=v=>String(v??'').trim();
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}});

async function readData(request){
  if(request.method==='GET')return Object.fromEntries(new URL(request.url).searchParams);
  try{return await request.clone().json()}catch{return {}};
}

function rewritePost(request,data){
  const headers=new Headers(request.headers);
  headers.set('content-type','application/json');
  return new Request(request.url,{method:'POST',headers,body:JSON.stringify(data)});
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return legacy({request,env});
  const data=await readData(request);
  const action=S(data.action);
  const status=S(data.status).toLowerCase();

  if(action==='status'&&(status==='failed'||status==='cancelled')){
    const key=S(data.orderId||data.orderRef||data.orderNo);
    if(!key)return J({ok:false,error:'Order diperlukan'},400);
    if(!env.DB)return J({ok:false,error:'D1 binding DB tidak dijumpai'},503);
    try{
      const order=await env.DB.prepare('SELECT id,payment_status FROM orders WHERE id=? OR order_no=? LIMIT 1').bind(key,key).first();
      if(!order)return J({ok:false,error:'Order tidak dijumpai'},404);
      if(S(order.payment_status).toLowerCase()==='paid')return J({ok:false,error:'Order berbayar tidak boleh dibatalkan melalui status bayaran. Gunakan status fulfillment yang sesuai.'},409);
      return legacy({request:rewritePost(request,{...data,action:'rejectPayment',reason:S(data.reason)||`Status ditukar kepada ${status}`}),env});
    }catch(err){
      console.error('REQOO status stock safety:',err);
      return J({ok:false,error:err?.message||String(err)},500);
    }
  }

  return legacy({request,env});
}
