export async function onRequest(context){
  const url=new URL(context.request.url),host=url.hostname;
  if(host==='sim.reqoo.co'&&!url.pathname.startsWith('/api/')){url.pathname=url.pathname==='/'?'/sim/':`/sim${url.pathname}`;return context.env.ASSETS.fetch(url)}
  if(host==='pksk.sim.reqoo.co'&&!url.pathname.startsWith('/api/')){
    let path=url.pathname;if(path==='/pksk'||path.startsWith('/pksk/'))path=path.slice('/pksk'.length)||'/';
    const isSimulator=path==='/simulator'||path.startsWith('/simulator/');
    const isAdmin=path==='/admin'||path.startsWith('/admin/');
    url.pathname=path==='/'?'/sim/pksk/':`/sim/pksk${path}`;const response=await context.env.ASSETS.fetch(url);
    if(!isSimulator&&!isAdmin)return response;const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){
      if(isSimulator)el.append('<script src="/simulator/js/v59-live.js?v=59"></script><script src="/simulator/js/v60-hotfix.js?v=60"></script>',{html:true});
      if(isAdmin)el.append('<script src="/sim/pksk/admin/delete-order.js?v=1"></script>',{html:true});
    }}).transform(response);
  }
  if(host.endsWith('.sim.reqoo.co')&&host!=='sim.reqoo.co'&&!url.pathname.startsWith('/api/')){const child=host.slice(0,-'.sim.reqoo.co'.length);if(child&&!child.includes('.')){let path=url.pathname;if(path===`/${child}`||path.startsWith(`/${child}/`))path=path.slice(child.length+1)||'/';url.pathname=path==='/'?`/sim/${child}/`:`/sim/${child}${path}`;return context.env.ASSETS.fetch(url)}}
  if(host==='play.reqoo.co'&&!url.pathname.startsWith('/api/')){url.pathname=url.pathname==='/'?'/play/':`/play${url.pathname}`;return context.env.ASSETS.fetch(url)}
  if(host==='shop.reqoo.co'&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/shop/')){url.pathname=url.pathname==='/'?'/shop/':`/shop${url.pathname}`;const response=await context.env.ASSETS.fetch(url),type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;return new HTMLRewriter().on('body',{element(el){el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response)}
  if(host==='admin.reqoo.co'&&!url.pathname.startsWith('/api/')){
    url.pathname=url.pathname==='/'?'/admin/':url.pathname;
    const response=await context.env.ASSETS.fetch(url);const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('body',{element(el){
      el.append('<link rel="stylesheet" href="/admin/reqoo-admin-universal.css?v=3.2.0"><link rel="stylesheet" href="/admin/reqoo-admin-premium-v2.css?v=1.0.0"><script src="/admin/reqoo-admin-shell.js?v=1.0.0"></script>',{html:true});
    }}).transform(response);
  }
  if(host==='pksk.sim.reqoo.co'&&url.pathname==='/api/pksk'&&url.searchParams.get('action')==='registerDevice'){
    const code=String(url.searchParams.get('code')||'').trim().toUpperCase();
    const oldDevice=String(url.searchParams.get('deviceId')||'').trim();
    const ua=String(url.searchParams.get('userAgent')||context.request.headers.get('user-agent')||'');
    const ip=String(context.request.headers.get('CF-Connecting-IP')||'');
    const lang=String(context.request.headers.get('accept-language')||'').split(',')[0];
    const platform=String(context.request.headers.get('sec-ch-ua-platform')||'');
    const label=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?'Android':/Windows/i.test(ua)?'Windows PC':/Macintosh|Mac OS X/i.test(ua)?'Mac':'Browser';
    const seed=`${ip}|${label}|${lang}|${platform}`;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(seed));
    const fp=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
    if(code&&context.env.DB){
      const lic=await context.env.DB.prepare('SELECT id FROM licenses WHERE access_code=?').bind(code).first();
      if(lic){
        const active=await context.env.DB.prepare("SELECT id,device_key,device_name FROM devices WHERE license_id=? AND status='active' ORDER BY first_seen ASC").bind(lic.id).all();
        const sameFamily=(active.results||[]).filter(x=>String(x.device_name||'')===label);
        if(sameFamily.length>1){
          const keep=sameFamily[0];
          await context.env.DB.prepare("UPDATE devices SET device_key=?,last_seen=?,status='active' WHERE id=?").bind(`FP-${fp}`,new Date().toISOString(),keep.id).run();
          for(const dup of sameFamily.slice(1))await context.env.DB.prepare("UPDATE devices SET status='revoked',last_seen=? WHERE id=?").bind(new Date().toISOString(),dup.id).run();
        }
      }
    }
    url.searchParams.set('deviceId',`FP-${fp}`);
    url.searchParams.set('userAgent',ua);
    return context.next({request:new Request(url.toString(),context.request)});
  }
  const response=await context.next();if(host!=='reqoo.co'&&host!=='shop.reqoo.co')return response;const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;const isSimulator=url.pathname==='/simulator'||url.pathname.startsWith('/simulator/');return new HTMLRewriter().on('body',{element(el){if(host==='reqoo.co'&&isSimulator)el.append('<script src="/simulator/js/v59-live.js?v=59"></script><script src="/simulator/js/v60-hotfix.js?v=60"></script>',{html:true});el.append('<script src="/shop/payment-fallback.js?v=4"></script><script src="/shop/payment-fix.js?v=1"></script>',{html:true})}}).transform(response);
}