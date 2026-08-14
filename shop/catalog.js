export const SHOP_CATALOG = [
  { sku:'PLAQUE', name:'Plaque', description:'Recognition plaque custom-made for awards, appreciation and corporate gifts.', from:35, unit:'piece', options:['Acrylic','Wood','Sublimation'] },
  { sku:'BROOCH', name:'Brooch', description:'Custom corporate and event brooch with premium finishing.', from:5, unit:'piece', options:['Acrylic','Metal-look'] },
  { sku:'MEDAL', name:'Medal', description:'Custom medal for school, sports and events.', from:8, unit:'piece', options:['Standard','Premium'] },
  { sku:'TROPHY', name:'Trophy', description:'Custom trophy for recognition and achievement.', from:35, unit:'piece', options:['Acrylic','3D Print','Mixed'] },
  { sku:'3DPRINT', name:'3D Print Service', description:'Made-to-order 3D printed parts, gifts and prototypes.', from:15, unit:'job', options:['PLA','TPU','Custom'] }
];

export function findProduct(sku){return SHOP_CATALOG.find(p=>p.sku===String(sku||'').toUpperCase())||null;}
export function calculateCart(items=[]){
 return items.reduce((total,item)=>{
  const p=findProduct(item.sku); const qty=Math.max(1,Number(item.qty||1)); const price=Number(item.unitPrice ?? p?.from ?? 0);
  return total + (Number.isFinite(price)&&price>=0 ? price*qty : 0);
 },0);
}
