import { onRequest as studentRequest } from './pksk-v56.js';
import { onRequest as adminRequest } from './pksk-admin.js';

const SAFE=/^[A-Za-z_$][A-Za-z0-9_$]*$/;

export async function onRequest(context){
  if(context.request.method!=='GET') return studentRequest(context);
  const url=new URL(context.request.url);
  const callback=String(url.searchParams.get('callback')||'');
  const response=await adminRequest(context);
  if(!callback || !SAFE.test(callback)) return response;
  const text=await response.text();
  let payload;
  try{payload=JSON.parse(text)}catch(_){payload={ok:false,error:'Admin API response tidak sah.'}}
  return new Response(`${callback}(${JSON.stringify(payload)});`,{
    status:response.status,
    headers:{'content-type':'application/javascript; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}
  });
}
