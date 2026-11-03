import * as THREE from 'three';
import './cad-workspace.css';

const ICONS={
 generator:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 add:'<path d="M12 4v16M4 12h16"/>',
 tools:'<path d="m4 20 7-7m2-2 7-7M5 4l4 4-3 3-4-4m12 10 4 4 3-3-4-4"/>',
 items:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
 properties:'<path d="M4 7h16M4 17h16M9 4v6m6 4v6"/>',
 file:'<path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 15h8m-4-4v8"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 expand:'<path d="m6 14 6-6 6 6"/>'
};
function icon(key){return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[key]+'</svg>';}
export function installCadWorkspace({group,editor,add,choose,refresh,products,camera,controls,renderer,status}){
 const $=id=>document.getElementById(id),app=$('app'),bar=$('editToolbar'),viewport=$('viewport'),original=[...bar.children];
 const legacyAside=app.querySelector(':scope>aside:not(#inspector)'),legacyShape=$('box').closest('section'),shapePopup=legacyShape.closest('.floatingToolPanel');
 const mobile=matchMedia('(max-width: 760px)'),touch=matchMedia('(pointer:coarse)');
 document.body.classList.add('cadWorkspace');legacyAside.id='cadLegacyAside';legacyAside.hidden=true;$('workspaceNav').hidden=true;
 const dock=document.createElement('aside');dock.id='cadDock';dock.setAttribute('aria-label','Tetapan studio');dock.innerHTML='<header id="cadDockHeading"><button type="button" id="cadSheetHandle" aria-label="Besarkan atau kecilkan panel">'+icon('expand')+'</button><h2 id="cadPanelTitle">Mod & reka bentuk</h2><button type="button" id="cadClosePanel" aria-label="Tutup tetapan">'+icon('close')+'</button></header><div id="cadPanelBody"></div>';
 const rail=document.createElement('nav');rail.id='cadRail';rail.setAttribute('aria-label','Alat studio');
 const panes=new Map(),titles={generator:'Mod & reka bentuk',add:'Tambah bentuk',tools:'Alat lanjutan',items:'Objek & susunan',properties:'Ukuran & warna',file:'Fail & eksport'};
 for(const [key,label]of [['generator','Mod'],['add','Tambah'],['tools','Alat'],['items','Objek'],['properties','Ubah'],['file','Fail']]){
  const pane=document.createElement('section');pane.id='cadPane-'+key;pane.className='cadPane';pane.hidden=true;panes.set(key,pane);dock.querySelector('#cadPanelBody').append(pane);
  const b=document.createElement('button');b.type='button';b.id='cad-'+key;b.dataset.cadPane=key;b.innerHTML=icon(key)+'<span>'+label+'</span>';b.setAttribute('aria-label',titles[key]);b.setAttribute('aria-controls','cadDock');b.setAttribute('aria-expanded','false');b.onclick=()=>openPane(key,true);rail.append(b);
 }
 let active=null,lastFocus=null,expanded=false;
 function closePane(){active=null;document.body.classList.remove('cadDockOpen','cadSheetExpanded');dock.hidden=true;rail.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded','false'));if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
 function openPane(key,toggle=false){
  if(active===key&&toggle)return closePane();lastFocus=document.activeElement;active=key;
  dock.hidden=false;document.body.classList.add('cadDockOpen');$('cadPanelTitle').textContent=titles[key];panes.forEach((p,k)=>p.hidden=k!==key);
  rail.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.cadPane===key)));
  if(key==='properties')$('inspector').hidden=!editor.getSelectedMeshes().length;
  $('cadPanelBody').scrollTop=0;
 }
 const generator=panes.get('generator');generator.append($('productPanel'));
 for(const el of [legacyAside.querySelector('.productActions'),$('modelState')])if(el)generator.append(el);
 const objects=$('objects').closest('section');panes.get('items').append(objects);const selectHint=document.createElement('p');selectHint.className='cadHint';selectHint.textContent='Pilih objek di sini atau terus pada ruang 3D. Ctrl / Cmd untuk pilihan berbilang; pada telefon, gunakan butang Pilih berbilang.';objects.prepend(selectHint);
 const multi=document.createElement('button');multi.type='button';multi.id='cadMultiSelect';multi.textContent='Pilih berbilang';multi.setAttribute('aria-pressed','false');objects.before(multi);
 let multiMode=false;multi.onclick=()=>{multiMode=!multiMode;multi.setAttribute('aria-pressed',String(multiMode));};
 const objectChange=$('objects').onchange;$('objects').onchange=e=>{objectChange?.call($('objects'),e);syncSelection();};
 const props=panes.get('properties');props.append($('inspector'),$('materialPanel'));const noSelection=document.createElement('p');noSelection.id='cadNoSelection';noSelection.className='cadHint';noSelection.textContent='Pilih objek untuk ubah ukuran tepat, kedudukan dan putaran.';props.prepend(noSelection);
 const added=panes.get('add');added.append(legacyShape);
 if(shapePopup){document.querySelectorAll('button[data-tool-panel]').forEach(b=>{if(b.dataset.toolPanel===shapePopup.id)b.hidden=true;});shapePopup.hidden=true;}
 const primitives=document.createElement('div');primitives.className='cadPrimitiveGrid';legacyShape.prepend(primitives);
 for(const id of ['box','cyl','sphere'])primitives.append($(id));
 for(const [id,label,geometry]of [['cadCone','Kon',()=>new THREE.ConeGeometry(15,30,64).rotateX(Math.PI/2)],['cadTorus','Torus',()=>new THREE.TorusGeometry(14,4,24,96)]]){
  const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.onclick=()=>{editor.checkpoint();add(geometry(),label);products.fit();if(mobile.matches)closePane();};primitives.append(b);
 }
 const sketch=$('openCustomShape');sketch.setAttribute('aria-label','Sketch dan extrude');sketch.title='Sketch dan extrude';let st=sketch.querySelector('span');if(!st){st=document.createElement('span');sketch.append(st);}st.textContent='Sketch / Extrude';added.prepend(sketch);
 const context=document.createElement('div');context.id='cadContext';context.setAttribute('aria-label','Alat objek dipilih');context.hidden=true;
 for(const id of ['moveMode','rotateObject','scaleObject','duplicate','delete'])if($(id))context.append($(id));
 const view=document.createElement('div');view.id='cadViewTools';view.setAttribute('aria-label','Navigasi 3D');for(const id of ['orbitMode','fitProduct','frontProduct'])if($(id))view.append($(id));
 const quick=document.createElement('div');quick.id='cadQuickActions';for(const id of ['undo','redo'])quick.append($(id));
 const file=panes.get('file'),fileActions=$('fileActions');file.append(fileActions);
 for(const id of ['uiLanguage','appTheme']){const el=$(id);if(!el)continue;const label=document.createElement('label');label.htmlFor=id;label.textContent=id==='uiLanguage'?'Bahasa':'Tema';file.append(label,el);}
 // Export review is the only visible route to STL/3MF/Bambu; keep underlying command IDs.
 const fileStore=document.createElement('div');fileStore.id='cadExportCommands';fileStore.hidden=true;for(const id of ['exportPart','export','export3mf','openBambu'])fileStore.append($(id));file.append(fileStore);
 const review=$('exportTab');review.hidden=false;review.textContent='Semak & eksport';review.className='cadPrimary';file.prepend(review);
 const fileTop=document.createElement('button');fileTop.type='button';fileTop.id='cadFileTop';fileTop.innerHTML=icon('file')+'<span>Fail</span>';fileTop.onclick=()=>openPane('file',true);quick.append(fileTop);$('topbar').append(quick);
 const tools=panes.get('tools');for(const el of original){if(el.parentElement!==bar)continue;if(el.classList.contains('toolbarHint')){el.hidden=true;continue;}if(el.querySelector('button')||el.tagName==='BUTTON'||el.tagName==='DETAILS')tools.append(el);else el.remove();}
 tools.querySelectorAll('.toolbarMenu').forEach(el=>{el.classList.add('cadToolCategory');el.querySelectorAll('summary img').forEach(img=>img.alt='');const text=document.createElement('span');text.textContent=el.querySelector('summary').getAttribute('aria-label');el.querySelector('summary').append(text);});
 const legacyMore=document.createElement('details');legacyMore.id='cadLegacyMore';legacyMore.innerHTML='<summary>Alat & tetapan tambahan</summary>';for(const el of [...legacyAside.children])if(!el.hidden&&el.querySelector('button,input,select'))legacyMore.append(el);if(legacyMore.children.length>1)tools.append(legacyMore);
 bar.append(rail,dock,context);viewport.append(view);
 $('cadClosePanel').onclick=closePane;$('cadSheetHandle').onclick=()=>{expanded=!expanded;document.body.classList.toggle('cadSheetExpanded',expanded);$('cadSheetHandle').setAttribute('aria-expanded',String(expanded));};
 let handleY=null;$('cadSheetHandle').addEventListener('pointerdown',e=>{handleY=e.clientY;e.target.setPointerCapture?.(e.pointerId);});$('cadSheetHandle').addEventListener('pointerup',e=>{if(handleY===null)return;if(Math.abs(e.clientY-handleY)>25){expanded=e.clientY<handleY;document.body.classList.toggle('cadSheetExpanded',expanded);}handleY=null;});
 // Group existing lamp controls once; all parameter IDs and generator handlers are preserved.
 function fold(parent,title,nodes,id){const d=document.createElement('details');d.id=id;d.className='cadSettings';d.innerHTML='<summary>'+title+'</summary>';parent.append(d);for(const n of nodes)if(n)d.append(n);return d;}
 const dims=$('lampDimensions');
 if(dims){
  const size=['diameter','middleDiameter','topDiameter','height','wall','bottomThickness'],style=['tiers','bulge','ribs','ribDepth','ripple','twist'],path=['pathAmplitude','pathWaves','pathPitch'];
  fold(dims.parentElement,'Saiz & ketebalan',size.map(k=>$('lamp_'+k)?.parentElement),'cadLampSize').open=true;
  fold(dims.parentElement,'Bentuk & corak',style.map(k=>$('lamp_'+k)?.parentElement),'cadLampStyle');
  fold(dims.parentElement,'Laluan cetakan',path.map(k=>$('lamp_'+k)?.parentElement).concat([$('lampNonplanarPreset'),$('lampNozzlePreview')]),'cadLampPath');
  fold(dims.parentElement,'Dudukan & sumber cahaya',[dims],'cadLampHardware');
  if($('latticeSample'))fold(dims.parentElement,'Sampel lattice P2S',[$('latticeSample')],'cadLatticeSection');
  fold(dims.parentElement,'Demo corak',[$('lampRestoreDemo')],'cadLampDemo');
  const views=$('lampPreviewMode')?.closest('.lampViewChoices');if(views)views.hidden=true;
  if($('lampSampleExport'))$('lampSampleExport').hidden=true;
  const footer=$('lampGenerate').closest('footer');footer.parentElement.append(footer);
 }
 // Keep playback compact; technical readouts are available on demand.
 for(const panel of [$('lampNozzleControls'),$('latticePlayback')])if(panel){const readout=panel.querySelector('small');if(readout)fold(panel,'Koordinat & pelan',[readout],panel.id+'Readout');}
 function syncSelection(){const picked=editor.getSelectedMeshes();context.hidden=!picked.length;noSelection.hidden=!!picked.length;if(active==='properties')$('inspector').hidden=!picked.length;rail.querySelector('[data-cad-pane=properties]').dataset.selected=String(!!picked.length);}
 const selection=editor.selection;editor.selection=(...args)=>{selection(...args);syncSelection();};
 for(const id of ['box','cyl','sphere','addCustomShape','generateProduct','lampGenerate','lampUpdate','generateCreative','generateLED']){
  const el=$(id);if(el)el.addEventListener('click',()=>{if(['box','cyl','sphere','addCustomShape'].includes(id)){products.fit();if(mobile.matches)closePane();}syncSelection();});
 }
 for(const event of ['reqoo-lamp-generated','reqoo-lattice-visible','reqoo-generator-result'])document.addEventListener(event,()=>{if(mobile.matches)closePane();syncSelection();});
 $('lampNozzlePreview')?.addEventListener('click',()=>{if(mobile.matches)closePane();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!document.querySelector('dialog[open]:not(.generatorInline)'))closePane();});
 // Touch navigation never starts the old direct mesh drag. Tap selects; gizmos edit explicitly.
 const touches=new Map(),ray=new THREE.Raycaster();let gesture=false,tapStart=null;
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;touches.set(e.pointerId,true);if(touches.size>1)gesture=true;else{gesture=false;tapStart={x:e.clientX,y:e.clientY};}},true);
 renderer.domElement.addEventListener('pointermove',e=>{if(tapStart&&e.pointerType==='touch'&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>8)gesture=true;},true);
 function touchEnd(e){if(e.pointerType!=='touch')return;const tapped=!gesture&&touches.size===1&&e.type==='pointerup';touches.delete(e.pointerId);if(tapped){const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const m=ray.intersectObjects(group.children,false).find(h=>!h.object.userData.locked)?.object;choose(m||null,false,multiMode);syncSelection();}if(!touches.size){gesture=false;tapStart=null;}}
 renderer.domElement.addEventListener('pointerup',touchEnd,true);renderer.domElement.addEventListener('pointercancel',touchEnd,true);
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
 const layout=()=>{if(mobile.matches){closePane();renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}else{renderer.setPixelRatio(Math.min(devicePixelRatio,2));if(!active)openPane('generator');}if(touch.matches)editor.setTransformMode('orbit');};
 mobile.addEventListener('change',layout);layout();syncSelection();
 const empty=$('canvasEmpty');empty.querySelector('h2').textContent='Mulakan reka bentuk';empty.querySelector('p').textContent='Pilih Mod untuk generator atau Tambah untuk bentuk sendiri.';empty.querySelector('span').textContent='UNIT mm · SENTUH UNTUK PILIH';
 if(window.__reqoo)window.__reqoo.cadWorkspace={openPane,closePane,active:()=>active};
 status('Sedia · pilih Mod atau Tambah. Sentuh objek untuk pilih, dua jari untuk zoom / pan.');
}
