// Real canvas controls only: helpers never write hidden form state or app internals.
export async function toolField(page,key){
 if(await page.locator('#operationGizmo[data-compact=true]').isVisible()){const select=page.getByRole('combobox',{name:'Sketch parameter',exact:true});if(await select.isVisible())await select.selectOption(key);return page.locator('#gizmoValue');}
 const point=/^point:(\d+):([xy])$/.exec(key),segment=/^(?:segment|lock):(\d+)/.exec(key);
 if(point){await page.locator('[data-gizmo-field="point:'+point[1]+':x"]').click();if(point[2]==='y')await page.getByRole('button',{name:'Point coordinate Y',exact:true}).click();}
 else if(segment){await page.locator('[data-gizmo-field="point:'+segment[1]+':x"]').click();if(key.startsWith('segment:')&&key.endsWith(':length'))await page.locator('[data-gizmo-field="'+key+'"]').click();}
 else await page.locator('#operationGizmo [data-gizmo-field="'+key+'"]').click();
 return page.locator('#gizmoValue');
}
export async function setToolValue(page,key,value){const input=await toolField(page,key);await input.fill(String(value));}
export async function setToolChoice(page,key,value){if(/^(?:segment|lock):/.test(key))await toolField(page,key);const wrap=page.locator('[data-gizmo-choice="'+key+'"]');if(await wrap.locator('select').count())await wrap.locator('select').selectOption(value);else await wrap.locator('button[data-value="'+value+'"]').click();}
export async function setToolToggle(page,key,value=true){if(key.startsWith('lock:'))await toolField(page,key);const button=page.locator('[data-gizmo-choice="'+key+'"] button');if((await button.getAttribute('aria-pressed'))!==String(value))await button.click();}
export const applyTool=page=>page.locator('#operationGizmo [data-apply]').click();
export const cancelTool=page=>page.locator('#operationGizmo [data-cancel]').click();
