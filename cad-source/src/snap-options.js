const options=[['snapGrid','Snap to grid','Grid snapping'],['snapGeometry','Geometry points','Geometry snapping'],['snapGuides','Show guides','Snapping guides'],['snapHints','Show hints','Snapping hints']];
export function createSnapOptions({stage,before,preferences,save,onChange}){
 const button=document.createElement('button');button.id='snapOptionsToggle';button.type='button';button.dataset.control='snap';button.setAttribute('aria-label','Snapping options');button.setAttribute('aria-expanded','false');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7 9 5 5 5-5"/></svg>';before.before(button);
 const panel=document.createElement('section');panel.id='snapOptions';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Snapping options');panel.innerHTML='<header><strong>Snaps & guides</strong><button aria-label="Close snapping options" type="button">×</button></header><label><input type="checkbox" data-pref="snap">Enable snapping</label>'+options.map(([key,label])=>`<label><input type="checkbox" data-pref="${key}">${label}</label>`).join('')+'<small>Hold Alt to move freely. Typed values stay exact.</small>';stage.append(panel);for(const b of panel.querySelectorAll('button'))b.dataset.control='snap';
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');}
 function sync(){for(const input of panel.querySelectorAll('input'))input.checked=preferences[input.dataset.pref]!==false;}
 button.onclick=()=>{const open=panel.hidden;panel.hidden=!open;button.setAttribute('aria-expanded',String(open));sync();};panel.querySelector('button').onclick=close;
 for(const input of panel.querySelectorAll('input'))input.onchange=()=>{preferences[input.dataset.pref]=input.checked;save();onChange?.();};
 panel.onkeydown=e=>{if(e.key==='Escape'){close();button.focus();}};document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target)&&!button.contains(e.target))close();});
 return{close,sync};
}
export function mountSnapSettings(container,preferences,save){
 const group=document.createElement('fieldset');group.className='snapSettings';group.innerHTML='<legend>Snaps & gizmo</legend>'+options.map(([key,,label])=>`<label class="check"><input type="checkbox" data-pref="${key}">${label}</label>`).join('')+'<label>Default gizmo coordinates<select aria-label="Default gizmo coordinates"><option value="world">World</option><option value="local">Local / selected face</option></select></label>';
 for(const input of group.querySelectorAll('input')){input.checked=preferences[input.dataset.pref]!==false;input.onchange=()=>{preferences[input.dataset.pref]=input.checked;save();};}
 const select=group.querySelector('select');select.value=preferences.gizmoFrame||'world';select.onchange=()=>{preferences.gizmoFrame=select.value;save();};container.append(group);
}
