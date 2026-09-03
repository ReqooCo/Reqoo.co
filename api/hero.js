const CORS={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Admin-Token,X-Admin-Key',
  'cache-control':'no-store'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...CORS,'content-type':'application/json;charset=UTF-8'}});
const text=v=>String(v??'').trim();
const DEFAULT_HERO='/shop/assets/plaque-signature.jpg';
const KEY='shop_hero_url';

async function ensure(env){
  if(!env.DB) throw Error('D1 binding DB tidak dijumpai.');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reqoo_app_settings_v3(key TEXT PRIMARY KEY,value TEXT DEFAULT '')`).run();
}
function admin(request,env){
  const expected=text(env.REQOO_ADMIN_TOKEN||env.ADMIN_KEY||env.SHOP_ADMIN_TOKEN);
  const supplied=text(request.headers.get('X-Admin-Token')||request.headers.get('X-Admin-Key'));
  return !!expected&&supplied===expected;
}

export async function handle(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  try{
    await ensure(env);
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT value FROM reqoo_app_settings_v3 WHERE key=? LIMIT 1').bind(KEY).first();
      return json({ok:true,url:text(row?.value)||DEFAULT_HERO,defaultUrl:DEFAULT_HERO});
    }
    if(request.method==='POST'){
      if(!admin(request,env))return json({ok:false,error:'Unauthorized'},401);
      let d={};try{d=await request.json()}catch{return json({ok:false,error:'Payload tidak sah.'},400)}
      const url=text(d.url);
      if(!url)return json({ok:false,error:'URL Hero diperlukan.'},400);
      if(url.length>2000)return json({ok:false,error:'URL Hero terlalu panjang.'},400);
      if(!/^https:\/\//i.test(url)&&!url.startsWith('/'))return json({ok:false,error:'URL Hero mesti https:// atau path dalaman.'},400);
      await env.DB.prepare('INSERT OR REPLACE INTO reqoo_app_settings_v3(key,value) VALUES(?,?)').bind(KEY,url).run();
      return json({ok:true,url});
    }
    return json({ok:false,error:'Method tidak disokong.'},405);
  }catch(e){return json({ok:false,error:e?.message||'Server error'},500)}
}
