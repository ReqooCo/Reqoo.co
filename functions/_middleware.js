const BOTANICAL_THEME='<link rel="stylesheet" href="/assets/botanical-atelier-v1.css?v=3">';
function themed(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return new HTMLRewriter().on('head',{element(el){el.append(BOTANICAL_THEME,{html:true})}}).transform(response);
}

export async function onRequest(context){
  const {request,env}=context;
  const url=new URL(request.url),host=url.hostname;
  if(host==='reqoo.co'&&(url.pathname==='/admin'||url.pathname==='/admin/'||url.pathname.startsWith('/admin/'))){const target=new URL(request.url);target.hostname='admin.reqoo.co';return Response.redirect(target.toString(),308)}

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
        .on('head',{element(el){el.append(BOTANICAL_THEME,{html:true})}})
        .on('script[src="js/app.js?v=18"]',{element(el){el.remove()}})
        .on('body',{element(el){el.append('<script src="/sim/pksk/simulator/js/app-v2.js?v=2"></script>',{html:true})}})
        .transform(response);
    }
    if(isAccess){
      return new HTMLRewriter()
        .on('head',{element(el){el.append(BOTANICAL_THEME,{html:true})}})
        .on('script',{element(el){el.remove()}})
        .on('body',{element(el){el.append('<script src="/sim/pksk/access/app-v2.js?v=2"></script>',{html:true})}})
        .transform(response);
    }
    if(isAdmin)return response;
    return themed(response);
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
    return themed(response);
  }

  if((host==='admin.reqoo.co'||(host==='reqoo.co'&&url.pathname.startsWith('/admin')))&&!url.pathname.startsWith('/api/')){
    if(host==='admin.reqoo.co')url.pathname=url.pathname==='/'?'/admin/':url.pathname;
    const response=await env.ASSETS.fetch(url),type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter()
      .on('head',{element(el){el.prepend('<link rel="stylesheet" href="/admin/admin-base.css?v=1">',{html:true});el.append('<link rel="stylesheet" href="/admin/admin-flow.css?v=2">',{html:true})}})
      .on('body',{element(el){el.append('<script src="/admin/admin-shell.js?v=2"></script>',{html:true})}})
      .transform(response);
  }

  const response=await context.next();
  const path=url.pathname.replace(/\/+$/,'')||'/';
  const botanicalPaths=new Set(['/','/shop','/tumbler','/sim/pksk']);
  return botanicalPaths.has(path)?themed(response):response;
}