export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=url.hostname;

  // REQOO family: SIM is a child platform.
  // Each SIM product gets its own child subdomain:
  // pksk.sim.reqoo.co, future-product.sim.reqoo.co, etc.
  // The SIM root remains the parent/family hub.
  if(host==='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/sim/index.html':`/sim${url.pathname}`;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  // SIM product children. Add a new entry here when a new product is born.
  // PKSK is the first child.
  if(host==='pksk.sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/pksk/index.html':`/pksk${url.pathname}`;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  // PLAY is a REQOO child platform, ready to receive future products.
  if(host==='play.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/play/index.html':`/play${url.pathname}`;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  // SHOP child
  if(host==='shop.reqoo.co' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/index.html':`/shop${url.pathname}`;
    const response=await context.env.ASSETS.fetch(new Request(url,context.request));
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
  }

  // ADMIN = REQOO family manager
  if(host==='admin.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/index.html':url.pathname;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  const response=await context.next();
  if(host!=='reqoo.co' && host!=='shop.reqoo.co' && host!=='admin.reqoo.co' && host!=='sim.reqoo.co' && host!=='play.reqoo.co' && host!=='pksk.sim.reqoo.co') return response;
  if(host==='admin.reqoo.co' || host==='sim.reqoo.co' || host==='play.reqoo.co' || host==='pksk.sim.reqoo.co') return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
}
