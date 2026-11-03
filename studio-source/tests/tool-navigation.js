// Existing CAD scenarios navigate the new toolbar popovers as a user would:
// close the previous tool and open the target tool before using its settings.
export function useToolNavigation(page){
 const raw=page.locator.bind(page);
 const openMenu=async loc=>{const id=await loc.evaluate(e=>e.closest('.toolbarMenu')?.id).catch(()=>null);if(id&&!await raw('#'+id).evaluate(e=>e.open))await raw('#'+id+'>summary').click()};
 const wrap=locator=>new Proxy(locator,{get(target,key){if(['click','fill','check','uncheck','selectOption','hover'].includes(key))return async(...args)=>{const controlId=await target.evaluate(e=>e.id).catch(()=>null);
if(key==='fill'&&controlId==='productText'&&!await target.isVisible()){await raw('#generatorMode').selectOption('classic');}
if(key==='click'&&['lampTool','creativeTool','ledTool'].includes(controlId)){
 const selected=await page.evaluate(id=>{const a=window.__reqoo,m=a.getSelection?.().find(m=>id==='lampTool'?m.userData.lamp:id==='creativeTool'?m.userData.creative:m.userData.led),p=id==='lampTool'?'lamp':id==='ledTool'?'led':m?.userData.product||'keychain',mode=id==='lampTool'?m?.userData.lamp?.parameters.shape||'lantern':id==='creativeTool'?m?.userData.creative?.parameters.mode||'topographic':'classic';return{product:p,mode}},controlId);
 await raw('#chooseProduct').click();await raw('#productCategory').selectOption('all');await raw('#productSearch').fill('');await raw('.productResult[data-product="'+selected.product+'"]').locator('button').first().click();await raw('#generatorMode').selectOption(selected.mode);return;
}
if(key==='selectOption'&&['creativeMode','lampShape'].includes(controlId)){
 const mode=typeof args[0]==='string'?args[0]:args[0].value,product=await page.evaluate(mode=>window.__reqoo.generatorStudio.registry.find(p=>p.modes.some(m=>m.id===mode))?.id,mode);
 await raw('#chooseProduct').click();await raw('#productCategory').selectOption('all');await raw('#productSearch').fill('');await raw('.productResult[data-product="'+product+'"]').locator('button').first().click();await raw('#generatorMode').selectOption(mode);return[mode];
}
if(key==='click'&&await target.evaluate(e=>e.matches('#lampDialog .lampClose')).catch(()=>false)){await raw('#chooseProduct').click();await raw('#productCategory').selectOption('all');await raw('#productSearch').fill('');await raw('.productResult[data-product="keychain"] button').first().click();return;}
if(key==='click'&&['closeImageShape','closeLED','closeCreative'].includes(controlId)&&await target.isHidden()){
 const product=await raw('#productKind').inputValue();await raw('#generatorMode').selectOption('classic');return;
}
if(key==='selectOption'&&await target.evaluate(e=>e.id==='productKind'&&e.hidden).catch(()=>false)){const id=typeof args[0]==='string'?args[0]:args[0].value;await raw('#chooseProduct').click();await raw('#productCategory').selectOption('all');await raw('#productSearch').fill('');await raw('.productResult[data-product="'+id+'"]').locator('button').first().click();return [id]}const info=await target.evaluate(el=>({panel:el.closest('.floatingToolPanel')?.id,dialog:!!el.closest('dialog'),toolbar:!!el.closest('#editToolbar')})).catch(()=>null);if(info&&!info.dialog&&!info.toolbar){const ids=await raw('.floatingToolPanel[open]').evaluateAll(els=>els.map(el=>el.id).filter(Boolean).reverse());for(const id of ids){if(id!==info.panel&&await raw('#'+id+' > .closeToolPanel').count())await raw('#'+id+' > .closeToolPanel').click()}if(info.panel&&!await raw('#'+info.panel).evaluate(el=>el.open)){const trigger=raw('[data-tool-panel="'+info.panel+'"]');if(await trigger.count()){await openMenu(trigger);await trigger.click()}}}await openMenu(target);return target[key](...args)};if(['first','last','nth','filter','locator'].includes(key))return(...args)=>wrap(target[key](...args));const value=target[key];return typeof value==='function'?value.bind(target):value}});
 page.locator=(...args)=>wrap(raw(...args));return page;
}
