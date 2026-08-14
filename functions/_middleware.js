export async function onRequest(context){
  const url=new URL(context.request.url);
  const isShopHost=url.hostname==='shop.reqoo.co';

  // shop.reqoo.co uses the same Pages project as reqoo.co, but serves the
  // static SHOP app from /shop/ instead of the main landing page at /.
  // Keep API routes untouched so /api/shop continues to reach Functions.
  if(isShopHost && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/index.html':`/shop${url.pathname}`;
    const assetRequest=new Request(url,context.request);
    const response=await context.env.ASSETS.fetch(assetRequest);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=3"></script>',{html:true})}}).transform(response);
  }

  const response=await context.next();
  // Payment fallback must also be available on the main domain and on
  // explicit /shop/ pages.
  if(url.hostname!=='reqoo.co' && url.hostname!=='shop.reqoo.co') return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=3"></script>',{html:true})}}).transform(response);
}
