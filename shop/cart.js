(() => {
  const KEY='reqoo_shop_cart_v1';
  const PROMO_KEY='reqoo_shop_promo_v1';
  const money=n=>`RM ${Number(n||0).toFixed(2)}`;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=c=>localStorage.setItem(KEY,JSON.stringify(c));
  const getPromo=()=>localStorage.getItem(PROMO_KEY)||'';
  const setPromo=c=>localStorage.setItem(PROMO_KEY,String(c||'').trim().toUpperCase());
  const clearPromo=()=>localStorage.removeItem(PROMO_KEY);
  window.REQOO_CART={
    get:read,
    count:()=>read().reduce((n,x)=>n+Number(x.qty||1),0),
    subtotal:()=>read().reduce((n,x)=>n+Number(x.unitPrice||0)*Number(x.qty||1),0),
    total:()=>read().reduce((n,x)=>n+Number(x.unitPrice||0)*Number(x.qty||1),0),
    promo:getPromo,
    setPromo,
    clearPromo,
    add(item){const c=read(),key=String(item.sku||item.id||item.name);const x=c.find(i=>String(i.sku||i.id||i.name)===key);if(x)x.qty=Number(x.qty||1)+Number(item.qty||1);else c.push({...item,qty:Number(item.qty||1)});save(c);return c},
    remove(key){const c=read().filter(i=>String(i.sku||i.id||i.name)!==String(key));save(c);return c},
    updateQty(key,qty){const c=read();const x=c.find(i=>String(i.sku||i.id||i.name)===String(key));if(x)x.qty=Math.max(1,Number(qty)||1);save(c);return c},
    clear(){save([]);clearPromo()},
    money
  };
})();
