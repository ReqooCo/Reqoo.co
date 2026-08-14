export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=url.hostname;

  // REQOO FAMILY ROUTING
  // REQOO -> SHOP / SIM / PLAY / ADMIN
  // SIM -> PKSK / future SIM children

  // SIM parent
  if(host==='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/sim/':`/sim${url.pathname}`;
    return context.env.ASSETS.fetch(url);
  }

  // Explicit PKSK child route.
  // IMPORTANT: ASSETS.fetch uses the pretty URL, so /sim/pksk/ maps to index.html.
  // pksk.sim.reqoo.co/          -> /sim/pksk/
  // pksk.sim.reqoo.co/foo      -> /sim/pksk/foo
  // pksk.sim.reqoo.co/pksk/foo -> /sim/pksk/foo
  if(host==='pksk.sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    let path=url.pathname;
    if(path==='/pksk' || path.startsWith('/pksk/')){
      path=path.slice('/pksk'.length) || '/';
    }
    url.pathname=path==='/'?'/sim/pksk/':`/sim/pksk${path}`;
    return context.env.ASSETS.fetch(url);
  }

  // Future SIM children use the same family pattern.
  if(host.endsWith('.sim.reqoo.co') && host!=='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    const child=host.slice(0,-'.sim.reqoo.co'.length);
    if(child && !child.includes('.')){
      let path=url.pathname;
      if(path===`/${child}` || path.startsWith(`/${child}/`)){
        path=path.slice(child.length+1) || '/';
      }
      url.pathname=path==='/'?`/sim/${child}/`:`/sim/${child}${path}`;
      return context.env.ASSETS.fetch(url);
    }
  }

  // PLAY parent
  if(host==='play.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/play/':`/play${url.pathname}`;
    return context.env.ASSETS.fetch(url);
  }

  // SHOP child
  if(host==='shop.reqoo.co' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/':`/shop${url.pathname}`;
    const response=await context.env.ASSETS.fetch(url);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
  }

  // ADMIN = REQOO family manager
  if(host==='admin.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/':url.pathname;
    return context.env.ASSETS.fetch(url);
  }

  // Main REQOO site and API/function routes
  const response=await context.next();
  if(host!=='reqoo.co' && host!=='shop.reqoo.co') return response;

  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;

  return new HTMLRewriter().on('body',{element(el){
    el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true});
  }}).transform(response);
}
