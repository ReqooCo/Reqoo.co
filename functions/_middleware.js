export async function onRequest(context){
  const response=await context.next();
  const url=new URL(context.request.url);
  // SHOP boleh diakses melalui reqoo.co dan shop.reqoo.co.
  // Payment fallback mesti dimasukkan pada kedua-dua hostname.
  if(url.hostname!=='reqoo.co' && url.hostname!=='shop.reqoo.co') return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=2"></script>',{html:true})}}).transform(response);
}
