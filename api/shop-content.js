const CORS={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'Content-Type,X-Admin-Token,X-Admin-Key',
  'cache-control':'no-store'
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...CORS,'content-type':'application/json;charset=UTF-8'}});
const text=v=>String(v??'').trim();
const KEY='shop_featured_content_v1';
const DEFAULTS={
  section:{
    eyebrow:'KATEGORI UTAMA',
    title:'Pilih ikut cerita anda.',
    ctaText:'Lihat semua koleksi',
    ctaLink:'#catalogue',
    background:'#f6f1e7',
    decorLeft:'/shop/assets/botanical-leaves-left.svg',
    decorRight:'/shop/assets/botanical-leaves-right.svg'
  },
  items:[
    {title:'Plaque',text:'Cipta kenangan yang kekal.',image:'/shop/assets/plaque-prestige.jpg',link:'#catalogue',active:true},
    {title:'Trophy',text:'Penghargaan untuk setiap pencapaian.',image:'/shop/assets/trophy.jpg',link:'#catalogue',active:true},
    {title:'Medal',text:'Lebih daripada kemenangan.',image:'/shop/assets/medal.jpg',link:'#catalogue',active:true},
    {title:'Brooch',text:'Butiran kecil, makna besar.',image:'/shop/assets/brooch-01-04.jpg',link:'#catalogue',active:true}
  ]
};
async function ensure(env){if(!env.DB)throw Error('D1 binding DB tidak dijumpai.');await env.DB.prepare(`CREATE TABLE IF NOT EXISTS reqoo_app_settings_v3(key TEXT PRIMARY KEY,value TEXT DEFAULT '')`).run();}
function admin(request,env){const expected=text(env.REQOO_ADMIN_TOKEN||env.ADMIN_KEY||env.SHOP_ADMIN_TOKEN);const supplied=text(request.headers.get('X-Admin-Token')||request.headers.get('X-Admin-Key'));return !!expected&&supplied===expected;}
function safeUrl(v,fallback=''){const s=text(v);if(!s)return fallback;if(s.startsWith('/')||s.startsWith('#')||/^https:\/\//i.test(s))return s;return fallback;}
function short(v,max,fallback=''){const s=text(v);return (s||fallback).slice(0,max);}
function color(v,fallback){const s=text(v);return /^#[0-9a-f]{3,8}$/i.test(s)?s:fallback;}
function normalize(raw={}){
  const sec=raw.section||{};
  const items=Array.isArray(raw.items)?raw.items:[];
  return {
    section:{
      eyebrow:short(sec.eyebrow,80,DEFAULTS.section.eyebrow),
      title:short(sec.title,120,DEFAULTS.section.title),
      ctaText:short(sec.ctaText,80,DEFAULTS.section.ctaText),
      ctaLink:safeUrl(sec.ctaLink,DEFAULTS.section.ctaLink),
      background:color(sec.background,DEFAULTS.section.background),
      decorLeft:safeUrl(sec.decorLeft,DEFAULTS.section.decorLeft),
      decorRight:safeUrl(sec.decorRight,DEFAULTS.section.decorRight)
    },
    items:DEFAULTS.items.map((d,i)=>{const x=items[i]||{};return {
      title:short(x.title,60,d.title),
      text:short(x.text,140,d.text),
      image:safeUrl(x.image,d.image),
      link:safeUrl(x.link,d.link),
      active:x.active!==false
    }})
  };
}
export async function handle(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  try{
    await ensure(env);
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT value FROM reqoo_app_settings_v3 WHERE key=? LIMIT 1').bind(KEY).first();
      let stored={};try{stored=row?.value?JSON.parse(row.value):{}}catch{}
      return json({ok:true,content:normalize(stored),defaults:DEFAULTS});
    }
    if(request.method==='POST'){
      if(!admin(request,env))return json({ok:false,error:'Unauthorized'},401);
      let d={};try{d=await request.json()}catch{return json({ok:false,error:'Payload tidak sah.'},400)}
      if(d.reset===true){await env.DB.prepare('DELETE FROM reqoo_app_settings_v3 WHERE key=?').bind(KEY).run();return json({ok:true,content:DEFAULTS,reset:true});}
      const content=normalize(d.content||d);
      await env.DB.prepare('INSERT OR REPLACE INTO reqoo_app_settings_v3(key,value) VALUES(?,?)').bind(KEY,JSON.stringify(content)).run();
      return json({ok:true,content});
    }
    return json({ok:false,error:'Method tidak disokong.'},405);
  }catch(e){return json({ok:false,error:e?.message||'Server error'},500)}
}
