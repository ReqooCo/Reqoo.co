export const SHOP_CATALOG = [
  { sku:'PLAQUE', name:'Plaque', tag:'RECOGNITION', description:'Recognition plaque custom-made for awards, appreciation and corporate gifts.', from:35, unit:'piece', options:['Acrylic','Wood','Sublimation'], image:'/assets/shop/plaque.webp' },
  { sku:'BROOCH', name:'Brooch', tag:'CORPORATE', description:'Custom corporate and event brooch with premium finishing.', from:5, unit:'piece', options:['Acrylic','Metal-look'], image:'/assets/shop/brooch.webp' },
  { sku:'MEDAL', name:'Medal', tag:'EVENT', description:'Custom medal for school, sports and events.', from:8, unit:'piece', options:['Standard','Premium'], image:'/assets/shop/medal.webp' },
  { sku:'TROPHY', name:'Trophy', tag:'AWARDS', description:'Custom trophy for recognition and achievement.', from:35, unit:'piece', options:['Acrylic','3D Print','Mixed'], image:'/assets/shop/trophy.webp' },
  { sku:'3DPRINT', name:'3D Print Service', tag:'MADE TO ORDER', description:'Made-to-order 3D printed parts, gifts and prototypes.', from:15, unit:'job', options:['PLA','TPU','Custom'], image:'/assets/shop/3d-print.webp' }
];

export function findProduct(sku){return SHOP_CATALOG.find(p=>p.sku===String(sku||'').toUpperCase())||null;}
export function calculateCart(items=[]){return items.reduce((total,item)=>{const p=findProduct(item.sku);const qty=Math.max(1,Number(item.qty||1));const price=Number(item.unitPrice ?? p?.from ?? 0);return total+(Number.isFinite(price)&&price>=0?price*qty:0)},0)}
