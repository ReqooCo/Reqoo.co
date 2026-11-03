import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {basis,validateProject} from './engine.js';
import './style.css';
import {createDirectModeling} from './direct-modeling.js';
import {threeMF,sketchExport} from './exports.js';
import {solveSketch} from './constraints.js';
import {simpleSource,immediateTransform} from './immediate-preview.js';
import {facePrismData,updatePrismPositions} from './face-prism.js';

const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=(path)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const icons={
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 sketch:'<path d="m4 16 12-12 4 4L8 20H4v-4Zm9-9 4 4"/>',
 add:'<path d="M12 4v16M4 12h16"/>',
 construct:'<path d="m3 17 9-12 9 12H3Zm9-12v16"/>',
 transform:'<path d="M12 2v20M2 12h20m-7-7-3-3-3 3m6 14-3 3-3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
 tools:'<path d="m5 20 8-8m0-7 6-2-2 6-4 3-3-3 3-4ZM4 17l3 3"/>',
 items:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
 history:'<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7m1-4v6l4 2"/>',
 settings:'<path d="M4 7h16M4 17h16M9 4v6m6 4v6"/>',
 undo:'<path d="m8 5-6 6 6 6m-6-6h12a6 6 0 0 1 6 6"/>',
 redo:'<path d="m16 5 6 6-6 6m6-6H10a6 6 0 0 0-6 6"/>',
 fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8Z"/>',
 close:'<path d="m5 5 14 14M19 5 5 19"/>',
 file:'<path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h8"/>',
 measure:'<path d="m3 17 14-14 4 4L7 21 3 17Zm5-5 3 3m1-7 3 3"/>'
};

Object.assign(icons,{
 rectangle:'<rect x="4" y="6" width="16" height="12" rx="1"/>',circle:'<circle cx="12" cy="12" r="8"/>',ellipse:'<ellipse cx="12" cy="12" rx="9" ry="6"/>',polygon:'<path d="m12 3 8 5v8l-8 5-8-5V8Z"/>',polyline:'<path d="m3 18 6-12 6 10 6-13"/><circle cx="9" cy="6" r="1"/>',arc:'<path d="M4 18a8 8 0 0 1 16 0"/><circle cx="4" cy="18" r="1"/><circle cx="20" cy="18" r="1"/>',spline:'<path d="M3 18C3-2 21 26 21 6"/><circle cx="3" cy="18" r="1"/><circle cx="21" cy="6" r="1"/>',
 box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10"/>',cylinder:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5m-16 14c0-4 16-4 16 0"/>',sphere:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',torus:'<ellipse cx="12" cy="12" rx="10" ry="7"/><ellipse cx="12" cy="10" rx="4" ry="2"/>',
 extrude:'<path d="m4 13 8-4 8 4-8 5-8-5Zm0 0v6l8 3 8-3v-6M12 9V2m-3 3 3-3 3 3"/>',hole:'<path d="m3 8 9-4 9 4v10l-9 4-9-4V8Zm0 0 9 4 9-4m-9 4v10"/><ellipse cx="12" cy="8" rx="3" ry="1.5"/><path d="M12 1v4m-2-2 2 2 2-2"/>',
 revolve:'<path d="M12 2v20M8 5H4v14h4m8-14c8 2 8 12 0 14m0-4v4h4"/>',loft:'<ellipse cx="12" cy="4" rx="4" ry="2"/><ellipse cx="12" cy="20" rx="9" ry="2"/><path d="M8 4 3 20M16 4l5 16"/>',sweep:'<path d="M4 19c0-14 16-2 16-16"/><ellipse cx="4" cy="19" rx="3" ry="2"/><ellipse cx="20" cy="3" rx="3" ry="2"/>',offsetFace:'<path d="M4 20h16V9H4v11ZM4 5h16M12 9V1m-3 3 3-3 3 3"/>',fillet:'<path d="M4 21V11a8 8 0 0 1 8-8h9M4 21h17V3M4 3h4" stroke-dasharray="2 2"/>',chamfer:'<path d="M4 21V10l7-7h10v18H4ZM4 3h4m-4 0v4" />',shell:'<path d="m3 7 9-4 9 4v13H3V7Zm3 1v9h12V8l-6 3-6-3Z"/>',
 union:'<rect x="3" y="7" width="12" height="13" rx="1"/><path d="M9 7V3h12v13h-6"/>',subtract:'<path d="M3 7h6v9h6v4H3V7Zm6-4h12v13" stroke-dasharray="3 2"/><path d="M12 7h6"/>',intersect:'<path d="M3 7h12v13H3ZM9 3h12v13H9Z"/><path d="m9 8 5 5m-5 0 3 3"/>',split:'<path d="M3 5h7v14H3V5Zm11 0h7v14h-7V5ZM12 2v20" stroke-dasharray="3 2"/>',
 move:icons.transform,duplicate:'<rect x="3" y="7" width="13" height="14" rx="1"/><path d="M8 7V3h13v14h-5"/>',rotate:'<path d="M4 9a8 8 0 1 1 0 6m0-12v6h6"/><rect x="9" y="9" width="6" height="6"/>',scale:'<path d="M14 3h7v7m0-7-9 9M3 13h8v8H3v-8Zm0-8V3h2m3 0h3m10 10v3m0 3v2h-2" />',mirror:'<path d="M12 2v20M8 6 3 18h5V6Zm8 0 5 12h-5V6Z"/>',pattern:'<rect x="3" y="8" width="4" height="8"/><rect x="10" y="8" width="4" height="8"/><rect x="17" y="8" width="4" height="8"/>',circularPattern:'<circle cx="12" cy="12" r="2"/><rect x="10" y="1" width="4" height="4"/><rect x="10" y="19" width="4" height="4"/><rect x="1" y="10" width="4" height="4"/><rect x="19" y="10" width="4" height="4"/>',align:'<path d="M2 20h20M6 4h5v12H6V4Zm9 5h5v7h-5V9Z"/>',plane:'<path d="m2 13 12-7 8 5-12 7-8-5ZM3 6l6-3m8 15 4-2"/>',axis:'<path d="M12 21V3m-4 4 4-4 4 4M3 18l9 3 9-3"/>',
 export:'<path d="M12 15V2m-4 4 4-4 4 4M4 12v9h16v-9"/>',import:'<path d="M12 2v13m-4-4 4 4 4-4M4 15v6h16v-6"/>',save:'<path d="M4 3h13l3 3v15H4V3Zm3 0v7h9V3M8 21v-7h8v7"/>',delete:'<path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',face:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10"/><path d="m7 7 5-2 5 2-5 2Z"/>',selectOther:'<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 18v3h12V9h-3M7 9l2 2 4-4"/>',multi:'<rect x="3" y="3" width="12" height="12" rx="1"/><path d="M9 18v3h12V9h-3M6 9l3 3 6-7"/>',isolate:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',check:'<path d="m4 12 5 5L20 5"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>'
});
function buttonLabel(button,key,label){button.innerHTML=ico(key)+'<span>'+esc(label)+'</span>';button.setAttribute('aria-label',label);button.title=label;}
const actionIcons={'File':'file','Export':'export','New sketch':'sketch','Draw on plane':'sketch','Create sketch':'check','Apply':'check','Update feature':'check','Cancel':'close','Finish sketch':'check','Continue editing':'undo','New project':'file','Save project':'save','Open project':'file','Import STEP':'import','Export STEP':'export','Export STL':'export','Items':'items','History':'history','Settings':'settings','About / licenses':'file','Multi-select':'multi','Isolate':'isolate','Measure':'measure','Make solid':'box','Circle on face':'circle','Rectangle on face':'rectangle','Edit sketch':'sketch','Delete':'delete','Select other':'selectOther','Solve constraints':'lock','Clear constraints':'undo','Add point':'add','Remove last':'delete'};
function decorateButtons(){for(const b of document.querySelectorAll('button')){if(b.dataset.control||b.closest('#faceDistance,#sketchDimensions')||b.querySelector('svg')||b.closest('#viewCube'))continue;const label=b.textContent.trim();if(!label)continue;const key=actionIcons[label]||[...Object.values(tools).flat()].find(t=>t[1]===label)?.[0]||(b.classList.contains('historyRow')?'history':b.closest('.itemRow')?'box':'settings');buttonLabel(b,key,label);}}

const ico=k=>svg(icons[k]||icons.tools);
document.getElementById('app').innerHTML='<header id="top"><div class="brand">reqoo<span>CAD</span></div><button id="fileMenu">File</button><button id="undo" aria-label="Undo">'+ico('undo')+'</button><button id="redo" aria-label="Redo">'+ico('redo')+'</button><input id="projectName" aria-label="Project name" value="Untitled"><span id="saveState">Saved locally</span><button id="itemsToggle" aria-label="Items">'+ico('items')+'</button><button id="historyToggle" aria-label="History">'+ico('history')+'</button><button id="settingsToggle" aria-label="Settings">'+ico('settings')+'</button><button id="exportTop" class="primary">Export</button></header><main id="stage"><div id="canvas"></div><div id="empty"><h1>Start with a sketch</h1><p>Choose a plane. Draw a profile. Build a solid.</p><button id="startSketch">New sketch</button></div><div id="workspaceModes" role="group" aria-label="Workspace mode"><button id="modeSketch" aria-pressed="false">'+ico('sketch')+'<span>Sketch</span></button><button id="modeSolid" aria-pressed="true">'+ico('box')+'<span>Solid</span></button></div><nav id="rail" aria-label="Modeling tools"></nav><section id="menu" hidden aria-label="Tool menu"></section><section id="toolPanel" hidden aria-label="Tool settings"></section><section id="sidebar" hidden></section><div id="viewCube" aria-label="View orientation"><button data-view="top">TOP</button><div><button data-view="front">FRONT</button><button data-view="right">RIGHT</button></div><button data-view="iso">ISO</button><span>mm</span></div><div id="selectionBar"><label>Selection<select id="pickMode"><option value="auto">Automatic</option><option value="body">Bodies</option><option value="face">Faces</option><option value="edge">Edges</option><option value="sketch">Sketches</option></select></label><button id="multi" aria-pressed="false">Multi-select</button><button id="isolate">Isolate</button><button id="measure">Measure</button><button id="fit" aria-label="Zoom to fit">'+ico('fit')+'</button></div><div id="sketchBar" hidden><strong id="sketchHint">Sketch</strong><button id="cancelSketch">Cancel</button><button id="finishSketch" class="primary">Finish sketch</button></div><div id="context" hidden></div></main><footer><span id="status" role="status">Preparing CAD engine…</span><span id="units">mm · grid 1 mm</span></footer><input id="openFile" type="file" accept=".json,.rqcad" hidden><input id="stepFile" type="file" accept=".step,.stp" hidden><dialog id="searchDialog"><header><strong>Search commands</strong><button data-close aria-label="Close">'+ico('close')+'</button></header><input id="commandQuery" placeholder="Search tools…" aria-label="Search commands"><div id="commandResults"></div></dialog><dialog id="errorDialog"><h2>CAD operation not completed</h2><p id="errorText"></p><button id="closeError">Continue editing</button></dialog>';

const sketchPrimitives=new Set(['rectangle','circle','ellipse','polygon','polyline','arc','spline']);
const tools={
 sketch:[['rectangle','Rectangle'],['circle','Circle'],['ellipse','Ellipse'],['polygon','Polygon'],['polyline','Line / polyline'],['arc','Arc'],['spline','Spline'],['sketchOffset','Offset sketch'],['sketchFillet','Fillet sketch'],['sketchMirror','Mirror sketch']],
 add:[['box','Box'],['cylinder','Cylinder'],['sphere','Sphere'],['torus','Torus'],['import','Import STEP']],
 construct:[['plane','Offset plane'],['axis','Axis']],
 transform:[['move','Move / Translate'],['rotate','Rotate'],['scale','Scale'],['mirror','Mirror'],['duplicate','Copy'],['pattern','Linear pattern'],['circularPattern','Circular pattern'],['align','Align']],
 tools:[['hole','Hole'],['extrude','Extrude'],['revolve','Revolve'],['loft','Loft'],['sweep','Sweep'],['offsetFace','Offset Face'],['draft','Draft / Taper'],['fillet','Fillet'],['chamfer','Chamfer'],['shell','Shell'],['union','Union'],['subtract','Subtract'],['intersect','Intersect'],['split','Split Body']]
};
for(const [key,label]of [['search','Search'],['sketch','Draw'],['add','Shapes'],['construct','Construct'],['transform','Transform'],['tools','Solid tools']]){
 const b=document.createElement('button');b.id='nav-'+key;b.type='button';b.innerHTML=ico(key)+'<span>'+label+'</span>';b.onclick=()=>key==='search'?search():showMenu(key);$('rail').append(b);
}
const preferences=Object.assign({units:'mm',precision:3,theme:'light',snap:true},(()=>{try{return JSON.parse(localStorage.getItem('reqoo-cad-preferences')||'{}');}catch{return{};}})());
const themeToggle=document.createElement('button');themeToggle.id='themeToggle';themeToggle.type='button';themeToggle.dataset.control='theme';themeToggle.setAttribute('aria-label','Toggle dark mode');$('settingsToggle').before(themeToggle);
const moon='<path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.4 8.5 8.5 0 1 0 20.5 13.5Z"/>';
const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
themeToggle.onclick=()=>{preferences.theme=preferences.theme==='dark'?'light':'dark';updatePreferences();};
const unitFactorValue=()=>preferences.units==='in'?25.4:1;
function updatePreferences(){themeToggle.innerHTML=svg(preferences.theme==='dark'?sun:moon);themeToggle.setAttribute('aria-pressed',String(preferences.theme==='dark'));themeToggle.title=preferences.theme==='dark'?'Switch to light mode':'Switch to dark mode';localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));document.documentElement.dataset.theme=preferences.theme;scene.background.set(preferences.theme==='dark'?'#151e29':'#f6f7f9');for(const [i,m]of (Array.isArray(grid.material)?grid.material:[grid.material]).entries())m.color.set(preferences.theme==='dark'?(i?'#283644':'#34495e'):(i?'#e6e9ee':'#cbd1d9'));$('units').textContent=preferences.units;dimensionFeature=null;render();}
let workspaceMode='solid';
let doc={format:'reqoo-cad',version:1,title:'Untitled',features:[],ui:{hidden:[],colors:{}}},items=[],selection=[],undo=[],redo=[],busy=false,ready=false,isolate=false,editing=null,activeTool=null,sketchMode=null,draft=null,counter=0,unitFactor=1,gridStep=1;
let displayItems=null,previewVersion=0;
let worker=null,serial=0,requests=new Map();const uid=()=>('f'+Date.now().toString(36)+(++counter).toString(36));
function spawn(){worker=new Worker(new URL('./kernel.worker.js',import.meta.url),{type:'module'});worker.onmessage=e=>{const p=requests.get(e.data.id);if(!p)return;clearTimeout(p.timer);requests.delete(e.data.id);e.data.ok?p.resolve(e.data.result):p.reject(Error(e.data.error));};worker.onerror=e=>{for(const p of requests.values()){clearTimeout(p.timer);p.reject(Error('The CAD engine stopped. Your last completed model is preserved.'));}requests.clear();worker.terminate();worker=null;status('CAD engine needs a reload. Save your project before refreshing.');};}
function rpc(type,payload={}){if(!worker)spawn();return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{worker?.terminate();worker=null;for(const p of requests.values())p.reject(Error('Operation timed out. The previous model is unchanged.'));requests.clear();},90000);requests.set(id,{resolve,reject,timer});worker.postMessage({id,type,doc,...payload});});}
function status(text){$('status').textContent=text;}
function error(e){$('errorText').textContent=e.message||String(e);if(!$('errorDialog').open)$('errorDialog').showModal();status('Operation not completed. Previous model preserved.');}
$('closeError').onclick=()=>$('errorDialog').close();
function setBusy(value){busy=value;document.body.classList.toggle('busy',value);for(const b of document.querySelectorAll('button[data-apply]'))b.disabled=value;updateHistoryButtons();}
function snapshot(){return JSON.parse(JSON.stringify(doc));}
function remember(stack,value){stack.push(value);while(stack.length>20||stack.length>1&&stack.reduce((n,d)=>n+JSON.stringify(d).length,0)>24e6)stack.shift();}
function saveLocal(){try{const next=JSON.stringify(doc),prior=localStorage.getItem('reqoo-cad-v1');if(prior&&prior!==next)localStorage.setItem('reqoo-cad-v1-backup',prior);localStorage.setItem('reqoo-cad-v1',next);$('saveState').textContent='Saved locally';}catch{$('saveState').textContent='Download a project backup';}}
async function rebuild(next,{history=true,selectId=null}={}){
 if(busy)throw Error('Wait for the current CAD operation');validateProject(next);setBusy(true);
 try{const result=await rpc('build',{doc:next});if(history){remember(undo,snapshot());redo=[];}doc=JSON.parse(JSON.stringify(next));items=result;pickCandidates=[];if(selectId)selection=result.some(i=>i.id===selectId)?[{id:selectId,kind:items.find(i=>i.id===selectId).kind}]:[];else selection=selection.filter(s=>items.some(i=>i.id===s.id));render();saveLocal();$('projectName').value=doc.title;status(items.filter(i=>i.kind==='body').length+' solid bodies · ready');return result;}
 finally{setBusy(false);}
}
async function apply(type,params={},inputs=selectedIds(),editId=null){
 if(['sketch','box','cylinder','sphere','torus','plane','axis','import'].includes(type))inputs=[];
 if(type==='sketch'&&params.shape==='polyline'){const solved=solveSketch(params.points,params.constraints||[]);params={...params,points:solved.points};}
 params=referenceParams(type,params);
 const next=snapshot(),f={id:editId||uid(),type,name:(type==='sketch'?(params.shape||'Sketch'):labelFor(type))+' '+(next.features.filter(f=>f.type===type).length+1),params,inputs};
 if(editId){const index=next.features.findIndex(f=>f.id===editId);if(index<0)throw Error('History step no longer exists');f.name=next.features[index].name;next.features[index]=f;}else next.features.push(f);
 await rebuild(next,{selectId:f.id});return f.id;
}
function selectedIds(){return [...new Set(selection.map(s=>s.id))];}
function selectedItem(){return items.find(i=>i.id===selection.at(-1)?.id);}
function updateHistoryButtons(){$('undo').disabled=!ready||busy||!undo.length;$('redo').disabled=!ready||busy||!redo.length;}
async function travel(from,to){if(!from.length||busy)return;const next=from.at(-1),prior=snapshot();await rebuild(next,{history:false});from.pop();remember(to,prior);updateHistoryButtons();}
$('undo').onclick=()=>travel(undo,redo).catch(error);$('redo').onclick=()=>travel(redo,undo).catch(error);
$('projectName').onchange=()=>{doc.title=$('projectName').value.trim().slice(0,80)||'Untitled';saveLocal();};
function labelFor(type){return [...Object.values(tools).flat(),['sketch','Sketch'],['delete','Delete']].find(t=>t[0]===type)?.[1]||type;}
function closePanels(){$('menu').hidden=$('toolPanel').hidden=true;activeTool=null;editing=null;document.querySelectorAll('#rail button').forEach(b=>b.classList.remove('active'));}

function setWorkspaceMode(mode){
 workspaceMode=mode;$('stage').dataset.workspace=mode;$('modeSketch').setAttribute('aria-pressed',String(mode==='sketch'));$('modeSolid').setAttribute('aria-pressed',String(mode==='solid'));
 for(const key of ['sketch','add','construct','transform','tools'])$('nav-'+key).hidden=mode==='sketch'?key!=='sketch':key==='sketch';
 closePanels();$('pickMode').value='auto';renderContext();
}
$('modeSketch').onclick=()=>setWorkspaceMode('sketch');$('modeSolid').onclick=()=>setWorkspaceMode('solid');

function showMenu(key){if(busy||!ready)return;if(!$('menu').hidden&&$('menu').dataset.key===key){closePanels();return;}closePanels();$('menu').dataset.key=key;$('menu').replaceChildren();const h=document.createElement('h2');h.textContent=key[0].toUpperCase()+key.slice(1);$('menu').append(h);
 for(const [type,label]of tools[key]){const b=document.createElement('button');buttonLabel(b,type,label);b.dataset.tool=type;b.onclick=()=>startTool(type,key==='sketch'?{shape:type}:{});$('menu').append(b);}$('menu').hidden=false;$('nav-'+key).classList.add('active');
}
const field=(name,label,value=0,kind='number',options=null)=>({name,label,value,kind,options});
function formFields(type,p){
 const f=(name,label,value=0)=>{const dimensional=/\(mm\)/.test(label),factor=dimensional?unitFactorValue():1;return{...field(name,dimensional?label.replace('(mm)','('+preferences.units+')'):label,(p[name]??value)/factor),factor};};
 const select=(name,label,options,value)=>field(name,label,p[name]??value,'select',options);
 const pos=[f('x','X (mm)'),f('y','Y (mm)'),f('z','Z (mm)')];
 if(type==='sketch')return[select('plane','Sketch plane',['XY','XZ','YZ',...(planeFromSelection()?['Selected face']:[])],p.basis||planeFromSelection()?'Selected face':'XY'),f('offset','Plane offset (mm)'),...(['rectangle','ellipse'].includes(p.shape)?[f('width','Width (mm)',40),f('height','Height (mm)',30)]:['circle','polygon'].includes(p.shape)?[f('radius','Radius (mm)',15),...(p.shape==='polygon'?[f('sides','Sides',6)]:[])]:[field('points','Points: x,y; x,y',p.points?.map(q=>q.join(',')).join(';')||(p.shape==='spline'?'-20,0; 0,20; 20,0':'-20,0; 20,0'),'text'),...(p.shape==='arc'?[f('sagitta','Arc height (mm)',10)]:[]),field('closed','Closed profile',p.closed??!['arc','polyline'].includes(p.shape),'checkbox')]),f('x','Centre X (mm)'),f('y','Centre Y (mm)'),field('construction','Construction geometry',p.construction??false,'checkbox')];
 if(type==='sketchOffset')return[f('distance','Offset distance (mm)',2),field('keepInputs','Keep original sketch',p.keepInputs??true,'checkbox')];
 if(type==='sketchFillet')return[f('radius','Corner radius (mm)',2),field('keepInputs','Keep original sketch',p.keepInputs??false,'checkbox')];
 if(type==='sketchMirror')return[select('axis','Mirror about local axis',['X','Y'],'X'),field('keepInputs','Keep original sketch',p.keepInputs??true,'checkbox')];
 if(type==='box')return[f('width','Width (mm)',40),f('depth','Depth (mm)',30),f('height','Height (mm)',20),...pos];
 if(type==='cylinder')return[f('radius','Radius (mm)',15),f('height','Height (mm)',30),...pos];
 if(type==='sphere')return[f('radius','Radius (mm)',15),...pos];
 if(type==='torus')return[f('radius','Major radius (mm)',25),f('tube','Tube radius (mm)',5)];
 if(type==='hole')return[...(p.sketchId?[]:[f('diameter','Diameter (mm)',10),f('x','Centre X on face (mm)'),f('y','Centre Y on face (mm)')]),select('extent','Extent',['Through all','Blind'],'Through all'),f('depth','Depth (mm)',10),field('reverse','Reverse direction',p.reverse??false,'checkbox')];
 if(type==='extrude')return[f('distance','Distance (mm)',20)];
 if(type==='revolve')return[select('axis','Axis',['X','Y','Z'],'Z'),f('angle','Angle (°)',360)];
 if(type==='sweep')return[f('radius','Round profile radius (mm)',3)];
 if(type==='fillet'||type==='chamfer')return[f('radius',type==='fillet'?'Radius (mm)':'Distance (mm)',2),field('allEdges','All edges',p.allEdges??!selection.some(s=>s.kind==='edge'),'checkbox')];
 if(type==='shell')return[f('thickness','Wall thickness (mm)',2)];
 if(type==='draft')return[f('angle','Draft angle (°)',5),select('plane','Neutral plane',['XY','XZ','YZ'],'XY'),f('offset','Neutral offset (mm)',0)];
 if(type==='offsetFace')return[f('distance','Distance (mm)',5)];
 if(type==='move'||type==='duplicate')return pos.map(v=>({...v,value:p[v.name]??(type==='duplicate'&&v.name==='x'?30:0)}));
 if(type==='rotate')return[select('axis','Axis through origin',['X','Y','Z'],'Z'),f('angle','Angle (°)',90)];
 if(type==='scale')return[f('factor','Uniform scale factor',1.2)];
 if(type==='mirror')return[select('plane','Mirror plane',['XY','XZ','YZ'],'YZ')];
 if(type==='align')return[select('axis','Align body centres on axis',['X','Y','Z'],'X')];
 if(type==='pattern')return[f('count','Count',3),f('x','X spacing (mm)',30),f('y','Y spacing (mm)',0),f('z','Z spacing (mm)',0)];
 if(type==='circularPattern')return[f('count','Count',6),f('angle','Angle (°)',360),select('axis','Axis',['X','Y','Z'],'Z')];
 if(type==='split'||type==='plane')return[select('plane','Plane',['XY','XZ','YZ'],'XY'),f('offset','Offset (mm)',type==='split'?10:20)];
 if(type==='axis')return[select('axis','Direction',['X','Y','Z'],'Z'),...pos];
 return[];
}
function planeFromSelection(){const s=selection.at(-1),item=selectedItem(),face=item?.faceInfo?.find(f=>f.index===s?.index);if(!face||face.type!=='PLANE')return null;const n=face.normal,x=Math.abs(n[0])<.9?[1,0,0]:[0,1,0],dot=x.reduce((s,v,i)=>s+v*n[i],0),xx=x.map((v,i)=>v-dot*n[i]),len=Math.hypot(...xx);return{origin:face.center,x:xx.map(v=>v/len),normal:n};}
function requireSelection(type,ins){
 if(['sketch','box','cylinder','sphere','torus','plane','axis','import'].includes(type))return;
 if(type==='hole'){const ref=selection.at(-1),item=selectedItem(),recipe=doc.features.find(f=>f.id===item?.featureId)?.params;if(!(ref?.kind==='face'&&item?.kind==='body'&&item?.faceInfo.find(f=>f.index===ref.index)?.type==='PLANE')&&!(item?.kind==='sketch'&&recipe?.shape==='circle'))throw Error('Select a planar face or a circle sketch first');return;}
 if(['sketchOffset','sketchFillet','sketchMirror'].includes(type)&&selectedItem()?.kind!=='sketch')throw Error('Select a sketch first');
 if(!ins.length)throw Error('Select '+(['extrude','revolve','sweep','loft'].includes(type)?'a sketch':'a solid body')+' first');
 if(['union','subtract','intersect','loft','align'].includes(type)&&ins.length<2)throw Error('Select at least two '+(type==='loft'?'sketches':'bodies')+'. Turn on Multi-select or use Shift.');
 if(['shell','offsetFace','draft'].includes(type)&&!selection.some(s=>s.kind==='face'))throw Error('Select a face first. Change Selection to Faces if needed.');
}

function mountConstraints(p){
 const display=v=>Number(v.toFixed(6));
 const form=$('toolForm'),section=document.createElement('section');section.className='constraintEditor';section.setAttribute('aria-label','Sketch constraints');
 let points=(p.points||[[-20,0],[20,0]]).map(q=>[...q]),rules=JSON.parse(JSON.stringify(p.constraints||[]));
 const raw=$('p-points').closest('label');raw.hidden=true;
 const closed=()=>Boolean($('p-closed')?.checked);
 function collect(){points=[...section.querySelectorAll('[data-point]')].map(row=>[Number(row.querySelector('[data-x]').value),Number(row.querySelector('[data-y]').value)]);const next=[];
  section.querySelectorAll('[data-point]').forEach((row,i)=>{if(row.querySelector('[data-lock]').checked)next.push({type:'fixed',a:i,x:points[i][0],y:points[i][1]});});
  section.querySelectorAll('[data-segment]').forEach(row=>{const a=Number(row.dataset.segment),b=(a+1)%points.length,dir=row.querySelector('select').value,len=row.querySelector('[data-length]').value;if(dir)next.push({type:dir,a,b});if(len!=='')next.push({type:'length',a,b,value:Number(len)});});for(const row of section.querySelectorAll('[data-relation]')){const type=row.value;if(type){const a=Number(row.dataset.relation);next.push({type,a,b:(a+1)%points.length,c:0,d:1});}}next.push(...rules.filter(c=>['angle','midpoint'].includes(c.type)));rules=next;return{points,constraints:rules};
 }
 function updateStatus(result){const el=section.querySelector('[data-solve-status]');el.className=result.state==='fully'?'fullyDefined':'underDefined';el.textContent=result.state==='fully'?'Fully constrained':result.dof+' degrees of freedom';}
 function render(){
  const edges=points.length-(closed()?0:1);
  section.innerHTML='<h3>Sketch dimensions & constraints</h3><p class="toolHint">Shared points stay joined. Lock a point, then set segment direction and length.</p><div class="pointHeading"><span>Point</span><span>X (mm)</span><span>Y (mm)</span><span>Lock</span></div>'+points.map((q,i)=>'<div class="pointRow" data-point="'+i+'"><span>P'+(i+1)+'</span><input aria-label="Point '+(i+1)+' X" data-x type="number" step="any" min="-2000" max="2000" value="'+display(q[0])+'" required><input aria-label="Point '+(i+1)+' Y" data-y type="number" step="any" min="-2000" max="2000" value="'+display(q[1])+'" required><input aria-label="Lock point '+(i+1)+'" data-lock type="checkbox" '+(rules.some(c=>c.type==='fixed'&&c.a===i)?'checked':'')+'></div>').join('')+'<div class="pointActions"><button type="button" data-add-point>Add point</button><button type="button" data-remove-point '+(points.length<=2?'disabled':'')+'>Remove last</button></div><div class="segmentHeading"><span>Segment</span><span>Direction</span><span>Length (mm)</span></div>'+Array.from({length:edges},(_,i)=>{const b=(i+1)%points.length,dir=rules.find(c=>c.a===i&&c.b===b&&['horizontal','vertical'].includes(c.type))?.type||'',len=rules.find(c=>c.type==='length'&&c.a===i&&c.b===b)?.value??'';return '<div class="segmentRow" data-segment="'+i+'"><span>P'+(i+1)+'–P'+(b+1)+'</span><select aria-label="Segment '+(i+1)+' direction"><option value="">Free</option><option value="horizontal" '+(dir==='horizontal'?'selected':'')+'>Horizontal</option><option value="vertical" '+(dir==='vertical'?'selected':'')+'>Vertical</option></select><input data-length aria-label="Segment '+(i+1)+' length" type="number" min=".001" max="4000" step="any" placeholder="Free" value="'+len+'"></div>';}).join('')+'<p data-solve-status role="status" aria-live="polite"></p><div class="pointActions"><button type="button" data-solve>Solve constraints</button><button type="button" data-clear>Clear constraints</button></div>';
  for(let i=1;i<edges;i++){const wrap=document.createElement('label');wrap.className='segmentRelation';wrap.textContent='Segment '+(i+1)+' relative to segment 1';const select=document.createElement('select');select.dataset.relation=i;select.setAttribute('aria-label','Segment '+(i+1)+' relation');for(const [value,label]of [['','Independent'],['parallel','Parallel'],['perpendicular','Perpendicular'],['equal','Equal length']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;opt.selected=rules.some(c=>c.type===value&&c.a===i&&c.c===0&&c.d===1);select.append(opt);}wrap.append(select);section.querySelector('[data-solve-status]').before(wrap);}
  try{updateStatus(solveSketch(points,rules));}catch(e){section.querySelector('[data-solve-status]').className='constraintError';section.querySelector('[data-solve-status]').textContent=e.message;}
  section.querySelector('[data-add-point]').onclick=()=>{collect();if(points.length>=40){status('Limit is 40 constrained points');return;}const q=points.at(-1);points.push([q[0]+10,q[1]+10]);render();};
  section.querySelector('[data-remove-point]').onclick=()=>{collect();points.pop();rules=rules.filter(c=>c.a<points.length&&(c.b===undefined||c.b<points.length));render();};
  section.querySelector('[data-clear]').onclick=()=>{collect();rules=[];render();};
  section.querySelector('[data-solve]').onclick=()=>{try{collect();const result=solveSketch(points,rules);points=result.points;render();updateStatus(result);}catch(e){section.querySelector('[data-solve-status]').className='constraintError';section.querySelector('[data-solve-status]').textContent=e.message;}};
  section.oninput=()=>{const el=section.querySelector('[data-solve-status]');el.className='underDefined';el.textContent='Dimensions changed · solve or apply to update';};
 }
 form.querySelector('.actions').before(section);if($('p-closed'))$('p-closed').onchange=()=>{collect();render();};render();
 return()=>{collect();const solved=solveSketch(points,rules);return{points:solved.points,constraints:rules};};
}

function startTool(type,initial={},editId=null){
 if(!ready||busy)return;
 if(type==='extrude'&&!editId&&['sketch','face'].includes(selection.at(-1)?.kind)){if(!direct.target()){status('Direct extrusion requires a closed sketch or planar face');return;}closePanels();showFaceDistance(20,'extrude');return;}
 if(!editId&&(['fillet','chamfer'].includes(type)&&selection.at(-1)?.kind==='edge'||type==='draft'&&selection.at(-1)?.kind==='face'&&Math.abs(selectedItem()?.faceInfo.find(f=>f.index===selection.at(-1).index)?.normal?.[2]||0)<.9)){closePanels();showFaceDistance(type==='draft'?5:1,type);return;}
 setWorkspaceMode(type==='sketch'||type.startsWith('sketch')?'sketch':'solid');if(type==='import'){$('stepFile').click();return;}
 try{if(!editId)requireSelection(type,selectedIds());}catch(e){status(e.message);return;}
 closePanels();activeTool=type;editing=editId;const old=editId?doc.features.find(f=>f.id===editId):null,p={...old?.params,...initial};if(type==='hole'&&old){p.target=old.inputs[0];if(old.inputs[1])p.sketchId=old.inputs[1];}
 if(type==='hole'&&!editId){const ref=selection.at(-1),item=selectedItem(),recipe=doc.features.find(f=>f.id===item?.featureId)?.params;if(item?.kind==='sketch'){p.sketchId=item.id;p.target=recipe?.hostBody||items.find(i=>i.kind==='body')?.id;}else{p.target=item?.id;p.face=ref?.index;const b=planeFromSelection();if(b&&ref?.point){const delta=ref.point.map((v,i)=>v-b.origin[i]),y=new THREE.Vector3(...b.normal).cross(new THREE.Vector3(...b.x));p.x=Number(delta.reduce((s,v,i)=>s+v*b.x[i],0).toFixed(3));p.y=Number(delta.reduce((s,v,i)=>s+v*y.getComponent(i),0).toFixed(3));}}}
 const fields=formFields(type,p),panel=$('toolPanel');
 panel.innerHTML='<header><h2>'+esc(type==='sketch'?(p.shape[0].toUpperCase()+p.shape.slice(1))+' sketch':labelFor(type))+'</h2><button id="cancelTool" aria-label="Close">'+ico('close')+'</button></header><p class="toolHint">'+esc(type==='hole'?'Select a target body. A circular sketch supplies the diameter and centre; on a face, adjust diameter and centre offsets.':type==='sketch'?'Enter dimensions or draw on the selected plane.':type==='subtract'?'The first selected body is the main body. Remaining bodies are cutters.':type==='fillet'||type==='chamfer'?'Select edges, or apply to all edges.':type==='revolve'?'The profile must not cross the rotation axis.':type==='loft'?'Use two closed sketches on separated planes.':type==='shell'||type==='offsetFace'?'Uses the selected face.':'Values use millimetres; transforms are relative to the origin.')+'</p><form id="toolForm"><div class="fields">'+fields.map(f=>'<label class="'+(f.kind==='checkbox'?'check':f.name==='points'?'wide':'')+'" for="p-'+f.name+'">'+(f.kind==='checkbox'?'<input id="p-'+f.name+'" name="'+f.name+'" type="checkbox" '+(f.value?'checked':'')+'>':'')+esc(f.label)+(f.kind==='checkbox'?'':f.kind==='select'?'<select id="p-'+f.name+'" name="'+f.name+'">'+f.options.map(o=>'<option '+(o===f.value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>':'<input id="p-'+f.name+'" name="'+f.name+'" type="'+f.kind+'" step="any" value="'+esc(f.value)+'" required>')+'</label>').join('')+'</div><div class="actions">'+(type==='sketch'&&!editId?'<button type="button" id="drawSketch">Draw on plane</button>':'')+'<button type="submit" data-apply class="primary">'+(editId?'Update feature':type==='sketch'?'Create sketch':'Apply')+'</button></div></form>';
 panel.hidden=false;$('cancelTool').onclick=closePanels;
 if(type==='hole'){const label=document.createElement('label');label.className='holeTarget';label.textContent='Target body';const select=document.createElement('select');select.id='holeTarget';select.setAttribute('aria-label','Target body');const targets=items.filter(i=>i.kind==='body');if(old&&p.target&&!targets.some(i=>i.id===p.target))targets.unshift({id:p.target,name:doc.features.find(f=>f.id===p.target)?.name||'Original target'});for(const i of targets){const option=document.createElement('option');option.value=i.id;option.textContent=i.name;option.selected=i.id===p.target;select.append(option);}label.append(select);$('toolForm').prepend(label);const update=()=>{const blind=$('p-extent').value==='Blind';$('p-depth').disabled=!blind;$('p-depth').closest('label').hidden=!blind;};$('p-extent').onchange=update;update();}
 const readConstraints=type==='sketch'&&p.shape==='polyline'?mountConstraints(p):null;
 function read(){const result={...p};for(const f of fields){const el=$('p-'+f.name);result[f.name]=f.kind==='checkbox'?el.checked:f.kind==='number'?Number(el.value)*(f.factor||1):el.value;}if(type==='sketch'){if(result.plane==='Selected face'){result.basis=p.basis||planeFromSelection();if(!result.basis)throw Error('Select a planar face');}else delete result.basis;if(typeof result.points==='string')result.points=result.points.split(';').filter(v=>v.trim()).map(v=>v.split(',').map(Number));}if(type==='sketch'&&result.plane==='Selected face'){const ref=selection.at(-1);if(ref?.kind==='face'){result.hostBody=ref.id;result.hostFace=ref.index;}}
 if(type==='hole'){result.target=$('holeTarget').value;if(!result.target)throw Error('Create a target solid body first');}
 if(readConstraints)Object.assign(result,readConstraints());if(type==='fillet'||type==='chamfer')result.edges=selection.filter(s=>s.kind==='edge'&&s.id===selectedIds()[0]).map(s=>s.index);if(type==='shell'||type==='offsetFace'||type==='draft')result.face=p.face??selection.find(s=>s.kind==='face')?.index;return result;}
 $('toolForm').onsubmit=async e=>{e.preventDefault();try{const id=await apply(type,read(),type==='hole'?[$('holeTarget').value,...(p.sketchId?[p.sketchId]:[])]:old?.inputs||selectedIds(),editId);closePanels();fit();select([{id,kind:items.find(i=>i.id===id)?.kind||'body'}]);}catch(err){error(err);}};
 if($('drawSketch'))$('drawSketch').onclick=()=>{try{beginDrawing(read());}catch(e){error(e);}};
}
function showSidebar(type){
 closePanels();const side=$('sidebar');if(!side.hidden&&side.dataset.type===type){side.hidden=true;return;}side.dataset.type=type;side.hidden=false;renderSidebar();
}
$('itemsToggle').onclick=()=>showSidebar('items');$('historyToggle').onclick=()=>showSidebar('history');$('settingsToggle').onclick=()=>showSidebar('settings');
function renderSidebar(){
 const side=$('sidebar');if(side.hidden)return;side.replaceChildren();const h=document.createElement('header');h.innerHTML='<h2>'+esc(side.dataset.type[0].toUpperCase()+side.dataset.type.slice(1))+'</h2><button aria-label="Close">'+ico('close')+'</button>';h.querySelector('button').onclick=()=>side.hidden=true;side.append(h);
 if(side.dataset.type==='items'){for(const [kind,label,icon]of [['sketch','Sketches','sketch'],['body','Solid bodies','box'],['construction','Construction','construct']]){const members=items.filter(i=>!i.regionHost&&(kind==='construction'?['plane','axis'].includes(i.kind):i.kind===kind));if(!members.length)continue;const group=document.createElement('details');group.open=true;group.className='objectGroup';const heading=document.createElement('summary');heading.innerHTML=ico(icon)+'<span>'+label+'</span><small>'+members.length+'</small>';group.append(heading);for(const item of members){const row=document.createElement('div');row.className='itemRow';const check=document.createElement('input');check.type='checkbox';check.checked=!(doc.ui?.hidden||[]).includes(item.id);check.setAttribute('aria-label','Show '+item.name);check.onchange=()=>{doc.ui.hidden=(doc.ui.hidden||[]).filter(id=>id!==item.id);if(!check.checked)doc.ui.hidden.push(item.id);render();saveLocal();};const b=document.createElement('button');b.textContent=item.name;b.classList.toggle('selected',selectedIds().includes(item.id));b.onclick=e=>select([{id:item.id,kind:item.kind}],e.shiftKey||$('multi').getAttribute('aria-pressed')==='true');b.ondblclick=()=>{const input=document.createElement('input');input.className='renameObject';input.value=item.name;input.setAttribute('aria-label','Rename object');b.replaceWith(input);input.focus();input.select();let done=false;const commit=async()=>{if(done)return;done=true;const name=input.value.trim().slice(0,80);if(!name){renderSidebar();return;}const next=snapshot(),f=next.features.find(f=>f.id===item.featureId);f.name=name;try{await rebuild(next);}catch(e){error(e);}};input.onblur=commit;input.onkeydown=e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){done=true;renderSidebar();}};};const rename=document.createElement('button');rename.dataset.control='rename';rename.innerHTML=ico('sketch');rename.setAttribute('aria-label','Rename '+item.name);rename.onclick=()=>b.ondblclick();row.append(check,b,rename);group.append(row);}side.append(group);}} else if(side.dataset.type==='history')for(const f of doc.features){const row=document.createElement('div');row.className='featureHistoryRow';const b=document.createElement('button');b.className='historyRow';b.textContent=f.name+(f.suppressed?' · suppressed':'');b.title='Edit feature parameters';b.onclick=()=>startTool(f.type,{},f.id);b.disabled=f.suppressed||['import','delete'].includes(f.type);row.append(b);const dependent=doc.features.some(other=>other.id!==f.id&&!other.suppressed&&other.inputs.some(id=>id===f.id||id.startsWith(f.id+':')));if(!dependent){const suppress=document.createElement('button');suppress.dataset.control='history';suppress.innerHTML=ico('history');suppress.setAttribute('aria-label',(f.suppressed?'Unsuppress ':'Suppress ')+f.name);suppress.title=f.suppressed?'Unsuppress feature':'Suppress leaf feature';suppress.onclick=async()=>{const next=snapshot();next.features.find(v=>v.id===f.id).suppressed=!f.suppressed;try{await rebuild(next);}catch(e){error(e);}};row.append(suppress);const remove=document.createElement('button');remove.dataset.control='history';remove.innerHTML=ico('delete');remove.setAttribute('aria-label','Remove feature '+f.name);remove.title='Remove leaf feature; Undo restores it';remove.onclick=async()=>{const next=snapshot();next.features=next.features.filter(v=>v.id!==f.id);try{await rebuild(next);}catch(e){error(e);}};row.append(remove);}side.append(row);} else if(side.dataset.type==='settings'){
  side.innerHTML+='<div class="settings"><label>Grid snap (mm)<input id="snapSize" type="number" min=".01" max="100" step=".1" value="'+gridStep+'"></label><label>Selection<select id="settingsSelection"><option>auto</option><option>body</option><option>face</option><option>edge</option><option>sketch</option></select></label><label class="check"><input type="checkbox" id="showGrid" '+(grid.visible?'checked':'')+'> Grid</label><label class="check"><input type="checkbox" id="showEdges" '+(showEdges?'checked':'')+'> Visible edges</label><label class="check"><input type="checkbox" id="sectionEnabled" '+(sectionEnabled?'checked':'')+'> Section view (XY)</label><label>Section height (mm)<input type="number" id="sectionHeight" value="'+sectionHeight+'"></label><button id="resetView">Reset view</button><p class="quiet">Reqoo CAD 0.1 · solid modelling<br>Projects are stored locally in this browser. Download backups from File.</p></div>';
  const pref=document.createElement('div');pref.className='preferenceGrid';pref.innerHTML='<label>Units<select id="cadUnits"><option value="mm">Millimetres</option><option value="in">Inches</option></select></label><label>Precision<select id="cadPrecision"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label><label>Theme<select id="cadTheme"><option value="light">Light</option><option value="dark">Dark</option></select></label><label class="check"><input type="checkbox" id="cadSnap"> Snapping</label>';side.querySelector('.settings').prepend(pref);
  $('cadUnits').value=preferences.units;$('cadUnits').onchange=()=>{preferences.units=$('cadUnits').value;updatePreferences();};$('cadPrecision').value=String(preferences.precision);$('cadPrecision').onchange=()=>{preferences.precision=Number($('cadPrecision').value);updatePreferences();};$('cadTheme').value=preferences.theme;$('cadTheme').onchange=()=>{preferences.theme=$('cadTheme').value;updatePreferences();};$('cadSnap').checked=preferences.snap;$('cadSnap').onchange=()=>{preferences.snap=$('cadSnap').checked;updatePreferences();};
  side.querySelector('header button').onclick=()=>side.hidden=true;$('snapSize').onchange=()=>{gridStep=Math.max(.01,Math.min(100,Number($('snapSize').value)||1));$('units').textContent='mm · grid '+gridStep+' mm';};
  $('settingsSelection').value=$('pickMode').value;$('settingsSelection').onchange=()=>$('pickMode').value=$('settingsSelection').value;
  $('showGrid').onchange=()=>grid.visible=$('showGrid').checked;$('showEdges').onchange=()=>{showEdges=$('showEdges').checked;render();};$('sectionEnabled').onchange=()=>{sectionEnabled=$('sectionEnabled').checked;updateClip();};$('sectionHeight').onchange=()=>{sectionHeight=Number($('sectionHeight').value)||0;updateClip();};$('resetView').onclick=()=>{view('iso');fit();};
 }
}
function search(){closePanels();$('searchDialog').showModal();$('commandQuery').value='';renderCommands();$('commandQuery').focus();}
function renderCommands(){const q=$('commandQuery').value.toLowerCase();$('commandResults').replaceChildren();for(const [type,label]of (workspaceMode==='sketch'?tools.sketch:[...tools.add,...tools.construct,...tools.transform,...tools.tools]).filter(v=>v[1].toLowerCase().includes(q))){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{$('searchDialog').close();startTool(type,tools.sketch.some(v=>v[0]===type)?{shape:type}:{});};$('commandResults').append(b);}}
$('commandQuery').oninput=renderCommands;document.querySelector('#searchDialog [data-close]').onclick=()=>$('searchDialog').close();
function normalizeTool(type,p){return sketchPrimitives.has(type)?['sketch',{...p,shape:type}]:[type,p];}
const actualStart=startTool;startTool=function(type,initial={},editId=null){const [t,p]=normalizeTool(type,initial);return actualStart(t,p,editId);};
$('startSketch').onclick=()=>{setWorkspaceMode('sketch');showMenu('sketch');};

let renderer;try{renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches});}catch(e){$('stage').innerHTML='<div class="graphicsError"><h1>3D graphics unavailable</h1><p>Open this page in Safari or Chrome with WebGL enabled.</p></div>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.localClippingEnabled=true;$('canvas').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f7f9');const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,10000);camera.up.set(0,0,1);camera.position.set(130,-160,130);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,10);controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomSpeed=1.1;controls.rotateSpeed=.65;controls.panSpeed=.85;
scene.add(new THREE.HemisphereLight(0xffffff,0xb9c4d0,2.8));const lamp=new THREE.DirectionalLight(0xffffff,2.4);lamp.position.set(60,-90,150);scene.add(lamp);const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-100,40,70);scene.add(fill);
const grid=new THREE.GridHelper(1000,100,0xcbd1d9,0xe6e9ee);grid.rotation.x=Math.PI/2;grid.position.z=-.03;scene.add(grid);
const root=new THREE.Group(),preview=new THREE.Group();const directOverlay=new THREE.Group();scene.add(root,preview,directOverlay);
let showEdges=true,sectionEnabled=false,sectionHeight=10;
function updateClip(){root.traverse(o=>{if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.clippingPlanes=sectionEnabled?[new THREE.Plane(new THREE.Vector3(0,0,-1),sectionHeight)]:[];m.needsUpdate=true;}}});}
function clear(g){for(const o of [...g.children]){g.remove(o);o.traverse(n=>{n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m?.dispose();});}}
function render(previewOnly=false){
 clear(root);const ids=selectedIds(),hidden=doc.ui?.hidden||[];
 for(const item of (displayItems||items)){if(item.regionHost||hidden.includes(item.id)||isolate&&!ids.includes(item.id))continue;
  const node=new THREE.Group();node.userData.itemId=item.id;root.add(node);
  if(item.mesh.triangles.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(item.mesh.vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(item.mesh.normals,3));g.setIndex(item.mesh.triangles);
   const selected=selection.filter(s=>s.id===item.id),faceIds=selected.filter(s=>s.kind==='face').map(s=>s.index),whole=selected.some(s=>s.kind==='body'||s.kind==='sketch');
   const color=item.kind==='body'?(doc.ui?.colors?.[item.id]||'#d6dbe2'):item.kind==='plane'?'#99b9df':'#8fb8fa';
   const material=new THREE.MeshStandardMaterial({color:whole?'#b9d4fb':color,roughness:.55,metalness:.08,transparent:item.kind!=='body',depthWrite:item.kind==='body',opacity:item.kind==='plane'?.16:item.kind==='sketch'?.22:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:item.kind==='sketch'?-3:1,polygonOffsetUnits:item.kind==='sketch'?-3:1});
   const highlight=new THREE.MeshStandardMaterial({color:'#73a8ef',roughness:.5,side:THREE.DoubleSide});for(const f of item.mesh.faceGroups)g.addGroup(f.start,f.count,faceIds.includes(f.faceIndex)?1:0);
   const mesh=new THREE.Mesh(g,[material,highlight]);mesh.renderOrder=item.kind==='sketch'?3:0;mesh.userData={id:item.id,kind:item.kind,faceGroups:item.mesh.faceGroups};node.add(mesh);
  }
  if(showEdges||item.kind!=='body')for(const edge of item.edges){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(edge.lines,3));const selected=selection.some(s=>s.id===item.id&&(s.kind==='edge'?s.index===edge.index:s.kind==='sketch'||s.kind==='body'));const line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:selected?'#2475e8':item.kind==='sketch'?'#4883c8':item.kind==='axis'?'#c89143':'#576372',transparent:true,opacity:item.kind==='plane'?.4:.9}));line.renderOrder=item.kind==='sketch'?4:1;line.userData={id:item.id,kind:'edge',index:edge.index,itemKind:item.kind};node.add(line);}
 }
 $('empty').hidden=items.length>0;if(previewOnly!==true){renderSidebar();renderContext();updateSketchDimensions();}updateClip();updateFaceHandle();
}

function referenceParams(type,params,ref=selection.at(-1)){
 const result={...params},item=items.find(i=>i.id===ref?.id);
 if(ref?.kind==='face'&&['offsetFace','shell','hole','extrude','draft'].includes(type)){result.face??=ref.index;result.faceRef??=item?.faceInfo.find(f=>f.index===result.face)?.reference;}
 if((type==='fillet'||type==='chamfer')&&!result.allEdges){result.edges??=selection.filter(s=>s.id===ref?.id&&s.kind==='edge').map(s=>s.index);result.edgeRefs??=result.edges.map(i=>item?.edges.find(e=>e.index===i)?.reference);}
 if(type==='extrude'&&ref?.kind==='face')result.operation??='Add';
 return result;
}
let immediateSession=null;
function resetDirectPreview(force=false){previewVersion++;const changed=displayItems||immediateSession;immediateSession=null;displayItems=null;clear(directOverlay);if(changed||force)render(true);}
function showImmediate(type,params,ref){
 const item=items.find(i=>i.id===ref.id),value=type==='diameter'?params.diameter:params.distance;
 const transform=item&&immediateTransform(doc,item,ref,type,value);
 if(!transform){
  if(type!=='offsetFace'||value<=0||!item||sectionEnabled){if(immediateSession){immediateSession=null;clear(directOverlay);displayItems=null;render(true);}return false;}
  if(immediateSession?.mode!=='prism'){
   const data=facePrismData(item,ref.index);if(!data)return false;
   clear(directOverlay);if(displayItems){displayItems=null;render(true);}
   const geometry=new THREE.BufferGeometry(),positions=data.base.slice();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
   const material=new THREE.MeshStandardMaterial({color:doc.ui?.colors?.[ref.id]||'#d6dbe2',roughness:.55,metalness:.08,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);directOverlay.add(mesh);
   const edgesGeometry=new THREE.BufferGeometry();edgesGeometry.setAttribute('position',new THREE.BufferAttribute(data.lines.slice(),3).setUsage(THREE.DynamicDrawUsage));
   const edgeLines=new THREE.LineSegments(edgesGeometry,new THREE.LineBasicMaterial({color:'#576372'}));directOverlay.add(edgeLines);
   immediateSession={ref:{...ref},mode:'prism',data,mesh,edgeLines};
  }
  const {data,mesh,edgeLines}=immediateSession;
  updatePrismPositions(mesh.geometry.attributes.position.array,data.base,data.weights,data.normal,value);
  mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  updatePrismPositions(edgeLines.geometry.attributes.position.array,data.lines,data.lineWeights,data.normal,value);
  edgeLines.geometry.attributes.position.needsUpdate=true;edgeLines.geometry.computeBoundingSphere();immediateSession.value=value;return true;
 }
 if(!immediateSession){displayItems=null;render(true);immediateSession={ref:{...ref}};}
 const node=root.children.find(n=>n.userData.itemId===ref.id);if(!node)return false;
 node.scale.set(...transform.scale);node.position.set(...transform.position);node.updateMatrixWorld(true);
 immediateSession.value=value;return true;
}

// Restrict diameter edits to an unambiguous source cylinder/profile. Imported
// or boolean-derived cylindrical surfaces need an independent surface tool.
function diameterTarget(ref){
 const item=items.find(i=>i.id===ref?.id),feature=doc.features.find(f=>f.id===item?.featureId);
 if(!item||!feature||ref.kind!=='face'||!['CYLINDRE','CYLINDER'].includes(item.faceInfo.find(f=>f.index===ref.index)?.type))return null;
 const source=simpleSource(doc,item);
 if(source&&(source.type==='cylinder'||source.params.shape==='circle'))return{featureId:source.id,diameter:2*(source.params.radius??15)};
 return null;
}
function diameterDocument(params,ref){
 const target=diameterTarget(ref);if(!target)throw Error('Diameter source is not editable for this face');
 if(!Number.isFinite(params.diameter)||params.diameter<=.001||params.diameter>2000)throw Error('Diameter must be between 0.001 and 2000 mm');
 const next=snapshot();next.features.find(f=>f.id===target.featureId).params.radius=params.diameter/2;return next;
}

const direct=createDirectModeling({THREE,camera,renderer,stage:$('stage'),getSelection:()=>selection,getDiameterTarget:diameterTarget,getItem:selectedItem,getDoc:()=>doc,isBusy:()=>busy,isSketching:()=>!!sketchMode,
 onNavigation:enabled=>controls.enabled=enabled&&!sketchMode,
 getUnits:()=>({factor:unitFactorValue(),label:preferences.units}),onStatus:status,onResetPreview:resetDirectPreview,onImmediate:showImmediate,
 onPreview:async(type,params,ref,isCurrent)=>{const version=++previewVersion,next=type==='diameter'?diameterDocument(params,ref):snapshot();if(type!=='diameter')next.features.push({id:'direct_preview',type,name:'Direct preview',params:referenceParams(type,params,ref),inputs:[ref.id]});const result=await rpc('preview',{doc:next});if(isCurrent()){displayItems=result;if(!immediateSession)render(true);else if(!direct.state.dragging&&(type==='diameter'?params.diameter:params.distance)===direct.state.value){immediateSession=null;clear(directOverlay);render(true);}}},
 onCommit:async(type,params,ref)=>{immediateSession=null;displayItems=null;clear(directOverlay);if(type==='diameter'){await rebuild(diameterDocument(params,ref),{selectId:ref.id});return;}const id=await apply(type,referenceParams(type,params,ref),[ref.id]);select([{id,kind:'body'}]);}
});
const faceHandle=direct.handle,faceDistance=direct.dimensions;
const faceDirection=()=>direct.direction(),gizmoTarget=()=>direct.target(),showFaceDistance=(value=0,operation)=>direct.begin(value,operation),updateFaceHandle=()=>direct.update();
const cadDiagnostic=new URLSearchParams(location.search).has('diagnostics')?document.createElement('output'):null;
if(cadDiagnostic){cadDiagnostic.id='cadDiagnostic';cadDiagnostic.dataset.control='diagnostic';$('stage').append(cadDiagnostic);}
document.documentElement.dataset.cadBuild=typeof __CAD_BUILD__==='string'?__CAD_BUILD__:'dev';

// In-canvas editable sketch dimensions (persisted as parametric history edits).
const sketchDimensions=document.createElement('div');sketchDimensions.id='sketchDimensions';sketchDimensions.hidden=true;$('stage').append(sketchDimensions);
let dimensionFeature=null;
function updateSketchDimensions(){
 const item=selectedItem(),ref=selection.at(-1);
 const feature=item?.kind==='sketch'&&ref?.kind==='sketch'?doc.features.find(f=>f.id===item.featureId):null;
 if(!feature||feature.type!=='sketch'||busy||sketchMode){sketchDimensions.hidden=true;dimensionFeature=null;return;}
 const p=feature.params||{},shape=p.shape;
 const fields=shape==='circle'?[['diameter','Ø',2*(p.radius??15)]]:
 ['rectangle','ellipse'].includes(shape)?[['width','W',p.width??40],['height','H',p.height??30]]:
 shape==='polygon'?[['radius','R',p.radius??15]]:[];
 if(shape==='polyline'&&Array.isArray(p.points)&&p.points.length>=2){
  const closed=Boolean(p.closed),count=p.points.length-(closed?0:1);
  for(let i=0;i<count;i++){const a=p.points[i],b=p.points[(i+1)%p.points.length],dx=b[0]-a[0],dy=b[1]-a[1];
   fields.push(['segmentLength:'+i,'L'+(i+1),Math.hypot(dx,dy)],['segmentAngle:'+i,'∠'+(i+1),Math.atan2(dy,dx)*180/Math.PI]);
  }
 }
 if(!fields.length){sketchDimensions.hidden=true;dimensionFeature=null;return;}
 fields.push(['x','X',p.x??0],['y','Y',p.y??0]);
 const rect=$('stage').getBoundingClientRect(),bounds=item.bounds,center=new THREE.Vector3(...bounds[0].map((v,i)=>(v+bounds[1][i])/2)).project(camera);
 if(center.z < -1||center.z > 1){sketchDimensions.hidden=true;return;}
 const id=feature.id;
 if(dimensionFeature!==id){dimensionFeature=id;sketchDimensions.replaceChildren();
 for(const [key,label,value] of fields){const wrap=document.createElement('label');wrap.textContent=label+' ';const input=document.createElement('input');input.type='number';input.step='any';input.value=String(Number((value/(key.startsWith('segmentAngle:')?1:unitFactorValue())).toFixed(preferences.precision)));input.dataset.original=input.value;input.dataset.dimension=key;input.setAttribute('aria-label',key.startsWith('segmentAngle:')?label+' angle in degrees':label+' dimension in '+preferences.units);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sketchDimensions.querySelector('button')?.click();}});wrap.append(input);sketchDimensions.append(wrap);}
 const applyButton=document.createElement('button');applyButton.textContent='✓';applyButton.title='Apply dimensions';applyButton.setAttribute('aria-label','Apply sketch dimensions');applyButton.onclick=async()=>{
 const updated={...feature.params};
 for(const input of sketchDimensions.querySelectorAll('input')){
  const key=input.dataset.dimension,n=Number(input.value)*(key.startsWith('segmentAngle:')?1:unitFactorValue());if(input.value===input.dataset.original)continue;
  if(input.value.trim()===''||!Number.isFinite(n)||(!['x','y'].includes(key)&&!key.startsWith('segmentAngle:')&&n<=0)){status('Enter a valid dimension (size must be greater than zero)');input.focus();return;}
  if(key==='diameter')updated.radius=n/2;
  else if(key.startsWith('segment'))continue;
  else updated[key]=n;
 }
 if(shape==='polyline'){
  updated.points=p.points.map(pt=>[...pt]);updated.constraints=JSON.parse(JSON.stringify(p.constraints||[]));
  for(let i=0;i<p.points.length-(p.closed?0:1);i++)for(const [prefix,type,factor]of [['segmentLength:','length',unitFactorValue()],['segmentAngle:','angle',1]]){const input=sketchDimensions.querySelector('[data-dimension="'+prefix+i+'"]');if(!input||input.value===input.dataset.original)continue;const value=Number(input.value)*factor;if(!Number.isFinite(value)||(type==='length'&&value<=0)){status('Enter a valid sketch dimension');return;}const b=(i+1)%p.points.length;updated.constraints=updated.constraints.filter(c=>!(c.type===type&&c.a===i&&c.b===b));updated.constraints.push({type,a:i,b,value});}
 }
 try{const id=feature.id;await apply('sketch',updated,feature.inputs||[],id);dimensionFeature=null;render();}catch(e){error(e);}
 };sketchDimensions.append(applyButton);
 }
 sketchDimensions.hidden=false;sketchDimensions.style.left=Math.max(8,Math.min(rect.width-365,(center.x+1)*rect.width/2+35))+'px';sketchDimensions.style.top=Math.max(8,Math.min(rect.height-60,(1-center.y)*rect.height/2-24))+'px';
}

function renderContext(){const c=$('context');c.replaceChildren();const item=selectedItem();c.hidden=!item;if(!item)return;
 const picked=selection.at(-1),onFace=picked?.kind==='face'&&item.kind==='body',onEdge=picked?.kind==='edge'&&item.kind==='body',planarFace=onFace&&item.faceInfo.find(f=>f.index===picked.index)?.type==='PLANE';
 const commands=item.kind==='sketch'?[...(doc.features.find(f=>f.id===item.featureId)?.params.shape==='circle'?[['hole','Hole']]:[]),['extrude','Extrude'],['revolve','Revolve'],['sweep','Sweep']]:item.kind==='plane'?[['rectangle','Sketch on plane']]:item.kind==='axis'?[]:onEdge?[['fillet','Fillet'],['chamfer','Chamfer']]:planarFace?[['offsetFace','Pull / Offset Face'],['extrude','Extrude'],['hole','Hole'],...(Math.abs(item.faceInfo.find(f=>f.index===picked.index)?.normal?.[2]||0)<.9?[['draft','Draft / Taper']]:[])]:[['move','Move'],['rotate','Rotate'],['fillet','Fillet']];
 if(planarFace){const sketchFace=document.createElement('button');buttonLabel(sketchFace,'sketch','Sketch on face');sketchFace.onclick=()=>startTool('sketch',{shape:'circle'});c.append(sketchFace);}
 if(item.kind==='sketch'){const make=document.createElement('button');buttonLabel(make,'box','Solid tools');make.onclick=()=>setWorkspaceMode('solid');c.append(make);}
 if(item.kind==='sketch'){const edit=document.createElement('button');buttonLabel(edit,'sketch','Edit sketch');edit.onclick=()=>{setWorkspaceMode('sketch');startTool(doc.features.find(f=>f.id===item.featureId)?.type||'sketch',{},item.featureId);};c.append(edit);}
 for(const [type,label]of commands){const b=document.createElement('button');buttonLabel(b,type,label);b.onclick=()=>type==='offsetFace'?showFaceDistance(0):startTool(type);c.append(b);}if(pickCandidates.length>1){const other=document.createElement('button');other.setAttribute('aria-label','Select other');other.innerHTML=ico('selectOther')+'<span>Select other</span>';other.onclick=showSelectionChoices;c.append(other);}const del=document.createElement('button');del.textContent='Delete';del.onclick=()=>apply('delete',{},selectedIds()).then(()=>select([])).catch(error);c.append(del);
}

function showSelectionChoices(){
 const dialog=document.createElement('dialog');dialog.className='selectionChoices';const heading=document.createElement('h2');heading.textContent='Select overlapping geometry';dialog.append(heading);
 for(const ref of pickCandidates){const item=items.find(i=>i.id===ref.id);if(!item)continue;const label=(ref.kind==='sketch'?'Sketch profile':ref.kind==='face'?'Solid face '+(ref.index+1):ref.kind==='edge'?'Edge':'Body')+' · '+item.name,b=document.createElement('button');b.innerHTML=ico(ref.kind==='sketch'?'sketch':'face')+'<span>'+esc(label)+'</span>';b.onclick=()=>{dialog.close();select([ref]);};dialog.append(b);}
 const cancel=document.createElement('button');cancel.innerHTML=ico('close')+'<span>Cancel</span>';cancel.onclick=()=>dialog.close();dialog.append(cancel);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}

function select(next,extend=false){if(extend){for(const n of next){const index=selection.findIndex(s=>s.id===n.id&&s.kind===n.kind&&s.index===n.index);if(index>=0)selection.splice(index,1);else selection.push(n);}}else selection=next;const picked=selection.at(-1),pickedItem=selectedItem();if(pickedItem){const desired=pickedItem.kind==='body'?'solid':workspaceMode;if(desired!==workspaceMode)setWorkspaceMode(desired);}render();const i=selectedItem();if(i)status(i.name+(i.kind==='body'?' · '+i.volume.toFixed(2)+' mm³':' · '+i.kind));}
$('multi').onclick=()=>{const value=$('multi').getAttribute('aria-pressed')!=='true';$('multi').setAttribute('aria-pressed',String(value));};$('isolate').onclick=()=>{isolate=!isolate;$('isolate').classList.toggle('active',isolate);render();};
$('measure').onclick=async()=>{try{const selected=selectedIds();if(selection.length===2){const d=await rpc('measure',{ids:selected,refs:selection});status('Minimum distance: '+d.toFixed(3)+' mm');}else{const i=selectedItem();if(!i)throw Error('Select one or two bodies to measure');const ref=selection[0];if(ref?.kind==='edge'){status('Edge length: '+i.edges.find(e=>e.index===ref.index).length.toFixed(3)+' mm');return;}if(ref?.kind==='face'){status('Face area: '+i.faceInfo.find(f=>f.index===ref.index).area.toFixed(3)+' mm²');return;}const b=i.bounds,size=b[0].map((v,n)=>b[1][n]-v);status(size.map(n=>n.toFixed(3)).join(' × ')+' mm · area '+i.area.toFixed(2)+' mm² · volume '+i.volume.toFixed(2)+' mm³');}}catch(e){error(e);}};
const ray=new THREE.Raycaster();let pointerStart=null,touchCount=0,pickCandidates=[],penActive=false,lastPenAt=-Infinity;
function cast(e){const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);ray.params.Line.threshold=(camera.top-camera.bottom)/camera.zoom/r.height*(e.pointerType==='touch'?14:e.pointerType==='pen'?8:6);}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}
 if(e.pointerType==='pen'){penActive=true;lastPenAt=performance.now();touchCount=0;e.preventDefault();e.stopImmediatePropagation();controls.enabled=false;}
 if(e.pointerType==='touch')touchCount++;
 const fingerNavigation=e.pointerType==='touch'&&sketchMode&&performance.now()-lastPenAt<5000;
 if(fingerNavigation)controls.enabled=true;
 if(touchCount>1){pointerStart=null;draft=null;clear(preview);controls.enabled=true;return;}
 pointerStart={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};
 if(sketchMode&&!fingerNavigation&&touchCount<=1){cast(e);drawingDown(e);}
},true);
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}if(e.pointerType==='pen'){e.preventDefault();e.stopImmediatePropagation();lastPenAt=performance.now();}if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)pointerStart.moved=true;if(sketchMode&&draft){cast(e);drawingMove(e);}},true);
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}if(e.pointerType==='pen'){e.preventDefault();e.stopImmediatePropagation();penActive=false;lastPenAt=performance.now();}const tap=pointerStart&&!pointerStart.moved&&touchCount<=1;if(sketchMode){if(draft)finishDrag(e);}else if(tap){cast(e);const mode=$('pickMode').value,hits=ray.intersectObjects(root.children,true),front=hits.find(h=>h.object.isMesh&&h.object.userData.kind==='body'),tolerance=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*3;
 const isSketch=h=>h.object.userData.kind==='sketch'||h.object.userData.itemKind==='sketch',visible=h=>!front||h.distance<=front.distance+tolerance;
 let eligible=mode==='edge'?hits.filter(h=>h.object.isLineSegments&&h.object.userData.itemKind==='body'&&visible(h)):mode==='body'?hits.filter(h=>h.object.isMesh&&h.object.userData.kind==='body'):mode==='face'?hits.filter(h=>h.object.isMesh&&h.object.userData.kind==='body'):mode==='sketch'?hits.filter(h=>isSketch(h)&&visible(h)):hits.filter(h=>(isSketch(h)||h.object.isMesh||h.object.isLineSegments&&h.object.userData.itemKind==='body'&&(h.distanceToRay||0)<=(200/camera.zoom/renderer.domElement.clientHeight*(e.pointerType==='touch'?9:5)))&&visible(h));
 // Automatic selection follows the active workspace: solid faces first in Solid,
 // sketch profiles first in Sketch. Explicit selection filters remain authoritative.
 if(mode==='auto')eligible.sort((a,b)=>{
  const priority=h=>workspaceMode==='solid'?(h.object.isLineSegments&&h.object.userData.itemKind==='body'?4:h.object.isMesh&&h.object.userData.kind==='body'?3:isSketch(h)?(h.object.isMesh?2:1):0):(isSketch(h)&&h.object.isMesh?3:isSketch(h)?2:1);
  return priority(b)-priority(a)||a.distance-b.distance;
 });
 else if(mode==='sketch')eligible.sort((a,b)=>Number(isSketch(b)&&b.object.isMesh)-Number(isSketch(a)&&a.object.isMesh)||a.distance-b.distance);
 pickCandidates=[];const keys=new Set();for(const hit of eligible){const d=hit.object.userData,kind=isSketch(hit)?'sketch':mode==='body'?'body':d.kind==='edge'?'edge':'face',ref={id:d.id,kind};if(kind==='edge')ref.index=d.index;if(kind==='face'){const matched=d.faceGroups?.find(g=>hit.faceIndex*3>=g.start&&hit.faceIndex*3<g.start+g.count);if(!matched||!Number.isInteger(matched.faceIndex)||matched.faceIndex<0)continue;ref.index=matched.faceIndex;ref.point=hit.point.toArray();}const key=[ref.id,ref.kind,ref.index].join(':');if(!keys.has(key)){keys.add(key);pickCandidates.push(ref);}}
 // Sketch profiles are selected before the host face in automatic mode; face remains in Select other.
 select(pickCandidates.length?[pickCandidates[0]]:[],e.shiftKey||$('multi').getAttribute('aria-pressed')==='true');}
 if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);if(e.pointerType==='pen')controls.enabled=!sketchMode;pointerStart=null;
},true);
renderer.domElement.addEventListener('pointercancel',()=>{touchCount=0;penActive=false;controls.enabled=!sketchMode;pointerStart=null;draft=null;clear(preview);});
function fit(){const b=new THREE.Box3().setFromObject(root);if(b.isEmpty()){controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();return;}const size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),aspect=renderer.domElement.clientWidth/Math.max(1,renderer.domElement.clientHeight),direction=camera.position.clone().sub(controls.target).normalize();if(!direction.length())direction.set(1,-1,1).normalize();controls.target.copy(c);camera.position.copy(c).addScaledVector(direction,Math.max(250,size.length()*2));camera.far=Math.max(10000,size.length()*10);controls.update();camera.updateMatrixWorld(true);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}camera.zoom=Math.max(.02,Math.min(40,200*aspect*.72/Math.max(maxX-minX,1),200*.70/Math.max(maxY-minY,1)));camera.updateProjectionMatrix();controls.update();}
function view(name){const c=controls.target.clone(),d=300,dir=name==='top'?[0,0,1]:name==='front'?[0,-1,0]:name==='right'?[1,0,0]:[1,-1,1];camera.up.set(0,0,1);if(name==='top')camera.up.set(0,1,0);camera.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(d));controls.update();}
$('fit').onclick=fit;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
function resize(){const r=$('canvas').getBoundingClientRect(),aspect=r.width/Math.max(1,r.height);camera.left=-100*aspect;camera.right=100*aspect;camera.top=100;camera.bottom=-100;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);}
new ResizeObserver(resize).observe($('canvas'));resize();function frame(){
 requestAnimationFrame(frame);
 controls.update();
 if(cadDiagnostic){const text='Build '+document.documentElement.dataset.cadBuild+' · '+(selection.at(-1)?.kind||'none')+' · gizmo '+(gizmoTarget()?'ON':'OFF')+' · preview '+Boolean(displayItems);if(cadDiagnostic.textContent!==text)cadDiagnostic.textContent=text;}
 try{updateFaceHandle();}catch(e){console.error('Face gizmo render failed',e);faceHandle.hidden=true;}
 try{updateSketchDimensions();}catch(e){console.error('Sketch dimensions render failed',e);sketchDimensions.hidden=true;}
 renderer.render(scene,camera);
}frame();
function worldOnSketch(){const b=basis(sketchMode.params),normal=new THREE.Vector3(...b.normal),plane=new THREE.Plane(normal,-normal.dot(new THREE.Vector3(...b.origin))),hit=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,hit))return null;const x=new THREE.Vector3(...b.x).normalize(),y=normal.clone().cross(x).normalize(),delta=hit.sub(new THREE.Vector3(...b.origin));const raw=[delta.dot(x),delta.dot(y)];if(!preferences.snap)return raw;let closest=null,best=(200/camera.zoom/renderer.domElement.clientHeight*8)**2;const consider=w=>{const rel=new THREE.Vector3(...w).sub(new THREE.Vector3(...b.origin));if(Math.abs(rel.dot(normal))>.02)return;const q=[rel.dot(x),rel.dot(y)],d=(q[0]-raw[0])**2+(q[1]-raw[1])**2;if(d<best){best=d;closest=q;}};consider(b.origin);let count=0;for(const item of items){for(const f of item.faceInfo||[])consider(f.center);for(const e of item.edges||[]){if(count++>1200)break;if(e.lines.length>=6){consider(e.lines.slice(0,3));consider(e.lines.slice(-3));}}}return closest||raw.map(v=>Math.round(v/gridStep)*gridStep);}
function beginDrawing(p){setWorkspaceMode('sketch');if(p.shape==='polyline')p={...p,constraints:[]};closePanels();sketchMode={params:p,points:[]};controls.enabled=false;$('sketchBar').hidden=false;$('sketchHint').textContent=p.shape+' · '+(p.plane||'selected face')+' · '+(['polyline','spline'].includes(p.shape)?'Click points, then Finish sketch':'Drag to draw');const b=basis(p),n=new THREE.Vector3(...b.normal),origin=new THREE.Vector3(...b.origin);controls.target.copy(origin);camera.up.set(0,0,1);if(Math.abs(n.z)>.9)camera.up.set(0,1,0);camera.position.copy(origin).addScaledVector(n,300);controls.update();status('Sketch active · snap '+gridStep+' mm');}
function drawingDown(){const p=worldOnSketch();if(!p)return;if(['polyline','spline'].includes(sketchMode.params.shape)){sketchMode.points.push(p);draft={start:p,end:p,poly:true};drawDraft();}else draft={start:p,end:p};}
function drawingMove(){const p=worldOnSketch();if(!p)return;draft.end=p;drawDraft();}
function drawDraft(){clear(preview);const b=basis(sketchMode.params),x=new THREE.Vector3(...b.x),n=new THREE.Vector3(...b.normal),y=n.clone().cross(x),origin=new THREE.Vector3(...b.origin),world=q=>origin.clone().addScaledVector(x,q[0]).addScaledVector(y,q[1]);let pts=[];
 if(draft.poly)pts=[...sketchMode.points,draft.end];else{const a=draft.start,c=draft.end,shape=sketchMode.params.shape;if(shape==='rectangle')pts=[a,[c[0],a[1]],c,[a[0],c[1]],a];else if(shape==='arc')pts=[a,c];else{const rx=Math.abs(c[0]-a[0]),ry=shape==='ellipse'?Math.abs(c[1]-a[1]):Math.hypot(c[0]-a[0],c[1]-a[1]),count=shape==='polygon'?Math.max(3,Math.round(sketchMode.params.sides||6)):80;pts=Array.from({length:count+1},(_,i)=>[a[0]+rx*Math.cos(i/count*Math.PI*2),a[1]+ry*Math.sin(i/count*Math.PI*2)]);}}
 const g=new THREE.BufferGeometry().setFromPoints(pts.map(world));preview.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:'#2372dd'})));
}
async function finishDrag(){if(draft.poly)return;const a=draft.start,b=draft.end,p={...sketchMode.params};if(Math.hypot(b[0]-a[0],b[1]-a[1])<gridStep/2)return;
 if(p.shape==='rectangle'){p.width=Math.abs(b[0]-a[0]);p.height=Math.abs(b[1]-a[1]);p.x=(a[0]+b[0])/2;p.y=(a[1]+b[1])/2;}
 else if(p.shape==='arc'){p.points=[a,b];p.x=p.y=0;p.closed=false;}
 else{p.x=a[0];p.y=a[1];p.radius=Math.hypot(b[0]-a[0],b[1]-a[1]);p.width=Math.abs(b[0]-a[0])*2;p.height=Math.abs(b[1]-a[1])*2;}
 try{await apply('sketch',p,[]);endDrawing();}catch(e){error(e);}
}
function endDrawing(){sketchMode=null;draft=null;controls.enabled=true;$('sketchBar').hidden=true;clear(preview);}
$('cancelSketch').onclick=endDrawing;$('finishSketch').onclick=async()=>{if(!sketchMode)return;try{if(sketchMode.points.length>=2){await apply('sketch',{...sketchMode.params,points:sketchMode.points,x:0,y:0},[]);endDrawing();}else status('Draw a profile first');}catch(e){error(e);}};
function download(name,content){const u=URL.createObjectURL(content instanceof Blob?content:new Blob([content])),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
async function exportFile(format){if(displayItems)throw Error('Apply or cancel the geometry preview before exporting');if(format==='svg'||format==='dxf'){const item=selectedItem(),f=doc.features.find(f=>f.id===item?.featureId);if(item?.kind!=='sketch'||!f)throw Error('Select a supported sketch first');download((doc.title||'Sketch')+'.'+format,sketchExport(f.params,format));return;}const ids=selectedIds().filter(id=>items.find(i=>i.id===id)?.kind==='body');const chosen=ids.length?ids:items.filter(i=>i.kind==='body'&&!(doc.ui.hidden||[]).includes(i.id)).map(i=>i.id);if(!chosen.length)throw Error('Create a solid body first');setBusy(true);try{const blob=format==='3mf'?threeMF(items.filter(i=>chosen.includes(i.id))):await rpc('export',{format,ids:chosen});download((doc.title||'Reqoo-CAD')+'.'+(format==='step'?'step':'stl'),blob);status('Exported '+format.toUpperCase()+' · mm');}finally{setBusy(false);}}
function fileMenu(){
 closePanels();const m=$('menu');m.replaceChildren();m.dataset.key='file';m.hidden=false;
 for(const [label,fn]of [['New project',async()=>{if(doc.features.length&&!confirm('Start a new project? Download your current project first if you need a backup.'))return;await rebuild({format:'reqoo-cad',version:1,title:'Untitled',features:[],ui:{hidden:[],colors:{}}});closePanels();}],['Save project',()=>download((doc.title||'Reqoo-CAD')+'.rqcad',JSON.stringify(doc,null,2))],['Open project',()=>$('openFile').click()],['Import STEP',()=>$('stepFile').click()],['Export STEP',()=>exportFile('step')],['Export STL',()=>exportFile('stl')],['Export 3MF',()=>exportFile('3mf')],['Export sketch SVG',()=>exportFile('svg')],['Export sketch DXF',()=>exportFile('dxf')],['Restore backup',async()=>{const backup=localStorage.getItem('reqoo-cad-v1-backup');if(!backup)throw Error('No previous project backup is available');await rebuild(JSON.parse(backup));closePanels();fit();}],['Generators',()=>window.open('/3d-studio/','_blank','noopener')],['Items',()=>showSidebar('items')],['History',()=>showSidebar('history')],['Settings',()=>showSidebar('settings')],['About / licenses',()=>{status('Reqoo CAD 0.1 · OpenCascade solid kernel · local projects');window.open('./THIRD-PARTY-NOTICES.txt','_blank','noopener');}]]){
  const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(error);m.append(b);
 }
}
$('fileMenu').onclick=fileMenu;$('exportTop').onclick=()=>{fileMenu();$('menu').querySelectorAll('button').forEach(b=>b.hidden=!/^Export/.test(b.textContent));};
$('openFile').onchange=async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>24e6)throw Error('Project exceeds 24 MB');const parsed=JSON.parse(await f.text());validateProject(parsed);parsed.ui||={hidden:[],colors:{}};await rebuild(parsed);closePanels();fit();}catch(e){error(e);}finally{$('openFile').value='';}};
$('stepFile').onchange=async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>20e6)throw Error('STEP file exceeds 20 MB');await apply('import',{step:await f.text()},[]);closePanels();fit();}catch(e){error(e);}finally{$('stepFile').value='';}};
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}else if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();download((doc.title||'Reqoo-CAD')+'.rqcad',JSON.stringify(doc,null,2));}else if(e.key.toLowerCase()==='f')fit();else if(e.key==='Escape'){closePanels();endDrawing();selection=[];render();}else if(e.key==='Delete'&&selection.length)apply('delete',{},selectedIds()).then(()=>select([])).catch(error);});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#rail,#menu,#toolPanel,#top,dialog'))return;$('menu').hidden=true;});
// Let CSS track the dynamic viewport; never freeze a transient keyboard/browser height.
window.addEventListener('resize',resize);window.addEventListener('pageshow',resize);window.visualViewport?.addEventListener('resize',resize);
updatePreferences();setWorkspaceMode('solid');decorateButtons();new MutationObserver(decorateButtons).observe(document.body,{childList:true,subtree:true});
try{await rpc('ready');ready=true;const saved=localStorage.getItem('reqoo-cad-v1');if(saved){try{const parsed=JSON.parse(saved);validateProject(parsed);await rebuild(parsed,{history:false});fit();}catch{status('Saved project could not be restored. Open your downloaded backup.');}}status('Ready · create a sketch or add a solid');updateHistoryButtons();}catch(e){error(e);}
if(new URLSearchParams(location.search).has('test'))window.__cad={get gizmo(){return {...direct.state,selection:selection.at(-1),busy,sketchMode:!!sketchMode}},get previewItems(){return displayItems},get immediatePreview(){return immediateSession?{mode:immediateSession.mode||'affine',value:immediateSession.value}:null},direct,get doc(){return doc;},get items(){return items;},get selection(){return selection;},apply,rebuild,select,startTool,exportFile,fit,ready:()=>ready,view,camera,root,worker:rpc};
