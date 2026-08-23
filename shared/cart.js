import { decodeProductOptions } from './catalog.js';
const KEY='reqoo_cart_v2';
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function write(items){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new CustomEvent('reqoo-cart-updated',{detail:items}));return items}
function selectionKey(item){try{return JSON.stringify({customization:item.customization||{},variation:item.variation||{},addons:item.addons||[]})}catch{return'{}'}}
function numberPrice(v){const n=Number(v);return Number.isFinite(n)&&n>=0?n:0}
function selectedValue(v){return v&&typeof v==='object'?String(v.value??v.label??''):String(v??'')}
function productOptions(product){if(Array.isArray(product?.options))return product.options;if(product?.internal_notes)return decodeProductOptions(product.internal_notes);return[]}
function resolveDisplayPrice(product,selection){const options=productOptions(product),variations=selection?.variation||{},addons=Array.isArray(selection?.addons)?selection.addons:[];let unit=numberPrice(product?.base_price??product?.price);
for(const opt of options.filter(x=>x.group==='variation')){const chosen=selectedValue(variations[opt.id]??variations[opt.label]);if(!chosen)continue;const value=(opt.values||[]).find(v=>String(v.value??v.label)===chosen);if(value)unit+=numberPrice(value.price)}
for(const opt of options.filter(x=>x.group==='addon')){const selected=addons.find(a=>String(a?.option_id??a?.id??'')===String(opt.id)||String(a?.label??'')===String(opt.label));if(!selected)continue;let values=selected.values??selected.value??selected.label??true;if(!Array.isArray(values))values=[values];for(const raw of values){const label=raw&&typeof raw==='object'?String(raw.label??raw.value??''):String(raw);if(opt.field_type==='select'){const value=(opt.values||[]).find(v=>String(v.label)===label||String(v.value??'')===label);unit+=numberPrice(value?.price)}else{const value=(opt.values||[]).find(v=>String(v.label)===label||String(v.value??'')===label);unit+=numberPrice(value?.price!==undefined?value.price:opt.addonPrice)}}}return unit}
export const cart=Object.freeze({
 get:()=>read(),count:()=>read().reduce((s,i)=>s+Math.max(0,Number(i.quantity)||0),0),subtotal:()=>read().reduce((s,i)=>s+numberPrice(i.price)*Math.max(0,Number(i.quantity)||0),0),
 add(product,quantity=1){const items=read(),qty=Math.max(1,Math.floor(Number(quantity)||1)),id=String(product.id),incoming={customization:product.customization||{},variation:product.variation||{},addons:Array.isArray(product.addons)?product.addons:[]},price=resolveDisplayPrice(product,incoming),existing=items.find(i=>i.id===id&&selectionKey(i)===selectionKey(incoming));if(existing){existing.quantity+=qty;existing.price=price}else items.push({id,name:String(product.name||''),slug:String(product.slug||''),price,base_price:numberPrice(product.base_price??product.price),image:String((product.images||[])[0]||''),quantity:qty,...incoming});return write(items)},
 updateAt(index,quantity){const items=read(),i=Math.floor(Number(index));if(!Number.isInteger(i)||!items[i])return items;if(!Number.isFinite(Number(quantity))||Number(quantity)<=0)return cart.removeAt(i);items[i].quantity=Math.floor(Number(quantity));return write(items)},
 removeAt(index){const items=read(),i=Math.floor(Number(index));if(Number.isInteger(i)&&i>=0&&i<items.length)items.splice(i,1);return write(items)},
 update(id,quantity){const items=read(),idx=items.findIndex(i=>i.id===String(id));return idx<0?items:cart.updateAt(idx,quantity)},remove(id){const items=read().filter(i=>i.id!==String(id));return write(items)},clear(){return write([])}
});
export function money(value){return`RM${numberPrice(value).toFixed(2)}`}export function cartBadge(){return cart.count()}
