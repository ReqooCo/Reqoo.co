const API_ORIGIN='https://api.reqoo.co';
const BOTANICAL='<link rel="stylesheet" href="/assets/botanical-atelier-v1.css?v=3">';

async function proxyApi(request,url){
  const target=new URL(`${API_ORIGIN}${url.pathname}${url.search}`);
  const proxied=new Request(target.toString(),request);
  return fetch(proxied);
}

async function injectBotanical(response){
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  const body=html.includes('botanical-atelier-v1.css')?html:html.replace('</head>',BOTANICAL+'</head>');
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-theme','botanical-atelier-v1');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function injectShopRuntime(response,force=false){
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  if(!force&&!html.includes('heroProduct'))return new Response(html,response);
  const cleaned=html
    .replace(/<script[^>]+src=["']\/shop\/(?:hero-runtime|shop-enhance)\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'')
    .replace(/<script[^>]+src=["']\/shop\/(?:shop-core-v[0-9]+|shop-inventory-v[0-9]+|postpurchase-v[0-9]+|account-premium-v[0-9]+)\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["']\/shop\/(?:shop-(?:mobile|desktop|inventory)-premium-v[0-9]+|shop-inventory-v[0-9]+|account-premium-v[0-9]+|shop-premium-v[0-9]+)\.css(?:\?[^"']*)?["'][^>]*>/gi,'');
  const isPublicShop=html.includes('<title>REQOO.CO — Shop</title>'),isAccount=html.includes('<title>REQOO.CO — Akaun</title>');
  const shopUi=isPublicShop?'<link rel="stylesheet" href="/shop/shop-mobile-premium-v1.css?v=1"><link rel="stylesheet" href="/shop/shop-desktop-premium-v1.css?v=1"><link rel="stylesheet" href="/shop/shop-inventory-v1.css?v=1"><link rel="stylesheet" href="/shop/shop-premium-v2.css?v=3">':isAccount?'<link rel="stylesheet" href="/shop/account-premium-v1.css?v=1">':'';
  const withUi=cleaned.replace('</head>',shopUi+'</head>');
  const runtime=isPublicShop?'<script src="/shop/shop-core-v1.js?v=6"></script><script src="/shop/shop-inventory-v1.js?v=1"></script><script src="/shop/postpurchase-v1.js?v=1"></script>':isAccount?'<script src="/shop/account-premium-v1.js?v=1"></script>':'<script src="/shop/shop-core-v1.js?v=6"></script>';
  const body=withUi.replace('</body>',runtime+'</body>');
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-shop-runtime','shop-v2');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function injectLandingRuntime(response){
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  const cleaned=html.replace(/<script[^>]+src=["']\/landing-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'').replace(/<link[^>]+href=["']\/landing-premium-v[0-9]+\.css(?:\?[^"']*)?["'][^>]*>/gi,'');
  const withUi=cleaned.replace('</head>','<link rel="stylesheet" href="/landing-premium-v2.css?v=2"></head>');
  const body=withUi.replace('</body>','<script src="/landing-runtime.js?v=2"></script></body>');
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-page','campaign-landing-v2');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function injectAdminUI(response){
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  const routed=html.replace(/const API='https:\/\/api\.reqoo\.co\/api\/shop-admin',IMAGE_API='https:\/\/api\.reqoo\.co\/api\/product-image',TOKEN_KEY=/g,"const API=location.origin+'/api/shop-admin',IMAGE_API=location.origin+'/api/product-image',TOKEN_KEY=");
  const isShopAdmin=html.includes('<title>REQOO.CO — Shop Admin</title>'),isOverview=html.includes('<title>REQOO Admin — Control Centre</title>');
  let body=routed.includes('/admin/reqoo-admin-universal.css')?routed:routed.replace('</head>','<link rel="stylesheet" href="/admin/reqoo-admin-universal.css?v=2"></head>');
  if(!body.includes('/admin/admin-shell-v2.css'))body=body.replace('</head>','<link rel="stylesheet" href="/admin/admin-shell-v2.css?v=1"></head>');
  if(!body.includes('/admin/admin-theme-v3.css'))body=body.replace('</head>','<link rel="stylesheet" href="/admin/admin-theme-v3.css?v=2"></head>');
  if(isOverview&&!body.includes('/admin/overview-v2.css'))body=body.replace('</head>','<link rel="stylesheet" href="/admin/overview-v2.css?v=2"></head>');
  if(!body.includes('/admin/admin-flow-v1.css'))body=body.replace('</head>','<link rel="stylesheet" href="/admin/admin-flow-v1.css?v=2"></head>');
  if(isShopAdmin&&!body.includes('/admin/shop-admin-v1.css'))body=body.replace('</head>','<link rel="stylesheet" href="/admin/shop-admin-v1.css?v=1"><link rel="stylesheet" href="/admin/shop-orders-premium-v1.css?v=1"><link rel="stylesheet" href="/admin/shop-products-premium-v1.css?v=1"><link rel="stylesheet" href="/admin/shop-inventory-v1.css?v=1"><link rel="stylesheet" href="/admin/shop-inventory-v2.css?v=2"><link rel="stylesheet" href="/admin/shop-fulfillment-v1.css?v=1"><link rel="stylesheet" href="/admin/shop-production-queue-v1.css?v=3"><link rel="stylesheet" href="/admin/shop-production-queue-v2.css?v=1"><link rel="stylesheet" href="/admin/shop-order-production-v1.css?v=1"></head>');
  if(/id=["']orderModal["']/.test(body))body=body.replace('</body>','<script src="/shop/admin-whatsapp-docs-v1.js?v=2"></script><script src="/shop/admin-fulfillment-v1.js?v=2"></script><script src="/shop/admin-production-queue-safe-v1.js?v=1"></script><script src="/shop/admin-order-production-v1.js?v=1"></script></body>');
  if(isShopAdmin&&!body.includes('/shop/admin-inventory-v2.js'))body=body.replace('</body>','<script src="/shop/admin-inventory-v2.js?v=3"></script></body>');
  if(isOverview&&!body.includes('/admin/overview-v2.js'))body=body.replace('</body>','<script src="/admin/overview-v2.js?v=3"></script></body>');
  if(!body.includes('/admin/admin-shell-v2.js'))body=body.replace('</body>','<script src="/admin/admin-shell-v2.js?v=6"></script></body>');
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-admin-ui','premium-theme-v3+premium-flow-v1');
  headers.set('x-reqoo-admin-api-route','same-origin');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function injectShopAdminSafe(response){
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html'))return response;
  const html=await response.text();
  const body=html.replace(/const API='https:\/\/api\.reqoo\.co\/api\/shop-admin',IMAGE_API='https:\/\/api\.reqoo\.co\/api\/product-image',TOKEN_KEY=/g,"const API=location.origin+'/api/shop-admin',IMAGE_API=location.origin+'/api/product-image',TOKEN_KEY=");
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-admin-ui','shop-admin-safe-mode-v1');
  headers.set('x-reqoo-admin-api-route','same-origin');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

function assetRequest(pathname,request){
  const target=new URL(pathname,'https://reqoo.co');
  target.search=new URL(request.url).search;
  const init={method:request.method,headers:request.headers,redirect:'follow'};
  if(request.method!=='GET'&&request.method!=='HEAD')init.body=request.body;
  return new Request(target.toString(),init);
}

async function adminOverview(request,env){
  return injectAdminUI(await env.ASSETS.fetch(assetRequest('/admin/index.html',request)));
}

async function adminPkskV2(request,env){
  const response=await env.ASSETS.fetch(assetRequest('/admin/sim-v2.html',request));
  const type=response.headers.get('content-type')||'';
  const source=type.toLowerCase().includes('text/html')?await response.text():null;
  if(source===null)return response;
  const body=source.replace(/API='\/api\/sim-admin'/g,"API='https://api.reqoo.co/api/sim-admin'");
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('x-reqoo-admin-route','pksk-v2');
  headers.set('x-reqoo-api-route','direct');
  return injectAdminUI(new Response(body,{status:response.status,statusText:response.statusText,headers}));
}

function pkskAssetPath(pathname){
  let path=pathname||'/';
  if(path==='/'||path==='/pksk'||path==='/pksk/')return'/sim/pksk/index.html';
  if(/^\/pksk\//i.test(path))path=path.slice('/pksk'.length)||'/';
  path=`/sim/pksk${path}`;
  if(path.endsWith('/'))path+='index.html';
  return path;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),host=url.hostname.toLowerCase();
    if(url.pathname==='/api'||url.pathname.startsWith('/api/'))return proxyApi(request,url);

    if(host==='reqoo.co'&&/^\/d\/[A-Za-z0-9-]+\/?$/.test(url.pathname)){
      const response=await env.ASSETS.fetch(assetRequest('/admin/document-public.html',request));
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
      headers.set('x-robots-tag','noindex, nofollow');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    if(['reqoo.co','shop.reqoo.co'].includes(host)&&['/shop/assets/maybank-qr.jpeg','/shop/maybank-qr.jpg','/maybank-qr.jpg','/assets/maybank-qr.jpeg'].includes(url.pathname))return env.ASSETS.fetch(assetRequest('/shop/assets/maybank-qr.jpeg',request));

    if((host==='admin.reqoo.co'||host==='reqoo.co')&&/^\/shop\/admin\.html$/i.test(url.pathname)){
      const response=await env.ASSETS.fetch(assetRequest('/shop/admin.html',request));
      return injectShopAdminSafe(response);
    }

    if(((host==='admin.reqoo.co'&&url.pathname==='/')||(['admin.reqoo.co','reqoo.co'].includes(host)&&/^\/admin\/?$/i.test(url.pathname))))return adminOverview(request,env);
    if(host==='admin.reqoo.co'&&(/^\/admin\/sim-v2\.html$/i.test(url.pathname)||/^\/sim\/pksk\/admin\/?$/i.test(url.pathname)))return adminPkskV2(request,env);
    if(['admin.reqoo.co','reqoo.co'].includes(host)&&/^\/admin\/(?:settings|documents|customers|finance|orders|production|products|shop-content)\.html$/i.test(url.pathname)){
      const response=await env.ASSETS.fetch(assetRequest(url.pathname,request));
      return injectAdminUI(response);
    }

    if(host==='pksk.sim.reqoo.co'){
      const pathname=pkskAssetPath(url.pathname),cleanPath=pathname.replace(/^\/+/, '');
      if(cleanPath.includes('..'))return new Response('Not Found',{status:404});
      const response=await env.ASSETS.fetch(assetRequest(`/${cleanPath}`,request));
      const isLanding=url.pathname==='/'||url.pathname==='/pksk'||url.pathname==='/pksk/';
      return isLanding?injectBotanical(response):response;
    }

    if(host==='shop.reqoo.co'){
      const pathname=url.pathname==='/'?'/shop/index.html':(/^\/shop(?:\/|$)/i.test(url.pathname)?url.pathname:`/shop${url.pathname}`),cleanPath=pathname.replace(/^\/+/, '');
      if(cleanPath.includes('..'))return new Response('Not Found',{status:404});
      return injectBotanical(await injectShopRuntime(await env.ASSETS.fetch(assetRequest(`/${cleanPath}`,request)),true));
    }

    if(host==='sim.reqoo.co'){
      let pathname=url.pathname;
      if(pathname==='/'||pathname==='')pathname='/sim/index.html';
      else if(/^\/pksk\/?$/i.test(pathname))pathname='/sim/pksk/index.html';
      else if(/^\/pksk\//i.test(pathname))pathname=`/sim${pathname}`;
      const cleanPath=pathname.replace(/^\/+/, '');
      if(cleanPath.includes('..'))return new Response('Not Found',{status:404});
      const response=await env.ASSETS.fetch(assetRequest(`/${cleanPath}`,request));
      return /^\/pksk\/?$/i.test(url.pathname)?injectBotanical(response):response;
    }

    if(host==='reqoo.co'&&(/^\/shop(?:\/|$)/i.test(url.pathname)))return injectBotanical(await injectShopRuntime(await env.ASSETS.fetch(assetRequest(url.pathname,request)),true));

    if(host==='reqoo.co'&&(url.pathname==='/'||url.pathname===''))return injectBotanical(await env.ASSETS.fetch(request));

    if(host==='reqoo.co'&&(/^\/tumbler\/?$/i.test(url.pathname)||/^\/sim\/pksk\/?$/i.test(url.pathname)))return injectBotanical(await env.ASSETS.fetch(request));

    return injectShopRuntime(await env.ASSETS.fetch(request));
  }
};
