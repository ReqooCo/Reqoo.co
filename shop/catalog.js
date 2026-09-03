export const SHOP_CATALOG = [
  { sku:'PLAQUE', name:'Plaque', tag:'RECOGNITION', description:'Recognition plaque custom-made for awards, appreciation and corporate gifts.', from:35, unit:'piece', options:['Acrylic','Wood','Sublimation'], image:'/shop/product-1.jpg' },
  { sku:'BROOCH', name:'Brooch', tag:'CORPORATE', description:'Custom corporate and event brooch with premium finishing.', from:5, unit:'piece', options:['Acrylic','Metal-look'], image:'/shop/product-4.jpg' },
  { sku:'MEDAL', name:'Medal', tag:'EVENT', description:'Custom medal for school, sports and events.', from:8, unit:'piece', options:['Standard','Premium'], image:'/shop/product-3.jpg' },
  { sku:'TROPHY', name:'Trophy', tag:'AWARDS', description:'Custom trophy for recognition and achievement.', from:35, unit:'piece', options:['Acrylic','3D Print','Mixed'], image:'/shop/product-2.jpg' },
  { sku:'3DPRINT', name:'3D Print Service', tag:'MADE TO ORDER', description:'Made-to-order 3D printed parts, gifts and prototypes.', from:15, unit:'job', options:['PLA','TPU','Custom'], image:'/shop/product-5.jpg' }
];

// Promotion settings are intentionally kept in one place so admin can change them later.
export const SHOP_PROMOTIONS = [
  { code:'REQOO10', type:'percent', value:10, minSpend:50, label:'10% OFF', active:true },
  { code:'WELCOME5', type:'fixed', value:5, minSpend:50, label:'RM5 OFF', active:true }
];

export const REQOO_WHATSAPP_BUSINESS = '60103982803';

// Safety net: normalise any legacy customer-facing WhatsApp link in the Shop page
// to the single official REQOO business number.
if(typeof document !== 'undefined'){
  const normalizeWhatsAppLinks=()=>{
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{
      try{
        const u=new URL(a.href,location.href);
        if(u.hostname==='wa.me'){
          u.pathname='/'+REQOO_WHATSAPP_BUSINESS;
          a.href=u.toString();
        }
      }catch(_){/* ignore malformed links */}
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalizeWhatsAppLinks,{once:true});
  else normalizeWhatsAppLinks();
}

export function findProduct(sku){return SHOP_CATALOG.find(p=>p.sku===String(sku||'').toUpperCase())||null;}
export function calculateCart(items=[]){return items.reduce((total,item)=>{const p=findProduct(item.sku);const qty=Math.max(1,Number(item.qty||1));const price=Number(item.unitPrice ?? p?.from ?? 0);return total+(Number.isFinite(price)&&price>=0?price*qty:0)},0)}
export function findPromotion(code,subtotal){const c=String(code||'').trim().toUpperCase();const p=SHOP_PROMOTIONS.find(x=>x.active&&x.code===c);if(!p)return {ok:false,discount:0};if(subtotal<Number(p.minSpend||0))return {ok:false,discount:0,message:`Minimum spend RM ${Number(p.minSpend).toFixed(2)}`};const discount=p.type==='percent'?subtotal*(Number(p.value)/100):Number(p.value);return {ok:true,discount:Math.min(discount,subtotal),label:p.label,code:p.code};}
