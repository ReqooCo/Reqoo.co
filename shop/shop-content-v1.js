(()=>{
'use strict';
const CONTENT_API='/api/shop-content',HERO_API='/api/shop-hero';
const $=(s,r=document)=>r.querySelector(s);
const all=(s,r=document)=>[...r.querySelectorAll(s)];
function applyHero(data){const url=String(data?.url||'').trim(),img=$('.rqBotHeroVisual>img');if(url&&img)img.src=url}
function mainLink(x){const raw=String(x?.link||'').trim();if(location.pathname!=='/'&&location.pathname!=='')return raw;if(raw&&raw!=='#catalogue')return raw;const t=String(x?.title||'').toLowerCase();if(t.includes('plaque'))return'/plaque/';if(t.includes('tumbler'))return'/tumbler/';return'/shop/'}
function applyContent(data){
 const c=data?.content||data||{},sec=c.section||{},items=Array.isArray(c.items)?c.items:[];
 const root=$('.rqBotStories');if(!root)return;
 const eyebrow=$('.rqBotSectionHead .rqBotEyebrow',root),title=$('.rqBotSectionHead h2',root),cta=$('.rqBotSectionHead>a',root);
 if(eyebrow&&sec.eyebrow)eyebrow.textContent=sec.eyebrow;
 if(title&&sec.title)title.textContent=sec.title;
 if(cta){if(sec.ctaText)cta.firstChild.textContent=sec.ctaText+' ';if(sec.ctaLink)cta.href=(location.pathname==='/'&&sec.ctaLink==='#catalogue')?'/shop/':sec.ctaLink}
 if(sec.background)root.style.setProperty('--rq-featured-bg',sec.background);
 const dl=$('.rqBotDecorLeft',root),dr=$('.rqBotDecorRight',root);
 if(dl&&sec.decorLeft){dl.src=sec.decorLeft;dl.hidden=false}else if(dl)dl.hidden=true;
 if(dr&&sec.decorRight){dr.src=sec.decorRight;dr.hidden=false}else if(dr)dr.hidden=true;
 const cards=all('.rqBotStoryCard',root);
 cards.forEach((card,i)=>{
   const x=items[i];if(!x)return;
   card.hidden=x.active===false;
   const link=mainLink(x);if(link)card.href=link;
   const img=$('img',card),h=$('h3',card),p=$('p',card);
   if(img&&x.image){img.src=x.image;img.alt=(x.title||'Kategori')+' REQOO'}
   if(h&&x.title)h.textContent=x.title;
   if(p&&x.text)p.textContent=x.text;
 });
}
async function boot(){
 try{const [hero,content]=await Promise.allSettled([
   fetch(HERO_API+'?_='+Date.now(),{cache:'no-store'}).then(r=>r.json()),
   fetch(CONTENT_API+'?_='+Date.now(),{cache:'no-store'}).then(r=>r.json())
 ]);if(hero.status==='fulfilled')applyHero(hero.value);if(content.status==='fulfilled'&&content.value?.ok)applyContent(content.value)}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
