export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=url.hostname;

  if(host==='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/sim/':`/sim${url.pathname}`;
    return context.env.ASSETS.fetch(url);
  }

  if(host==='pksk.sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    let path=url.pathname;
    if(path==='/pksk' || path.startsWith('/pksk/'))path=path.slice('/pksk'.length)||'/';
    const isSimulator=path==='/simulator' || path.startsWith('/simulator/');
    const isAccess=path==='/access' || path.startsWith('/access/');
    url.pathname=path==='/'?'/sim/pksk/':`/sim/pksk${path}`;
    const response=await context.env.ASSETS.fetch(url);
    if(!isSimulator&&!isAccess)return response;
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){
      if(isSimulator){
        el.append('<script src="/simulator/js/v56-sync.js?v=59"></script>',{html:true});
        el.append('<script src="/simulator/js/c-submit-fix.js?v=1"></script>',{html:true});
      }
      if(isAccess)el.append('<script src="/access/access-v56-sync.js?v=1"></script>',{html:true});
    }}).transform(response);
  }

  if(host.endsWith('.sim.reqoo.co') && host!=='sim.reqoo.co' && !url.pathname.startsWith('/api/')){
    const child=host.slice(0,-'.sim.reqoo.co'.length);
    if(child && !child.includes('.')){
      let path=url.pathname;
      if(path===`/${child}` || path.startsWith(`/${child}/`))path=path.slice(child.length+1)||'/';
      url.pathname=path==='/'?`/sim/${child}/`:`/sim/${child}${path}`;
      return context.env.ASSETS.fetch(url);
    }
  }

  if(host==='play.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/play/':`/play${url.pathname}`;
    return context.env.ASSETS.fetch(url);
  }

  if(host==='shop.reqoo.co' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/shop/')){
    url.pathname=url.pathname==='/'?'/shop/':`/shop${url.pathname}`;
    const response=await context.env.ASSETS.fetch(url);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
  }

  if(host==='admin.reqoo.co' && !url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/':url.pathname;
    return context.env.ASSETS.fetch(url);
  }

  const response=await context.next();
  if(host!=='reqoo.co' && host!=='shop.reqoo.co')return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return new HTMLRewriter().on('body',{element(el){
    el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})
  }}).transform(response);
}
