import { onRequest as studentRequest } from './pksk-v56.js';
import { onRequest as adminRequest } from './pksk-admin.js';

const SAFE=/^[A-Za-z_$][A-Za-z0-9_$]*$/;

export async function onRequest(context){
  if(context.request.method!=='GET'){
    if(context.request.method==='POST' && String(context.request.headers.get('content-type')||'').includes('application/json')){
      try{
        const body=await context.request.json();
        if(Object.prototype.hasOwnProperty.call(body,'completed')) body.completed=body.completed===true||body.completed===1||body.completed==='1'||String(body.completed).toLowerCase()==='true'?'true':'';
        const headers=new Headers(context.request.headers);headers.set('content-type','application/json');
        context={...context,request:new Request(context.request.url,{method:'POST',headers,body:JSON.stringify(body)})};
      }catch(_){/* let canonical handler return its normal validation error */}
    }
    return studentRequest(context);
  }
  const url=new URL(context.request.url);
  const callback=String(url.searchParams.get('callback')||'');
  const response=await adminRequest(context);
  if(!callback || !SAFE.test(callback)) return response;
  const text=await response.text();
  let payload;
  try{payload=JSON.parse(text)}catch(_){payload={ok:false,error:'Admin API response tidak sah.'}}
  return new Response(`${callback}(${JSON.stringify(payload)});`,{status:response.status,headers:{'content-type':'application/javascript; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}
