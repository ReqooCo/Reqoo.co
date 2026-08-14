export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=url.hostname;

  // ============================================================
  // REQOO FAMILY ROUTING
  // ============================================================
  //
  // REQOO
  // ├─ shop.reqoo.co
  // ├─ sim.reqoo.co
  // │  └─ <product>.sim.reqoo.co
  // ├─ play.reqoo.co
  // └─ admin.reqoo.co
  //
  // Product children are stored as top-level folders in this repo.
  // Example: pksk.sim.reqoo.co -> /pksk/*
  // This keeps the architecture ready for future products such as
  // xxx.sim.reqoo.co without needing another routing rule.
  // ============================================================

  // SIM parent/family hub
  if(host==='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/sim/index.html':`/sim${url.pathname}`;
    return context.env.ASSETS.fetch(new Request(url,context.request));
  }

  // SIM product children.
  // pksk.sim.reqoo.co -> /pksk
  // xxx.sim.reqoo.co  -> /xxx
  if(host.endsWith('.sim.reqoo.co') && host!=='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    const child=host.slice(0,-'.sim.reqoo.co'.length);

    // Only a single-level child is allowed here.
    // This prevents an accidental nested hostname from being treated as a product.
    if(child && !child.includes('.')){
      url.pathname=url.pathname==='/'?`/${child}/index.html`:`/${child}${url.pathname}`;
      return context.env.ASSETS.fetch(new Request(url,context.request));
    }
  }

  // PLAY parent platform
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

  // Main REQOO site and all API/function routes fall through normally.
  const response=await context.next();

  if(host!=='reqoo.co' && host!=='shop.reqoo.co') return response;
  if(host!=='reqoo.co' && host!=='shop.reqoo.co') return response;

  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;

  return new HTMLRewriter().on('body',{element(el){
    el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true});
  }}).transform(response);
}
