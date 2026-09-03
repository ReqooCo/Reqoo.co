async function shopAsset(request,env,url){
  const pathname=url.pathname==='/'?'/shop/index.html':`/shop${url.pathname}`;
  const cleanPath=pathname.replace(/^\/+/, '');
  if(cleanPath.includes('..'))return new Response('Not Found',{status:404});
  const assetRequest=new Request(new URL(`/${cleanPath}`,url.origin),request);
  const response=await env.ASSETS.fetch(assetRequest);
  if(url.pathname!=='/'&&url.pathname!=='/index.html')return response;
  if(!(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))return response;
  let heroUrl='';
  try{
    const r=await fetch('https://api.reqoo.co/api/shop-hero',{headers:{accept:'application/json'},cf:{cacheTtl:30}});
    if(r.ok){const d=await r.json();heroUrl=String(d.url||'').trim()}
  }catch{}
  if(!heroUrl)return response;
  return new HTMLRewriter().on('img.heroProduct',{element(el){el.setAttribute('src',heroUrl);el.setAttribute('data-live-hero','1')}}).transform(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Keep all application API calls on the canonical API Worker.
    // This lets admin/shop pages use relative /api/* URLs safely while
    // keeping static assets on the web Worker.
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = new URL(`https://api.reqoo.co${url.pathname}${url.search}`);
      return fetch(new Request(apiUrl.toString(), request));
    }

    if (host === 'pksk.sim.reqoo.co') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      const target = new URL(`/sim/pksk/${cleanPath}`, url.origin);
      target.search = url.search;
      const response = await env.ASSETS.fetch(new Request(target.toString(), request));
      if (response.status === 404) return new Response('PKSK Simulator asset not found', { status: 404 });
      return response;
    }

    if (host === 'shop.reqoo.co') return shopAsset(request,env,url);

    if (host === 'sim.reqoo.co') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      return env.ASSETS.fetch(new Request(new URL(`/sim/${cleanPath}`, url.origin), request));
    }

    return env.ASSETS.fetch(request);
  }
};
