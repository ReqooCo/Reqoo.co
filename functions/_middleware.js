export async function onRequest(context){
  const {request,env}=context;
  const url=new URL(request.url),host=url.hostname;

  // V2 API is the only canonical PKSK backend. This compatibility rewrite keeps
  // any stale cached client from reaching a deleted legacy function.
  if(host==='pksk.sim.reqoo.co'&&url.pathname==='/api/pksk-v56'){
    url.pathname='/api/pksk-v2';
    return context.next(new Request(url,request));
  }

  if(host==='sim.reqoo.co'&&!url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/sim/':`/sim${url.pathname}`;
    return env.ASSETS.fetch(url);
  }

  if(host==='pksk.sim.reqoo.co'&&!url.pathname.startsWith('/api/')){
    let path=url.pathname;
    if(path==='/pksk'||path.startsWith('/pksk/'))path=path.slice('/pksk'.length)||'/';
    const isSimulator=path==='/simulator'||path.startsWith('/simulator/');
    const isAdmin=path==='/admin'||path.startsWith('/admin/');
    const isAccess=path==='/'||path==='/access'||path.startsWith('/access/');
    url.pathname=path==='/'?'/sim/pksk/':`/sim/pksk${path}`;
    let response=await env.ASSETS.fetch(url);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    if(isSimulator){
      return new HTMLRewriter()
        .on('script[src="js/app.js?v=18"]',{element(el){el.remove()}})
        .on('body',{element(el){el.append('<script src="/sim/pksk/simulator/js/app-v2.js?v=2"></script>',{html:true})}})
        .transform(response);
    }
    if(isAccess){
      return new HTMLRewriter()
        .on('script',{element(el){el.remove()}})
        .on('body',{element(el){el.append('<script src="/sim/pksk/access/app-v2.js?v=2"></script>',{html:true})}})
        .transform(response);
    }
    return response;
  }

  if(host.endsWith('.sim.reqoo.co')&&host!=='sim.reqoo.co'&&!url.pathname.startsWith('/api/')){
    const child=host.slice(0,-'.sim.reqoo.co'.length);
    if(child&&!child.includes('.')){
      let path=url.pathname;
      if(path===`/${child}`||path.startsWith(`/${child}/`))path=path.slice(child.length+1)||'/';
      url.pathname=path==='/'?`/sim/${child}/`:`/sim/${child}${path}`;
      return env.ASSETS.fetch(url);
    }
  }

  if(host==='play.reqoo.co'&&!url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/play/':`/play${url.pathname}`;
    return env.ASSETS.fetch(url);
  }

  if(host==='shop.reqoo.co'&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/':`/shop${url.pathname}`;
    const response=await env.ASSETS.fetch(url),type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
  }

  if(host==='admin.reqoo.co'&&!url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/':url.pathname;
    const response=await env.ASSETS.fetch(url),type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<link rel="stylesheet" href="/admin/reqoo-admin-universal.css?v=3.2.0"><link rel="stylesheet" href="/admin/reqoo-admin-premium-v2.css?v=1.0.0"><script src="/admin/reqoo-admin-shell.js?v=1.0.0"></script>',{html:true})}}).transform(response);
  }

  return context.next();
}