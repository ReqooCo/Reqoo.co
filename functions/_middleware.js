export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=url.hostname;

  // SHOP subdomain
  if(host==='shop.reqoo.co' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/index.html':`/shop${url.pathname}`;
    const response=await context.env.ASSETS.fetch(new Request(url,context.request));
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
  }

  // ADMIN subdomain: central control centre. Keep Shop Admin as the first live module.
  if(host==='admin.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/index.html':url.pathname;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  const response=await context.next();
  if(host!=='reqoo.co' && host!=='shop.reqoo.co' && host!=='admin.reqoo.co') return response;
  if(host==='admin.reqoo.co') return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
}
