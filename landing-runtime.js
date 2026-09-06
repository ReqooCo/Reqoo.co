(()=>{
'use strict';
/* REQOO Landing v2
   Campaign landing page for IG/FB traffic. The landing page sells the brand/story;
   all purchase CTAs continue into the real ecommerce shop. */
const SHOP='/shop/';
function shopUrl(){
  const u=new URL(SHOP,location.origin);
  const keep=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','campaign'];
  keep.forEach(k=>{const v=new URLSearchParams(location.search).get(k);if(v)u.searchParams.set(k,v)});
  return u.pathname+(u.search?u.search:'');
}
function isBuyText(t){return /\b(buat tempahan|tempah|beli|lihat produk|lihat koleksi|shop|produk|collection|lihat & tempah)\b/i.test(String(t||''))}
function rewrite(){
  const href=shopUrl();
  document.querySelectorAll('a').forEach(a=>{
    const text=(a.textContent||'').trim();
    if(!text)return;
    if(a.closest('.logo'))return;
    if(/whatsapp/i.test(text))return;
    if(isBuyText(text)||/^\.\/shop\/?$/i.test(a.getAttribute('href')||'')){
      a.href=href;
      if(/buat tempahan/i.test(text))a.textContent='Beli Sekarang';
      else if(/lihat & tempah/i.test(text))a.textContent='Lihat Produk';
    }
  });
  const primary=[...document.querySelectorAll('.actions a')].find(a=>/Beli Sekarang|Buat Tempahan/i.test(a.textContent||''));
  if(primary){primary.href=href;primary.textContent='Beli Sekarang';primary.setAttribute('data-reqoo-buy','1')}
  const heroSecondary=[...document.querySelectorAll('.actions a')].find(a=>/Lihat Produk/i.test(a.textContent||''));
  if(heroSecondary){heroSecondary.href=href;heroSecondary.setAttribute('data-reqoo-buy','1')}
  if(!document.getElementById('reqoo-landing-trust')){
    const hero=document.querySelector('.hero');
    if(hero){const bar=document.createElement('div');bar.id='reqoo-landing-trust';bar.innerHTML='<div>✓ Produk custom sebenar</div><div>✓ Pilihan & harga jelas di Shop</div><div>✓ Bayaran QR</div><div>✓ Rekod pesanan</div>';bar.style.cssText='width:min(1160px,calc(100% - 36px));margin:20px auto 0;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;color:#bbb;font-size:11px';bar.querySelectorAll('div').forEach(x=>x.style.cssText='padding:11px 12px;border:1px solid #292929;border-radius:12px;background:#0d0d0d;text-align:center');hero.appendChild(bar)}}
  if(!document.getElementById('reqoo-mobile-buy')){
    const b=document.createElement('a');b.id='reqoo-mobile-buy';b.href=href;b.textContent='LIHAT PRODUK & HARGA →';b.setAttribute('data-reqoo-buy','1');b.style.cssText='display:none;position:fixed;left:14px;right:14px;bottom:14px;z-index:9999;text-align:center;text-decoration:none;background:#d9b45f;color:#111;border-radius:999px;padding:14px 18px;font-weight:900;font-size:12px;box-shadow:0 10px 35px #000b';document.body.appendChild(b);const s=document.createElement('style');s.textContent='@media(max-width:700px){#reqoo-mobile-buy{display:block}}';document.head.appendChild(s)}
  if(!document.getElementById('reqoo-landing-ui-v2')){
    const s=document.createElement('style');
    s.id='reqoo-landing-ui-v2';
    s.textContent='@media(max-width:520px){.wrap{width:min(1160px,calc(100% - 28px))}.nav{height:64px}.logo{font-size:19px;letter-spacing:3px}.hero{padding:54px 0 48px}.hero-grid{gap:28px}.hero-img{border-radius:22px}.hero-img img{height:330px}.eyebrow{font-size:10px;letter-spacing:3px}h1{font-size:clamp(44px,13vw,54px);letter-spacing:-2.5px;margin:15px 0}.lead{font-size:16px;line-height:1.55}.actions{gap:9px;margin-top:22px}.btn{padding:12px 16px;font-size:12px}section{padding:46px 0}.head{margin-bottom:20px}h2{font-size:30px;line-height:1.08;margin:7px 0 9px}.muted{font-size:15px;line-height:1.6}.cards{grid-template-columns:1fr 1fr;gap:10px}.card{border-radius:15px}.pic{height:155px}.body{padding:14px}h3{font-size:16px;margin-bottom:5px}.body p{font-size:12px;line-height:1.45;margin:0}.more{display:none}.split{gap:28px}.feature{border-radius:20px}.feature img{height:300px}.points{gap:14px;margin-top:20px}.point{gap:11px}.num{width:32px;height:32px}.point b{font-size:14px}.point span{font-size:13px}.gallery{grid-template-columns:1fr 1fr;gap:9px}.g{height:155px;border-radius:14px}.g span{font-size:11px;padding:25px 10px 9px}.steps{gap:10px}.step{padding:18px;border-radius:16px}.cta{padding:38px 18px;border-radius:22px}.cta h2{font-size:32px}body:before{opacity:.035}}@media(min-width:521px) and (max-width:850px){.hero{padding:64px 0 58px}.hero-img img{height:420px}}';
    document.head.appendChild(s);
  }
  const promo=[...document.querySelectorAll('section,div')].find(el=>/1\s*[—-]\s*31\s+AUGUST\s+2026/i.test(el.textContent||''));
  if(promo){promo.style.display='none'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rewrite);else rewrite();
})();