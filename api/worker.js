import { onRequest as handleCore } from '../functions/api/core.js';
import { onRequest as handleSimAdmin } from './sim-admin.js';
import { onRequest as handleShopAdmin } from './shop-admin.js';
import { onRequest as handleProductImage } from '../functions/api/product-image.js';
import { onRequest as handleInvoice } from '../functions/api/invoice-v1.js';
import { onRequest as handleLicense } from '../functions/api/license-v1.js';
import { onRequest as handleShop } from './shop-v2.js';
import { handle as handlePksk } from './pksk.js';
import { handle as handleHero } from './hero.js';

function withAdminEnv(env) {
  const admin = env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || env.SHOP_ADMIN_TOKEN || '';
  return {...env,SHOP_DB:env.DB,PR00FS:env.MEDIA,REQOO_ADMIN_TOKEN:admin,SHOP_ADMIN_TOKEN:env.SHOP_ADMIN_TOKEN||admin,PKSK_ADMIN_TOKEN:env.PKSK_ADMIN_TOKEN||admin,ADMIN_API_KEY:env.ADMIN_API_KEY||admin,BILLPLZ_API_KEY:env.BILLPLZ_API_KEY||env.BILLPLZ_KEY||'',BILLPLZ_COLLECTION_ID:env.BILLPLZ_COLLECTION_ID||'',BILLPLZ_X_SIGNATURE:env.BILLPLZ_X_SIGNATURE||env.BILLPLZ_X_SIGNATURE_KEY||''};
}
async function shopAdminCompat(request,env){
  if(request.method!=='POST')return handleShopAdmin({request,env});
  try{const d=await request.clone().json();if(String(d.action)==='status'&&String(d.status||'').toLowerCase()==='completed')d.status='fulfilled';return handleShopAdmin({request:new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(d)}),env})}catch{return handleShopAdmin({request,env})}
}
export default {async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname,bridgedEnv=withAdminEnv(env);if(path==='/api/shop'||path==='/api/billplz')return handleShop(request,bridgedEnv);if(path==='/api/pksk')return handlePksk(request,bridgedEnv);if(path==='/api/shop-hero')return handleHero(request,bridgedEnv);if(path==='/api/core')return handleCore({request,env:bridgedEnv});if(path==='/api/sim-admin')return handleSimAdmin({request,env:bridgedEnv});if(path==='/api/shop-admin')return shopAdminCompat(request,bridgedEnv);if(path==='/api/product-image')return handleProductImage({request,env:bridgedEnv,ctx});if(path==='/api/invoice-v1'||path.startsWith('/api/invoice-v1/'))return handleInvoice({request,env:bridgedEnv});if(path==='/api/license-v1'||path.startsWith('/api/license-v1/'))return handleLicense({request,env:bridgedEnv});if(path==='/api/health')return new Response(JSON.stringify({ok:!!env.DB,service:'reqoo-api',db:!!env.DB,media:!!env.MEDIA}),{status:env.DB?200:503,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}});return new Response(JSON.stringify({ok:false,error:'Not found'}),{status:404,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store','access-control-allow-origin':'*'}})}};
