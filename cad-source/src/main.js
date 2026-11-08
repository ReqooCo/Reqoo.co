import {promoteBodySelection,extendCanvasSelection,toolSelectionError} from './tool-workflow.js';
import {threePointArc,centerPointArc} from './curve-recipes.js';
import {createSketchToolSession} from './sketch-tool-session.js';
import {icon as ico} from './icons.js';
import {createCanvasToolGizmo} from './canvas-tool-gizmo.js';
import {appendStrokePoint} from './sketch-stroke.js';
import {geometryPoints,closedGeometry,nearestCircularSketch,arcPreviewPoints} from './sketch-edit-geometry.js';
import {parseProject,serializeProject} from './project-io.js';
import {createDisplayCache} from './display-cache.js';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {mountVisualization} from './visualization.js';
import {kernelDocument} from './visualization-state.js';
import {resolveDimensionDocument} from './smart-dimensions.js';
import {mountSmartDimensions} from './smart-dimension-ui.js';
import {mountChatBridge} from './chat-bridge.js';
import {dragRecipe,startChoices,defaultStart} from './sketch-drag.js';
import {createRotationGizmo} from './rotation-gizmo.js';
import {createSketchPlanePicker} from './sketch-planes.js';
import {resolveReference} from './topology.js';
import {faceFrame} from './transform-frames.js';
import {createSnapGuides} from './snap-guides.js';
import {connectedSketchIds} from './sketch-connectivity.js';
import {sketchGuidepoints,nearestGuidepoint} from './guidepoints.js';
import {createSnapOptions,mountSnapSettings} from './snap-options.js';
import * as THREE from 'three';
import {CADNavigation} from './cad-navigation.js';
import {mountThreadForm,mountModelSettings} from './thread-ui.js';
import {METRIC_THREADS,autoThread,threadDimensions} from './thread-specs.js';
import {basis,validateProject} from './engine.js';
import './style.css';
import './workspace-chrome.css';
import './r3ds.css';
import './reds-focused-workspace.css';
import {createWorkspaceChrome} from './workspace-chrome.js';
import {createDirectModeling} from './direct-modeling.js';
import {threeMF,sketchExport} from './exports.js';
import {solveSketch} from './constraints.js';
import {layoutDimensions} from './dimension-layout.js';
import {createPartAlignment} from './align-parts.js';
import {createWorldReference,createTranslationGizmo} from './world-gizmos.js';
import {createOrientationCube,cubeDirection} from './orientation-cube.js';
import {simpleSource,diameterSource,immediateTransform} from './immediate-preview.js';
import {facePrismData,updatePrismPositions} from './face-prism.js';

const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buttonLabel(button,key,label){button.innerHTML=ico(key)+'<span>'+esc(label)+'</span>';button.setAttribute('aria-label',label);button.title=label;}
const actionIcons={'File':'file','Export':'export','New sketch':'sketch','Draw on plane':'sketch','Create sketch':'check','Apply':'check','Update feature':'check','Cancel':'close','Finish sketch':'check','Continue editing':'undo','New project':'file','Save project':'save','Open project':'file','Import STEP':'import','Export STEP':'export','Export STL':'export','Items':'items','History':'history','Settings':'settings','About / licenses':'file','Multi-select':'multi','Isolate':'isolate','Measure':'measure','Make solid':'box','Circle on face':'circle','Rectangle on face':'rectangle','Edit sketch':'sketch','Delete':'delete','Select other':'selectOther','Solve constraints':'lock','Clear constraints':'undo','Add point':'add','Remove last':'delete'};
function decorateButtons(){for(const b of document.querySelectorAll('button')){if(b.dataset.control||b.hasAttribute('aria-label')||b.closest('#faceDistance,#sketchDimensions,#operationGizmo')||b.querySelector('svg')||b.closest('#viewCube'))continue;const label=b.textContent.trim();if(!label)continue;const key=actionIcons[label]||[...Object.values(tools).flat()].find(t=>t[1]===label)?.[0]||(b.classList.contains('historyRow')?'history':b.closest('.itemRow')?'box':'settings');buttonLabel(b,key,label);}}

document.getElementById('app').innerHTML='<header id="top"><div class="brand" aria-label="R3ds — REQOO 3D Studios">R<em>3</em>ds<span>CAD</span></div><button id="fileMenu">File</button><button id="undo" aria-label="Undo">'+ico('undo')+'</button><button id="redo" aria-label="Redo">'+ico('redo')+'</button><input id="projectName" aria-label="Project name" value="Untitled"><span id="saveState">Saved locally</span><button id="itemsToggle" aria-label="Items">'+ico('items')+'</button><button id="historyToggle" aria-label="History">'+ico('history')+'</button><button id="settingsToggle" aria-label="Settings">'+ico('settings')+'</button><button id="exportTop" class="primary">Export</button></header><main id="stage"><div id="canvas"></div><div id="empty"><h1>Start with a sketch</h1><p>Choose a plane. Draw a profile. Build a solid.</p><button id="startSketch">New sketch</button></div><div id="workspaceModes" role="group" aria-label="Workspace mode"><button id="modeSketch" aria-pressed="false">'+ico('sketch')+'<span>Sketch</span></button><button id="modeSolid" aria-pressed="true">'+ico('box')+'<span>Solid</span></button></div><nav id="rail" aria-label="Modeling tools"></nav><section id="menu" hidden aria-label="Tool menu"></section><section id="toolPanel" hidden aria-label="Tool settings"></section><section id="sidebar" hidden></section><div id="viewCube" aria-label="View orientation"><button data-view="top" aria-label="Top view" title="Top view">Top</button><div><button data-view="front" aria-label="Front view" title="Front view">Front</button><button data-view="right" aria-label="Right view" title="Right view">Right</button></div><button data-view="iso" aria-label="Isometric view" title="Isometric view">'+ico('box')+'<span>ISO</span></button></div><div id="selectionBar"><label>Selection<select id="pickMode"><option value="auto">Automatic</option><option value="body">Bodies</option><option value="face">Faces</option><option value="edge">Edges</option><option value="sketch">Sketches</option></select></label><button id="multi" aria-pressed="false">Multi-select</button><button id="isolate">Isolate</button><button id="measure">Measure</button><button id="fit" aria-label="Zoom to fit">'+ico('fit')+'</button></div><div id="sketchBar" hidden><strong id="sketchHint">Sketch</strong><button id="cancelSketch" hidden>Cancel</button><button id="finishSketch" class="primary" aria-label="Exit sketch">Exit sketch</button></div><div id="context" hidden></div></main><footer><span id="status" role="status">Preparing CAD engine…</span><span id="units">mm · grid 1 mm</span></footer><input id="openFile" type="file" accept=".json,.rqcad,application/json,application/octet-stream" hidden><input id="stepFile" type="file" accept=".step,.stp" hidden><dialog id="searchDialog"><header><strong>Search commands</strong><button data-close aria-label="Close">'+ico('close')+'</button></header><input id="commandQuery" placeholder="Search tools…" aria-label="Search commands"><div id="commandResults"></div></dialog><dialog id="errorDialog"><h2>CAD operation not completed</h2><p id="errorText"></p><button id="closeError">Continue editing</button></dialog>';

let sketchToolSession=null;
const sketchOperationTypes=new Set(['sketchMirror','sketchPattern','sketchProject','sketchTransform','sketchFillet','sketchChamfer']);
const sketchPrimitives=new Set(['rectangle','circle','ellipse','polygon','polyline','arc','spline']);
const tools={
 sketch:[['rectangle','Rectangle'],['circle','Circle'],['ellipse','Ellipse'],['polygon','Polygon'],['polyline','Line / polyline'],['arc','Arc'],['spline','Spline'],['sketchOffset','Offset sketch'],['sketchFillet','Fillet sketch'],['sketchMirror','Mirror sketch'],['sketchChamfer','Chamfer sketch'],['sketchPattern','Pattern sketch'],['sketchProject','Project to sketch'],['text','Sketch text'],['sketchTransform','Move / Rotate sketch']],
 add:[['box','Box'],['cylinder','Cylinder'],['sphere','Sphere'],['torus','Torus'],['import','Import STEP']],
 construct:[['plane','Offset plane'],['axis','Axis']],
 transform:[['move','Move / Translate'],['rotate','Rotate'],['scale','Scale'],['mirror','Mirror'],['duplicate','Copy'],['pattern','Linear pattern'],['circularPattern','Circular pattern'],['align','Align'],['concentric','Concentric align']],
 tools:[['thread','Thread'],['hole','Hole'],['extrude','Extrude'],['revolve','Revolve'],['loft','Loft'],['sweep','Sweep'],['offsetFace','Offset Face'],['draft','Draft / Taper'],['fillet','Fillet'],['chamfer','Chamfer'],['shell','Shell'],['union','Union'],['subtract','Subtract'],['intersect','Intersect'],['split','Split Body']]
};
for(const [key,label]of [['search','Search'],['sketch','Draw'],['add','Shapes'],['construct','Construct'],['transform','Transform'],['tools','Solid tools']]){
 const b=document.createElement('button');b.id='nav-'+key;b.type='button';b.innerHTML=ico(key)+'<span>'+label+'</span>';b.onclick=()=>key==='search'?search():showMenu(key);$('rail').append(b);
}
const preferences=Object.assign({units:'mm',precision:3,theme:'dark',snap:true,snapGrid:true,snapGeometry:true,snapGuides:true,snapHints:true,gizmoFrame:'world',angleSnap:5,gridVisible:true,displayMode:'shadedEdges',patternCount:3,patternSpacing:30,threadLength:10,threadHand:'Right'},(()=>{try{return JSON.parse(localStorage.getItem('reqoo-cad-preferences')||'{}');}catch{return{};}})());
const themeToggle=document.createElement('button');themeToggle.id='themeToggle';themeToggle.type='button';themeToggle.dataset.control='theme';themeToggle.setAttribute('aria-label','Toggle dark mode');$('settingsToggle').before(themeToggle);
themeToggle.onclick=()=>{preferences.theme=preferences.theme==='dark'?'light':'dark';updatePreferences();};
const unitFactorValue=()=>preferences.units==='in'?25.4:1;
function updatePreferences(){syncSnapControl();themeToggle.innerHTML=ico(preferences.theme==='dark'?'sun':'moon');themeToggle.setAttribute('aria-pressed',String(preferences.theme==='dark'));themeToggle.title=preferences.theme==='dark'?'Switch to light mode':'Switch to dark mode';localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));document.documentElement.dataset.theme=preferences.theme;scene.background.set(preferences.theme==='dark'?'#191a1c':'#f6f7f9');for(const [i,m]of (Array.isArray(grid.material)?grid.material:[grid.material]).entries())m.color.set(preferences.theme==='dark'?(i?'#24262b':'#34363c'):(i?'#e6e9ee':'#cbd1d9'));$('units').textContent=preferences.units;dimensionFeature=null;render();}
const snapToggle=document.createElement('button');snapToggle.id='snapToggle';snapToggle.type='button';snapToggle.dataset.control='snap';snapToggle.setAttribute('aria-label','Snapping');snapToggle.innerHTML=ico('magnet');$('fit').before(snapToggle);
function syncSnapControl(){snapToggle.setAttribute('aria-pressed',String(!!preferences.snap));snapToggle.title=preferences.snap?'Snapping on · '+(preferences.snapStep||1)+' mm':'Snapping off';}
snapToggle.onclick=()=>{preferences.snap=!preferences.snap;localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));syncSnapControl();if($('cadSnap'))$('cadSnap').checked=preferences.snap;snapGuides.hide();snapOptions.sync();status('Snapping '+(preferences.snap?'on':'off'));};
function setItemVisibility(id,visible){rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();direct.cancel();doc.ui.hidden=(doc.ui.hidden||[]).filter(v=>v!==id);if(!visible){doc.ui.hidden.push(id);selection=selection.filter(s=>s.id!==id);}pickCandidates=[];render();saveLocal();}
let workspaceMode='solid',booleanSession=null;
let doc={format:'reqoo-cad',version:1,title:'Untitled',features:[],ui:{hidden:[],colors:{}}},items=[],selection=[],undo=[],redo=[],busy=false,ready=false,isolate=false,editing=null,activeTool=null,sketchMode=null,draft=null,counter=0,unitFactor=1,gridStep=Number.isFinite(preferences.snapStep)?Math.max(.01,Math.min(100,preferences.snapStep)):1;
let holdingModel=false,displayItems=null,previewVersion=0,moveGizmo=null,rotationGizmo=null,alignGizmo=null,workspaceChrome=null,planePicker=null,chosenSketchPlane=null,smartDimensions=null,visualizer=null,captureMode=false,parameterGizmo=null;
let worker=null,serial=0,requests=new Map();const uid=()=>('f'+Date.now().toString(36)+(++counter).toString(36));
function armRequest(id,p){
 clearTimeout(p.timer);const remaining=p.deadline-Date.now();
 p.timer=setTimeout(()=>{worker?.terminate();worker=null;for(const pending of requests.values()){clearTimeout(pending.timer);pending.reject(Error('CAD processing timed out'+(pending.progress?' at '+pending.progress:'')+'. The previous model is unchanged.'));}requests.clear();},Math.max(1,Math.min(p.idleTimeout,remaining)));
}
function spawn(){worker=new Worker(new URL('./kernel.worker.js',import.meta.url),{type:'module'});worker.onmessage=e=>{const p=requests.get(e.data.id);if(!p)return;if(e.data.progress){const info=e.data.progress;p.progress=info.name||'Preparing display';armRequest(e.data.id,p);if(busy)status(info.phase==='feature'?'Building '+info.index+'/'+info.total+' · '+info.name:'Preparing display '+(info.index||0)+'/'+info.total);return;}clearTimeout(p.timer);requests.delete(e.data.id);e.data.ok?p.resolve(e.data.result):p.reject(Error(e.data.error));};worker.onerror=e=>{for(const p of requests.values()){clearTimeout(p.timer);p.reject(Error('The CAD engine stopped. Your last completed model is preserved.'));}requests.clear();worker.terminate();worker=null;status('CAD engine needs a reload. Save your project before refreshing.');};}
function rpc(type,payload={}){if(!worker)spawn();return new Promise((resolve,reject)=>{const id=++serial,p={resolve,reject,idleTimeout:type==='build'?180000:90000,deadline:Date.now()+(type==='build'?600000:90000)};requests.set(id,p);armRequest(id,p);worker.postMessage({id,type,...payload,...(type==='curvePreview'?{}:{doc:kernelDocument(payload.doc||doc)})});});}

function status(text){$('status').textContent=text;}
function error(e){$('errorText').textContent=e.message||String(e);if(!$('errorDialog').open)$('errorDialog').showModal();status('Operation not completed. Previous model preserved.');}
$('closeError').onclick=()=>$('errorDialog').close();
function setBusy(value){busy=value;document.body.classList.toggle('busy',value);for(const id of ['top','rail','context','toolPanel','sidebar','workspaceModes','utilityRail','selectionBar','moveGizmo','rotationGizmo','partAlignment','faceDistance','projectRecovery','sketchBar','quickSketchTools','operationGizmo'])if($(id))$(id).inert=value;for(const b of document.querySelectorAll('button[data-apply]'))b.disabled=value;updateHistoryButtons();}
function snapshot(){return JSON.parse(JSON.stringify(doc));}
function remember(stack,value){stack.push(value);while(stack.length>20||stack.length>1&&stack.reduce((n,d)=>n+JSON.stringify(d).length,0)>24e6)stack.shift();}
let recoveryRaw=null;
function saveLocal(preservePrior=true){if(recoveryRaw!==null){$('saveState').textContent='Recovery required · download your work';return;}try{const next=JSON.stringify(doc),prior=localStorage.getItem('reqoo-cad-v1');try{localStorage.setItem('reqoo-cad-v1',next);}catch{try{localStorage.setItem('reqoo-cad-v1',next);}catch{$('saveState').textContent='Download a project backup';return;}}if(preservePrior&&prior&&prior!==next)try{localStorage.setItem('reqoo-cad-v1-backup',prior);}catch{}$('saveState').textContent='Saved locally';}catch{$('saveState').textContent='Download a project backup';}}
const recoveryBanner=document.createElement('section');recoveryBanner.id='projectRecovery';recoveryBanner.hidden=true;recoveryBanner.setAttribute('role','alert');recoveryBanner.innerHTML='<strong>Project recovery required</strong><p>Your saved project could not be opened. Its original data is protected. New edits are not autosaved until recovery is resolved.</p><div><button type="button" id="downloadRecovery">Download original data</button><button type="button" id="restoreRecovery">Restore backup</button><button type="button" id="newAfterRecovery">Start new project</button></div>';document.body.append(recoveryBanner);
function requireRecovery(raw){recoveryRaw=raw;try{localStorage.setItem('reqoo-cad-v1-recovery',raw);}catch{}recoveryBanner.hidden=false;saveLocal();status('Saved project could not be restored. Resolve project recovery before autosaving.');}
function finishRecovery(){recoveryRaw=null;recoveryBanner.hidden=true;saveLocal(false);}
async function restoreProjectBackup(){const raw=localStorage.getItem('reqoo-cad-v1-backup');if(!raw)throw Error('No previous project backup is available. Open a downloaded project from File.');const next=parseProject(raw);await rebuild(next);endDrawing();setWorkspaceMode('solid');await migrateSketchRegions();if(recoveryRaw!==null)finishRecovery();closePanels();fit();}
async function newProject(){if((doc.features.length||recoveryRaw!==null)&&!confirm('Start a new project? Download your current project or original recovery data first if you need a backup.'))return;await rebuild({format:'reqoo-cad',version:1,title:'Untitled',features:[],ui:{hidden:[],colors:{}}});if(recoveryRaw!==null)finishRecovery();endDrawing();setWorkspaceMode('solid');closePanels();}
$('downloadRecovery').onclick=()=>download('R3ds-original-recovery.json',recoveryRaw||'');$('restoreRecovery').onclick=()=>restoreProjectBackup().catch(error);$('newAfterRecovery').onclick=()=>newProject().catch(error);
function commitDimensionUI(next){if(busy)throw Error('Wait for the current CAD operation');validateProject(next);remember(undo,snapshot());redo=[];doc=structuredClone(next);render();saveLocal();updateHistoryButtons();}
async function rebuild(next,{history=true,selectId=null}={}){
 if(busy)throw Error('Wait for the current CAD operation');validateProject(next);holdingModel=true;setBusy(true);
 try{const result=await rpc('build',{doc:next});rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();direct.cancel();if(history){remember(undo,snapshot());redo=[];}doc=JSON.parse(JSON.stringify(next));items=result;pickCandidates=[];lastCanvasTap=null;if(selectId){const preferred=result.find(i=>i.id===selectId+':band')||result.find(i=>i.id===selectId);selection=preferred?[{id:preferred.id,kind:preferred.kind}]:[];}else selection=selection.filter(s=>items.some(i=>i.id===s.id));holdingModel=false;render();saveLocal();$('projectName').value=doc.title;status(items.filter(i=>i.kind==='body').length+' solid bodies · ready');return result;}
 catch(e){rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();direct.cancel();holdingModel=false;render(true);throw e;}finally{holdingModel=false;setBusy(false);}
}
function featureChange(type,params={},inputs=selectedIds(),editId=null,id=uid(),ref=selection.at(-1)){
 if(['sketch','box','cylinder','sphere','torus','plane','axis','import'].includes(type))inputs=[];
 if(type==='sketch'&&params.shape==='polyline'){const solved=solveSketch(params.points,params.constraints||[]);params={...params,points:solved.points};}
 params=referenceParams(type,params,ref);
 const next=snapshot(),f={id:editId||id,type,name:(type==='sketch'?(params.shape||'Sketch'):labelFor(type))+' '+(next.features.filter(f=>f.type===type).length+1),params,inputs};
 if(editId){const index=next.features.findIndex(f=>f.id===editId);if(index<0)throw Error('History step no longer exists');f.name=next.features[index].name;next.features[index]=f;}else next.features.push(f);
 return{next,id:f.id};
}
async function apply(type,params={},inputs=selectedIds(),editId=null,ref=selection.at(-1)){const change=featureChange(type,params,inputs,editId,uid(),ref);await rebuild(change.next,{selectId:change.id});return change.id;}

function selectedIds(){return [...new Set(selection.map(s=>s.id))];}
function selectedItem(){return items.find(i=>i.id===selection.at(-1)?.id);}
function updateHistoryButtons(){const drafting=!!sketchMode?.points.length;$('undo').disabled=!ready||busy||!(drafting||draft?.anchored||undo.length);$('redo').disabled=!ready||busy||!(sketchMode?.redoPoints?.length||!drafting&&redo.length);}
async function travel(from,to){if(!from.length||busy)return;const next=from.at(-1),prior=snapshot();await rebuild(next,{history:false});from.pop();remember(to,prior);if(sketchMode?.createdId&&items.some(i=>i.id===sketchMode.createdId)){selection=[{id:sketchMode.createdId,kind:'sketch'}];render();}updateHistoryButtons();}
function travelStroke(direction){
 if(!sketchMode||busy)return false;
 if(direction==='undo'&&draft?.anchored){draft=null;clear(preview);drawingMeasure.hidden=true;updateHistoryButtons();return true;}
 if(direction==='undo'&&sketchMode.points.length){sketchMode.redoPoints.push(sketchMode.points.pop());}
 else if(direction==='redo'&&sketchMode.redoPoints.length){sketchMode.points.push(sketchMode.redoPoints.pop());}
 else return direction==='redo'&&sketchMode.points.length>0;
 const last=sketchMode.points.at(-1);draft=last?{start:last,end:last,poly:true,arc:sketchMode.params.shape==='arc'}:null;if(draft)drawDraft();else{clear(preview);drawingMeasure.hidden=true;}updateHistoryButtons();status('Sketch path · '+sketchMode.points.length+' points');return true;
}
$('undo').onclick=()=>{if(!travelStroke('undo'))travel(undo,redo).catch(error);};$('redo').onclick=()=>{if(!travelStroke('redo'))travel(redo,undo).catch(error);};
$('projectName').onchange=()=>{doc.title=$('projectName').value.trim().slice(0,80)||'Untitled';saveLocal();};
function labelFor(type){return [...Object.values(tools).flat(),['sketch','Sketch'],['faceSketch','Offset Sketch'],['sketchProfile','Profile'],['imprint','Sketch regions'],['delete','Delete']].find(t=>t[0]===type)?.[1]||type;}
function closePanels(){endBooleanSelection(false);parameterGizmo?.cancel();direct?.cancel();planePicker?.cancel();rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();$('menu').hidden=$('toolPanel').hidden=true;activeTool=null;editing=null;document.querySelectorAll('#rail button').forEach(b=>b.classList.remove('active'));}

function setWorkspaceMode(mode){
 if(visualizer?.active)visualizer.exit();
 workspaceMode=mode;if(mode==='solid'&&typeof grid!=='undefined'){grid.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);grid.position.set(0,0,-.03);}$('stage').dataset.workspace=mode;$('modeSketch').setAttribute('aria-pressed',String(mode==='sketch'));$('modeSolid').setAttribute('aria-pressed',String(mode==='solid'));
 for(const key of ['sketch','add','construct','transform','tools'])$('nav-'+key).hidden=mode==='sketch'?key!=='sketch':key==='sketch';
 closePanels();$('pickMode').value='auto';$('multi').setAttribute('aria-pressed','false');render(true);renderContext();
}
$('modeSketch').onclick=()=>setWorkspaceMode('sketch');$('modeSolid').onclick=async()=>{if(sketchMode){if(hasSessionProfiles()||sketchMode.points.length>=2)await $('finishSketch').onclick();else await $('cancelSketch').onclick();}else{try{await ensureSketchRegions();setWorkspaceMode('solid');}catch(e){error(e);}}};

function endBooleanSelection(committed=false){if(!booleanSession)return;const prior=booleanSession;booleanSession=null;prior.bar.remove();$('pickMode').value=prior.filter;$('multi').setAttribute('aria-pressed',prior.multi);if(!committed)selection=prior.before;}
function updateBooleanSelection(){if(!booleanSession)return;const refs=selection.filter(r=>r.kind==='body'),n=refs.length,target=booleanSession.type==='subtract'&&n?'Target: '+(items.find(i=>i.id===refs[0].id)?.name||refs[0].id):'';booleanSession.count.textContent=n+' bodies'+(target?' · '+target:' selected');booleanSession.count.title=target;booleanSession.apply.disabled=busy||n<2||selection.some(r=>r.kind!=='body');}
function beginBooleanSelection(type){
 closePanels();if(sketchMode){status('Exit sketch before combining bodies');return;}const before=selection.map(r=>({...r})),filter=$('pickMode').value,multi=$('multi').getAttribute('aria-pressed');setWorkspaceMode('solid');
 const bar=document.createElement('section');bar.id='booleanBar';bar.dataset.control='boolean';bar.setAttribute('aria-label',labelFor(type)+' bodies');
 const title=document.createElement('strong');title.innerHTML=ico(type)+'<span>'+esc(labelFor(type))+'</span>';const count=document.createElement('output'),keep=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','Keep original bodies');keep.append(check,'Keep originals');
 const applyButton=document.createElement('button'),cancel=document.createElement('button');applyButton.type=cancel.type='button';applyButton.innerHTML=ico('check')+'<span>Done</span>';applyButton.setAttribute('aria-label','Apply '+labelFor(type));cancel.innerHTML=ico('close');cancel.setAttribute('aria-label','Cancel '+labelFor(type));bar.append(title,count,keep,applyButton,cancel);$('stage').append(bar);booleanSession={type,bar,count,apply:applyButton,before,filter,multi};$('pickMode').value='body';
 selection=[...new Set(before.map(r=>r.id))].filter(id=>items.some(i=>i.id===id&&i.kind==='body')).map(id=>({id,kind:'body'}));
 cancel.onclick=()=>{endBooleanSelection(false);render();};applyButton.onclick=async()=>{if(applyButton.disabled)return;try{await apply(type,{keepInputs:check.checked},selectedIds());endBooleanSelection(true);render();}catch(e){error(e);updateBooleanSelection();}};
 render();status('Tap the bodies to '+labelFor(type).toLowerCase()+' · Done when selected');
}
function showMenu(key){if(busy||!ready)return;if(!$('menu').hidden&&$('menu').dataset.key===key){closePanels();return;}closePanels();$('menu').dataset.key=key;$('menu').replaceChildren();const h=document.createElement('h2');h.textContent=key[0].toUpperCase()+key.slice(1);$('menu').append(h);
 for(const [type,label]of tools[key]){const b=document.createElement('button');buttonLabel(b,type,label);b.dataset.tool=type;b.onclick=()=>startTool(type,key==='sketch'?{shape:type}:{});$('menu').append(b);}$('menu').hidden=false;$('nav-'+key).classList.add('active');
}
const field=(name,label,value=0,kind='number',options=null)=>({name,label,value,kind,options});
function formFields(type,p){
 const f=(name,label,value=0)=>{const dimensional=/\(mm\)/.test(label),factor=dimensional?unitFactorValue():1;return{...field(name,dimensional?label.replace('(mm)','('+preferences.units+')'):label,(p[name]??value)/factor),factor};};
 const select=(name,label,options,value)=>field(name,label,p[name]??value,'select',options);
 const pos=[f('x','X (mm)'),f('y','Y (mm)'),f('z','Z (mm)')];
 if(type==='sketch')return[select('plane','Sketch plane',['XY','XZ','YZ',...(planeFromSelection()?['Selected face']:[])],p.basis||planeFromSelection()?'Selected face':'XY'),f('offset','Plane offset (mm)'),...(['rectangle','ellipse'].includes(p.shape)?[f('width','Width (mm)',40),f('height','Height (mm)',30)]:['circle','polygon'].includes(p.shape)?[f('radius','Radius (mm)',15),...(p.shape==='polygon'?[f('sides','Sides',6)]:[])]:[field('points','Points: x,y; x,y',p.points?.map(q=>q.join(',')).join(';')||(p.shape==='spline'?'-20,0; 0,20; 20,0':'-20,0; 20,0'),'text'),...(p.shape==='arc'?[f('sagitta','Arc height (mm)',10)]:p.shape==='spline'?[select('splineMode','Spline type',['Fit','Control'],p.splineMode||'Fit')]:[]),field('closed','Closed profile',p.closed??!['arc','polyline'].includes(p.shape),'checkbox')]),f('x','Centre X (mm)'),f('y','Centre Y (mm)'),field('construction','Construction geometry',p.construction??false,'checkbox')];
 if(type==='faceSketch')return[f('distance','Offset (mm)',p.distance??-2)];
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
 if(type==='fillet'||type==='chamfer')return[f('radius',type==='fillet'?'Radius (mm)':'Distance (mm)',2),field('allEdges','All edges',p.allEdges??!(p.edges?.length||selection.some(s=>s.kind==='edge')),'checkbox')];
 if(type==='thread')return[select('mode','Geometry',['Cosmetic','Modeled'],p.mode??'Cosmetic'),field('size','Metric size',p.size,'select',[...METRIC_THREADS.map(s=>s.name),'Custom']),field('diameter','Nominal diameter (mm)',p.diameter),field('pitch','Pitch (mm) · coarse / fine / custom',p.pitch),select('kind','Thread type',['External','Internal'],p.kind),field('length','Thread length (mm)',p.length),field('offset','Start offset (mm)',p.offset??0),select('end','Measure from cylinder end',['End','Start'],p.end??'End'),select('hand','Handedness',['Right','Left'],p.hand??'Right')];
 if(type==='shell')return[f('thickness','Wall thickness (mm)',2)];
 if(type==='draft')return[f('angle','Draft angle (°)',5),select('plane','Neutral plane',['XY','XZ','YZ'],'XY'),f('offset','Neutral offset (mm)',0)];
 if(type==='offsetFace')return[f('distance','Distance (mm)',5)];
 if(type==='move'||type==='duplicate')return pos.map(v=>({...v,value:p[v.name]??(type==='duplicate'&&v.name==='x'?30:0)}));
 if(type==='rotate')return[field('axis','Axis',p.axisVector?'Custom':p.axis||'Z','select',p.axisVector?['Custom','X','Y','Z']:['X','Y','Z']),f('angle','Angle (°)',p.angle??90),...(p.axisVector?[f('ax','Axis X',p.axisVector[0]),f('ay','Axis Y',p.axisVector[1]),f('az','Axis Z',p.axisVector[2])]:[]),f('px','Pivot X (mm)',p.center?.[0]||0),f('py','Pivot Y (mm)',p.center?.[1]||0),f('pz','Pivot Z (mm)',p.center?.[2]||0)];
 if(type==='scale')return[f('factor','Uniform scale factor',1.2)];
 if(type==='mirror')return[select('plane','Mirror plane',['XY','XZ','YZ'],'YZ')];
 if(type==='sketchProfile')return[select('operation','Profile operation',['Join','Cut','Intersect'],'Join'),field('keepInputs','Keep original sketches',p.keepInputs??false,'checkbox')];
 if(type==='align'&&p.method==='concentric')return[f('offset','Axial offset (mm)',0),f('twist','Rotation (°)',0),select('sourceAnchor','Moving anchor',['centre','min','max'],'centre'),select('targetAnchor','Target anchor',['centre','min','max','keep'],'centre'),field('flip','Flip axis',p.flip??false,'checkbox')];
 if(type==='align'&&p.method==='faces')return[f('gap','Face gap (mm)',0)];
 if(type==='align')return[select('axis','Align body centres on axis',['X','Y','Z'],'X')];
 if(type==='pattern')return[f('count','Count',3),f('x','X spacing (mm)',30),f('y','Y spacing (mm)',0),f('z','Z spacing (mm)',0)];
 if(type==='circularPattern')return[f('count','Count',6),f('angle','Angle (°)',360),select('axis','Axis',['X','Y','Z'],'Z')];
 if(type==='split'||type==='plane')return[select('plane','Plane',['XY','XZ','YZ'],'XY'),f('offset','Offset (mm)',type==='split'?10:20)];
 if(type==='axis')return[select('axis','Direction',['X','Y','Z'],'Z'),...pos];
 return[];
}
function planeFromSelection(){const s=selection.at(-1),item=selectedItem(),face=item?.faceInfo?.find(f=>f.index===s?.index);if(!face||face.type!=='PLANE')return null;const n=face.normal,x=Math.abs(n[0])<.9?[1,0,0]:[0,1,0],dot=x.reduce((s,v,i)=>s+v*n[i],0),xx=x.map((v,i)=>v-dot*n[i]),len=Math.hypot(...xx);return{origin:face.center,x:xx.map(v=>v/len),normal:n};}
function requireSelection(type,ins){const message=toolSelectionError(type,selection,items,doc);if(message)throw Error(message);}

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
 return()=>{collect();const solved=solveSketch(points,rules);updateStatus(solved);return{points:solved.points,constraints:rules};};
}

function startTool(type,initial={},editId=null){
 if(!ready||busy)return;$('sidebar').hidden=true;
 if(sketchOperationTypes.has(type)||type==='text'||type==='sketch'&&editId&&doc.features.find(f=>f.id===editId)?.params.shape==='text'){activateSketchOperation(type==='sketch'?'text':type,editId);return;}
 if(!editId&&['union','subtract','intersect'].includes(type)&&!selection.some(r=>items.find(i=>i.id===r.id)?.kind!=='body')){beginBooleanSelection(type);return;}
 if(!editId&&type!=='sketch'){const message=toolSelectionError(type,selection,items,doc);if(message){status(message);return;}}
 if(type==='sketch'&&!editId){if(sketchMode||planeFromSelection())quickSketch(initial.shape||'rectangle');else chooseSketchPlane(initial.shape||'rectangle');return;}
 if(type==='rotate'&&!editId){const bodies=items.filter(i=>i.kind==='body'&&selectedIds().includes(i.id)&&!(doc.ui.hidden||[]).includes(i.id));if(!bodies.length){status('Select a solid body to rotate');return;}closePanels();direct.cancel();rotationGizmo.begin(bodies);return;}
 if(['move','scale','pattern'].includes(type)&&!editId){const bodies=items.filter(i=>i.kind==='body'&&selectedIds().includes(i.id)&&!(doc.ui.hidden||[]).includes(i.id));if(!bodies.length){status('Select a solid body to move');return;}closePanels();direct.cancel();moveGizmo.begin(bodies,{mode:type,count:preferences.patternCount,spacing:preferences.patternSpacing});return;}
 if(type==='align'&&!editId){if(workspaceMode!=='solid')setWorkspaceMode('solid');const refs=selection.map(s=>({...s}));closePanels();direct.cancel();$('sidebar').hidden=true;alignGizmo.begin(refs,{method:initial.method});return;}
 if(type==='extrude'&&!editId&&['sketch','face'].includes(selection.at(-1)?.kind)){if(!direct.target()){status('Direct extrusion requires a closed sketch or planar face');return;}closePanels();showFaceDistance(20,'extrude');return;}
 if(!editId&&(['fillet','chamfer'].includes(type)&&selection.at(-1)?.kind==='edge'||type==='draft'&&selection.at(-1)?.kind==='face'&&Math.abs(selectedItem()?.faceInfo.find(f=>f.index===selection.at(-1).index)?.normal?.[2]||0)<.9)){closePanels();showFaceDistance(type==='draft'?5:1,type);return;}
 setWorkspaceMode(type==='sketch'||type.startsWith('sketch')?'sketch':'solid');if(type==='import'){$('stepFile').click();return;}
 try{if(!editId)requireSelection(type,selectedIds());}catch(e){status(e.message);return;}
 closePanels();activeTool=type;editing=editId;const old=editId?doc.features.find(f=>f.id===editId):null,p={...old?.params,...initial};if(type==='hole'&&old){p.target=old.inputs[0];if(old.inputs[1])p.sketchId=old.inputs[1];}
 if(type==='hole'&&!editId){const ref=selection.at(-1),item=selectedItem(),recipe=doc.features.find(f=>f.id===item?.featureId)?.params;if(item?.kind==='sketch'){p.sketchId=item.id;p.target=items.find(i=>i.kind==='body'&&i.imprintProfiles?.includes(item.id))?.id||recipe?.hostBody||items.find(i=>i.kind==='body')?.id;}else{p.target=item?.id;p.face=ref?.index;const b=planeFromSelection();if(b&&ref?.point){const delta=ref.point.map((v,i)=>v-b.origin[i]),y=new THREE.Vector3(...b.normal).cross(new THREE.Vector3(...b.x));p.x=Number(delta.reduce((s,v,i)=>s+v*b.x[i],0).toFixed(3));p.y=Number(delta.reduce((s,v,i)=>s+v*y.getComponent(i),0).toFixed(3));}}}
 if(type==='thread'){
  direct.cancel();const ref=selection.at(-1),stock=old?.params.threadStock||selectedItem()?.faceInfo.find(f=>ref?.kind==='face'&&f.index===ref.index)?.cylinder;
  if(!stock?.full){activeTool=null;status('Select a complete cylindrical side face, then apply Thread');return;}
  if(!old)Object.assign(p,autoThread(stock,preferences),{mode:'Cosmetic',threadStock:stock,threadTarget:ref.id,face:ref.index,faceRef:selectedItem().faceInfo.find(f=>f.index===ref.index).reference},initial);
 }
 const workingInputs=[...(old?.inputs||selectedIds())],workingRefs=selection.map(r=>structuredClone(r));
 const fields=formFields(type,p),panel=$('toolPanel');
 panel.innerHTML='<header><h2>'+esc(type==='sketch'?(p.shape[0].toUpperCase()+p.shape.slice(1))+' sketch':labelFor(type))+'</h2><button id="cancelTool" aria-label="Close">'+ico('close')+'</button></header><p class="toolHint">'+esc(type==='thread'?'Choose metric size and pitch. Select the cylindrical shaft or bore face. Thread specifications are in millimetres.':type==='hole'?'Select a target body. A circular sketch supplies the diameter and centre; on a face, adjust diameter and centre offsets.':type==='sketch'?'Enter dimensions or draw on the selected plane.':type==='subtract'?'The first selected body is the main body. Remaining bodies are cutters.':type==='fillet'||type==='chamfer'?'Select edges, or apply to all edges.':type==='revolve'?'The profile must not cross the rotation axis.':type==='loft'?'Use two closed sketches on separated planes.':type==='shell'||type==='offsetFace'?'Uses the selected face.':'Values use millimetres; transforms are relative to the origin.')+'</p><form id="toolForm"><div class="fields">'+fields.map(f=>'<label class="'+(f.kind==='checkbox'?'check':f.name==='points'?'wide':'')+'" for="p-'+f.name+'">'+(f.kind==='checkbox'?'<input id="p-'+f.name+'" name="'+f.name+'" type="checkbox" '+(f.value?'checked':'')+'>':'')+esc(f.label)+(f.kind==='checkbox'?'':f.kind==='select'?'<select id="p-'+f.name+'" name="'+f.name+'">'+f.options.map(o=>'<option '+(o===f.value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>':'<input id="p-'+f.name+'" name="'+f.name+'" type="'+f.kind+'" step="any" value="'+esc(f.value)+'" required>')+'</label>').join('')+'</div><div class="actions">'+(type==='sketch'&&!editId?'<button type="button" id="drawSketch">Draw on plane</button>':'')+'<button type="submit" data-apply class="primary">'+(editId?'Update feature':type==='sketch'?'Create sketch':'Apply')+'</button></div></form>';
 panel.hidden=false;$('cancelTool').onclick=closePanels;if(type==='sketch'&&['arc','spline'].includes(p.shape))for(const key of ['plane','splineMode'])if($('p-'+key))$('p-'+key).dataset.gizmoDropdown='true';
 if(type==='sketch'&&p.dimensions?.length){const note=document.createElement('p');note.className='toolHint';note.textContent='Position follows Smart Dimension. Edit or remove its pinned label to change the controlled position.';$('toolForm').prepend(note);const resolved=resolvedDimensionDoc().features.find(f=>f.id===editId)?.params;for(const axis of ['x','y']){const input=$('p-'+axis);if(input&&p.dimensions.some(d=>d.mode==='distance'||d.mode===(axis==='x'?'horizontal':'vertical'))){if(resolved)input.value=(resolved[axis]||0)/unitFactorValue();input.readOnly=true;}}}

 if(type==='hole'){const label=document.createElement('label');label.className='holeTarget';label.textContent='Target body';const select=document.createElement('select');select.id='holeTarget';select.setAttribute('aria-label','Target body');const targets=items.filter(i=>i.kind==='body');if(old&&p.target&&!targets.some(i=>i.id===p.target))targets.unshift({id:p.target,name:doc.features.find(f=>f.id===p.target)?.name||'Original target'});for(const i of targets){const option=document.createElement('option');option.value=i.id;option.textContent=i.name;option.selected=i.id===p.target;select.append(option);}label.append(select);$('toolForm').prepend(label);const update=()=>{const blind=$('p-extent').value==='Blind';$('p-depth').disabled=!blind;$('p-depth').closest('label').hidden=!blind;};$('p-extent').onchange=update;update();}
 const readConstraints=type==='sketch'&&p.shape==='polyline'?mountConstraints(p):null;
 if(type==='sketch'&&p.shape==='spline')for(const [label,insert]of [['Insert spline point',true],['Remove spline point',false]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label);button.onclick=()=>{const raw=$('p-points'),points=raw.value.split(';').filter(v=>v.trim()).map(v=>v.split(',').map(Number)),match=/^point:(\d+):/.exec(parameterGizmo.debug?.parameter||''),index=Math.min(points.length-1,match?Number(match[1]):points.length-1),closed=$('p-closed').checked;if(insert){if(points.length>=100){status('A spline supports up to 100 points');return;}const i=index===points.length-1&&!closed?index-1:index,next=(i+1)%points.length;points.splice(i+1,0,points[i].map((v,k)=>(v+points[next][k])/2));button.dataset.activatePoint='point:'+(i+1)+':x';}else{if(points.length<=(closed?3:2)){status('Keep at least '+(closed?3:2)+' spline points');return;}points.splice(index,1);button.dataset.activatePoint='point:'+Math.min(index,points.length-1)+':x';}raw.value=points.map(q=>q.join(',')).join(';');};$('toolForm').append(button);}

 function read(){const result={...p};for(const f of fields){const el=$('p-'+f.name);result[f.name]=f.kind==='checkbox'?el.checked:f.kind==='number'?Number(el.value)*(f.factor||1):el.value;}if(type==='sketch'){if(result.plane==='Selected face'){result.basis=p.basis||planeFromSelection();if(!result.basis)throw Error('Select a planar face');}else delete result.basis;if(typeof result.points==='string')result.points=result.points.split(';').filter(v=>v.trim()).map(v=>v.split(',').map(Number));}if(type==='sketch'&&result.plane==='Selected face'){const ref=selection.at(-1);if(ref?.kind==='face'){result.hostBody=ref.id;result.hostFace=ref.index;}}
 if(type==='hole'){result.target=$('holeTarget').value;if(!result.target)throw Error('Create a target solid body first');}
 if(type==='rotate'){result.center=[result.px,result.py,result.pz];if(result.axis==='Custom')result.axisVector=[result.ax,result.ay,result.az];else delete result.axisVector;}if(readConstraints)Object.assign(result,readConstraints());if(!editId&&(type==='fillet'||type==='chamfer'))result.edges=selection.filter(s=>s.kind==='edge'&&s.id===selectedIds()[0]).map(s=>s.index);if(type==='shell'||type==='offsetFace'||type==='draft')result.face=p.face??selection.find(s=>s.kind==='face')?.index;return result;}
 if(type==='thread'){mountThreadForm($('toolForm'),p.threadStock,read);renderContext();updateFaceHandle();}
 $('toolForm').onsubmit=async e=>{e.preventDefault();try{parameterGizmo?.pause();const id=await apply(type,read(),operationInputs(),editId,editId?null:workingRefs.at(-1));closePanels();select([{id,kind:items.find(i=>i.id===id)?.kind||'body'}]);}catch(err){parameterGizmo?.resume();error(err);}};
 function operationInputs(){return type==='hole'?[$('holeTarget').value,...(p.sketchId?[p.sketchId]:[])]:type==='thread'?(old?.inputs||[p.threadTarget]):workingInputs;}
 const compactSketch=type==='sketch'||type.startsWith('sketch')||type==='faceSketch',restoreSketchBar=()=>{if(compactSketch&&!sketchMode){$('sketchBar').hidden=true;$('finishSketch').hidden=false;}else refreshSketchHint();};
 if(compactSketch){$('sketchBar').hidden=false;$('finishSketch').hidden=!sketchMode;$('sketchHint').textContent=labelFor(type);}
 parameterGizmo.begin({type,title:labelFor(type),preview:type==='thread'?false:undefined,host:panel,compact:compactSketch,actionHost:$('sketchBar'),actionBefore:$('finishSketch'),fields,read,status:panel.querySelector('.threadValidation,[data-solve-status]'),inputs:operationInputs,reference:()=>editId?null:workingRefs.at(-1),editId,apply:panel.querySelector('[data-apply]'),cancel:$('cancelTool'),commit:()=> $('toolForm').onsubmit({preventDefault(){}}),onCancel:()=>{closePanels();restoreSketchBar();},context:()=>{const targets=operationInputs().map(id=>items.find(i=>i.id===id)).filter(Boolean),result=items.find(i=>i.featureId===editId)||selectedItem();return{items:targets.length?targets:result?[result]:[],refs:editId&&Number.isInteger(p.face)?[{kind:'face',index:p.face}]:workingRefs,profile:doc.features.find(f=>f.id===operationInputs()[0])?.params};},...(['union','subtract','intersect','loft'].includes(type)&&workingInputs.length>1?{swap:()=>workingInputs.push(workingInputs.shift())}:{})});
 if($('drawSketch'))$('drawSketch').onclick=()=>{try{beginDrawing(read());}catch(e){error(e);}};
}
function showSidebar(type){
 if(visualizer?.active){if(type==='items')visualizer.hideControls();else visualizer.exit();}
 if(!(booleanSession&&type==='items'))closePanels();const side=$('sidebar');if(!side.hidden&&side.dataset.type===type){side.hidden=true;return;}side.dataset.type=type;side.hidden=false;renderSidebar();
}
$('itemsToggle').title='Parts and visibility';$('itemsToggle').onclick=()=>showSidebar('items');$('historyToggle').onclick=()=>showSidebar('history');$('settingsToggle').onclick=()=>showSidebar('settings');
function renderSidebar(){
 const side=$('sidebar');if(side.hidden)return;side.replaceChildren();const h=document.createElement('header');h.innerHTML='<h2>'+esc(side.dataset.type[0].toUpperCase()+side.dataset.type.slice(1))+'</h2><button aria-label="Close">'+ico('close')+'</button>';h.querySelector('button').onclick=()=>side.hidden=true;side.append(h);
 if(side.dataset.type==='items'){const show=document.createElement('button');show.type='button';show.dataset.control='visibility';show.className='showAllParts';show.innerHTML=ico('eye')+'<span>Show all</span>';show.setAttribute('aria-label','Show all parts');show.onclick=()=>{rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();doc.ui.hidden=[];render();saveLocal();};side.append(show);for(const [kind,label,icon]of [['sketch','Sketches','sketch'],['body','Solid bodies','box'],['construction','Construction','construct']]){const members=items.filter(i=>!i.regionHost&&(kind==='construction'?['plane','axis'].includes(i.kind):i.kind===kind));if(!members.length)continue;const group=document.createElement('details');group.open=true;group.className='objectGroup';const heading=document.createElement('summary');heading.innerHTML=ico(icon)+'<span>'+label+'</span><small>'+members.length+'</small>';group.append(heading);for(const item of members){const row=document.createElement('div');row.className='itemRow';const check=document.createElement('button'),visible=!(doc.ui?.hidden||[]).includes(item.id);check.type='button';check.className='visibilityEye';check.dataset.control='visibility';check.innerHTML=ico(visible?'eye':'eyeOff');check.setAttribute('aria-label',(visible?'Hide ':'Show ')+item.name);check.setAttribute('aria-pressed',String(visible));check.title=(visible?'Hide ':'Show ')+item.name;check.onclick=()=>setItemVisibility(item.id,!visible);row.classList.toggle('itemHidden',!visible);const b=document.createElement('button');b.textContent=item.name;b.disabled=!visible||!!booleanSession&&item.kind!=='body';b.classList.toggle('selected',selectedIds().includes(item.id));b.onclick=e=>{const ref={id:item.id,kind:item.kind};select([ref],extendCanvasSelection(selection,ref,{explicit:e.shiftKey||$('multi').getAttribute('aria-pressed')==='true'||!!booleanSession,filter:$('pickMode').value}));};b.ondblclick=()=>{const input=document.createElement('input');input.className='renameObject';input.value=item.name;input.setAttribute('aria-label','Rename object');b.replaceWith(input);input.focus();input.select();let done=false;const commit=async()=>{if(done)return;done=true;const name=input.value.trim().slice(0,80);if(!name){renderSidebar();return;}const next=snapshot(),f=next.features.find(f=>f.id===item.featureId);f.name=name;try{await rebuild(next);}catch(e){error(e);}};input.onblur=commit;input.onkeydown=e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){done=true;renderSidebar();}};};const rename=document.createElement('button');rename.dataset.control='rename';rename.innerHTML=ico('rename');rename.setAttribute('aria-label','Rename '+item.name);rename.onclick=()=>b.ondblclick();row.append(check,b,rename);group.append(row);}side.append(group);}} else if(side.dataset.type==='history')for(const f of doc.features){const row=document.createElement('div');row.className='featureHistoryRow';const b=document.createElement('button');b.className='historyRow';b.textContent=f.name+(f.suppressed?' · suppressed':'');b.title='Edit feature parameters';b.onclick=()=>startTool(f.type,{},f.id);b.disabled=f.suppressed||['import','delete','imprint','sketchTrim'].includes(f.type);row.append(b);const dependent=doc.features.some(other=>other.id!==f.id&&!other.suppressed&&(other.inputs.some(id=>id===f.id||id.startsWith(f.id+':'))||other.params.dimensions?.some(d=>d.source===f.id)));if(!dependent){const suppress=document.createElement('button');suppress.dataset.control='history';suppress.innerHTML=ico(f.suppressed?'unsuppress':'suppress');suppress.setAttribute('aria-label',(f.suppressed?'Unsuppress ':'Suppress ')+f.name);suppress.title=f.suppressed?'Unsuppress feature':'Suppress leaf feature';suppress.onclick=async()=>{const next=snapshot();next.features.find(v=>v.id===f.id).suppressed=!f.suppressed;try{await rebuild(next);}catch(e){error(e);}};row.append(suppress);const remove=document.createElement('button');remove.dataset.control='history';remove.innerHTML=ico('delete');remove.setAttribute('aria-label','Remove feature '+f.name);remove.title='Remove leaf feature; Undo restores it';remove.onclick=async()=>{const next=snapshot();next.features=next.features.filter(v=>v.id!==f.id);try{await rebuild(next);}catch(e){error(e);}};row.append(remove);}side.append(row);} else if(side.dataset.type==='settings'){
  side.innerHTML+='<div class="settings"><label>Grid snap (mm)<input id="snapSize" type="number" min=".01" max="100" step=".1" value="'+gridStep+'"></label><label>Selection<select id="settingsSelection"><option>auto</option><option>body</option><option>face</option><option>edge</option><option>sketch</option></select></label><label class="check"><input type="checkbox" id="showGrid" '+(grid.visible?'checked':'')+'> Grid</label><label class="check"><input type="checkbox" id="showEdges" '+(showEdges?'checked':'')+'> Visible edges</label><label class="check"><input type="checkbox" id="sectionEnabled" '+(sectionEnabled?'checked':'')+'> Section view (XY)</label><label>Section height (mm)<input type="number" id="sectionHeight" value="'+sectionHeight+'"></label><button id="resetView">Reset view</button><p class="quiet">R3ds · REQOO 3D Studios · solid modelling<br>Projects are stored locally in this browser. Download backups from File.</p></div>';
  const pref=document.createElement('div');pref.className='preferenceGrid';pref.innerHTML='<label>Units<select id="cadUnits"><option value="mm">Millimetres</option><option value="in">Inches</option></select></label><label>Precision<select id="cadPrecision"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></label><label>Theme<select id="cadTheme"><option value="light">Light</option><option value="dark">Dark</option></select></label><label class="check"><input type="checkbox" id="cadSnap"> Snapping</label>';side.querySelector('.settings').prepend(pref);const dimensionsToggle=document.createElement('label');dimensionsToggle.className='check';const dimensionsCheck=document.createElement('input');dimensionsCheck.type='checkbox';dimensionsCheck.checked=doc.ui.dimensionsVisible!==false;dimensionsCheck.setAttribute('aria-label','Show pinned dimensions');dimensionsCheck.onchange=()=>{const next=snapshot();next.ui.dimensionsVisible=dimensionsCheck.checked;commitDimensionUI(next);};dimensionsToggle.append(dimensionsCheck,' Show pinned dimensions');side.querySelector('.settings').append(dimensionsToggle);mountModelSettings(side.querySelector('.settings'),preferences,updatePreferences);mountSnapSettings(side.querySelector('.settings'),preferences,()=>{snapGuides.hide();updatePreferences();});
  $('cadUnits').value=preferences.units;$('cadUnits').onchange=()=>{preferences.units=$('cadUnits').value;updatePreferences();};$('cadPrecision').value=String(preferences.precision);$('cadPrecision').onchange=()=>{preferences.precision=Number($('cadPrecision').value);updatePreferences();};$('cadTheme').value=preferences.theme;$('cadTheme').onchange=()=>{preferences.theme=$('cadTheme').value;updatePreferences();};$('cadSnap').checked=preferences.snap;$('cadSnap').onchange=()=>{preferences.snap=$('cadSnap').checked;updatePreferences();};
  side.querySelector('header button').onclick=()=>side.hidden=true;$('snapSize').onchange=()=>{gridStep=Math.max(.01,Math.min(100,Number($('snapSize').value)||1));preferences.snapStep=gridStep;updatePreferences();};
  $('settingsSelection').value=$('pickMode').value;$('settingsSelection').onchange=()=>$('pickMode').value=$('settingsSelection').value;
  $('showGrid').checked=preferences.gridVisible!==false;$('showGrid').onchange=()=>setGridVisible($('showGrid').checked);$('showEdges').onchange=()=>{setDisplayMode($('showEdges').checked?'shadedEdges':'shaded');};$('sectionEnabled').onchange=()=>{sectionEnabled=$('sectionEnabled').checked;updateClip();};$('sectionHeight').onchange=()=>{sectionHeight=Number($('sectionHeight').value)||0;updateClip();};$('resetView').onclick=()=>{view('iso');fit();};
 }
}
function search(){closePanels();$('searchDialog').showModal();$('commandQuery').value='';renderCommands();$('commandQuery').focus();}
function renderCommands(){const q=$('commandQuery').value.toLowerCase();$('commandResults').replaceChildren();for(const [type,label]of (workspaceMode==='sketch'?tools.sketch:[...tools.add,...tools.construct,...tools.transform,...tools.tools]).filter(v=>v[1].toLowerCase().includes(q))){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{$('searchDialog').close();startTool(type,tools.sketch.some(v=>v[0]===type)?{shape:type}:{});};$('commandResults').append(b);}}
$('commandQuery').oninput=renderCommands;document.querySelector('#searchDialog [data-close]').onclick=()=>$('searchDialog').close();
function normalizeTool(type,p){if(type==='concentric')return['align',{...p,method:'concentric'}];return sketchPrimitives.has(type)?['sketch',{...p,shape:type}]:[type,p];}
const actualStart=startTool;startTool=function(type,initial={},editId=null){const [t,p]=normalizeTool(type,initial);return actualStart(t,p,editId);};
$('startSketch').onclick=chooseSketchPlane;$('nav-sketch').onclick=chooseSketchPlane;
let nextSketchShape='rectangle';
function chooseSketchPlane(shape='rectangle'){if(typeof shape!=='string')shape='rectangle';nextSketchShape=shape;if(!ready||busy)return;closePanels();setWorkspaceMode('sketch');planePicker.begin();status('Choose XY, XZ, YZ or a selected planar face');}

let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(e){$('stage').innerHTML='<div class="graphicsError"><h1>3D graphics unavailable</h1><p>Open this page in Safari or Chrome with WebGL enabled.</p></div>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;$('canvas').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f6f7f9');const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,10000);camera.up.set(0,0,1);camera.position.set(130,-160,130);
const controls=new CADNavigation(camera,renderer.domElement);controls.enableDamping=false;controls.target.set(0,0,10);controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomSpeed=1.1;controls.rotateSpeed=.32;controls.panSpeed=.65;controls.dampingFactor=.08;
const hemisphere=new THREE.HemisphereLight(0xffffff,0xb9c4d0,2.8);scene.add(hemisphere);const lamp=new THREE.DirectionalLight(0xffffff,2.4);lamp.position.set(60,-90,150);scene.add(lamp);const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-100,40,70);scene.add(fill);
const grid=new THREE.GridHelper(1000,100,0x7c8896,0x63717f);grid.material.transparent=true;grid.material.opacity=.23;grid.material.depthWrite=false;grid.rotation.x=Math.PI/2;grid.position.z=-.03;scene.add(grid);grid.visible=preferences.gridVisible!==false;
const gridToggle=document.createElement('button');gridToggle.id='gridToggle';gridToggle.type='button';gridToggle.dataset.control='grid';gridToggle.setAttribute('aria-label','Toggle grid');gridToggle.innerHTML=ico('grid');$('fit').before(gridToggle);
function setGridVisible(visible){preferences.gridVisible=!!visible;grid.visible=!!visible;gridToggle.setAttribute('aria-pressed',String(grid.visible));if($('showGrid'))$('showGrid').checked=grid.visible;localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));status('Grid '+(visible?'on':'off'));}
gridToggle.onclick=()=>{if(visualizer?.active)visualizer.exit();setGridVisible(!grid.visible);};gridToggle.setAttribute('aria-pressed',String(grid.visible));
const worldReference=createWorldReference({THREE,scene,camera,stage:$('stage')});
planePicker=createSketchPlanePicker({THREE,scene,camera,controls,stage:$('stage'),getSelectedFace:()=>{const basis=planeFromSelection(),ref=selection.at(-1);return basis?{plane:'Selected face',basis,hostBody:ref.id,hostFace:ref.index}:null;},onChoose:recipe=>{chosenSketchPlane=recipe;const operation=sketchOperationTypes.has(nextSketchShape)||nextSketchShape==='text';beginDrawing({...recipe,shape:operation?'rectangle':nextSketchShape,closed:operation||!['polyline','arc','spline'].includes(nextSketchShape),width:30,height:20,sides:6,sagitta:10},{direct:true});if(operation)activateSketchOperation(nextSketchShape);},onCancel:()=>{setWorkspaceMode('solid');status('Sketch plane selection cancelled');}});
const root=new THREE.Group(),preview=new THREE.Group();const directOverlay=new THREE.Group();scene.add(root,preview,directOverlay);
const snapGuides=createSnapGuides({THREE,camera,stage:$('stage')});
const snapOptions=createSnapOptions({stage:$('stage'),before:$('fit'),preferences,save:()=>{localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));syncSnapControl();},onChange:()=>snapGuides.hide()});
const getSnapOptions=()=>({enabled:preferences.snap,step:gridStep,grid:preferences.snapGrid,geometry:preferences.snapGeometry,guides:preferences.snapGuides,hints:preferences.snapHints});
const showSnap=value=>value?snapGuides.show(value):snapGuides.hide();
const drawingMeasure=document.createElement('output');drawingMeasure.id='drawingMeasure';drawingMeasure.hidden=true;$('stage').append(drawingMeasure);
let showEdges=preferences.displayMode!=='shaded',sectionEnabled=false,sectionHeight=10;
function updateClip(){const planes=sectionEnabled?[new THREE.Plane(new THREE.Vector3(0,0,-1),sectionHeight)]:[];root.traverse(o=>{if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){const changed=(m.clippingPlanes?.length||0)!==planes.length;m.clippingPlanes=planes;if(changed)m.needsUpdate=true;}}});}
function clear(g){for(const o of [...g.children]){g.remove(o);o.traverse(n=>{if(!n.geometry?.userData?.cadShared)n.geometry?.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])if(!m?.userData?.cadShared)m?.dispose();});}}
const displayCache=createDisplayCache();

function drawCosmeticThreads(shown){
 const visible=new Set(shown.filter(i=>i.kind==='body').map(i=>i.id));
 for(const feature of doc.features||[]){
  const p=feature.params||{},c=p.threadStock;
  if(feature.type!=='thread'||p.mode!=='Cosmetic'||!c||!visible.has(feature.id))continue;
  try{
   const spec=threadDimensions(p,c),axis=new THREE.Vector3(...c.axis).normalize();
   const radial=new THREE.Vector3(1,0,0);
   if(Math.abs(radial.dot(axis))>.9)radial.set(0,1,0);
   radial.addScaledVector(axis,-radial.dot(axis)).normalize();
   const tangent=new THREE.Vector3().crossVectors(axis,radial).normalize();
   const origin=new THREE.Vector3(...c.origin),points=[];
   const turns=spec.length/spec.pitch,steps=Math.max(24,Math.min(1600,Math.ceil(turns*48)));
   const radius=c.radius+(c.internal?-.012:.012);
   for(let i=0;i<=steps;i++){
    const t=i/steps,angle=(spec.left?-1:1)*2*Math.PI*turns*t;
    points.push(origin.clone().addScaledVector(axis,spec.start+spec.length*t)
     .addScaledVector(radial,radius*Math.cos(angle)).addScaledVector(tangent,radius*Math.sin(angle)));
   }
   const geometry=new THREE.BufferGeometry().setFromPoints(points);
   const material=new THREE.LineBasicMaterial({color:0xd6a24d,transparent:true,opacity:.95,depthTest:true,depthWrite:false});
   const line=new THREE.Line(geometry,material);line.name='Cosmetic thread · visual only';line.userData.cosmeticThread=true;line.renderOrder=3;
   root.add(line);
  }catch(error){console.warn('[REDS Thread] Cosmetic display skipped:',error.message);}
 }
}

function render(previewOnly=false){
 if(holdingModel)return;
 visualizer?.syncScene();grid.visible=!visualizer?.active&&preferences.gridVisible!==false;worldReference.group.visible=!visualizer?.active&&!captureMode;
 const ids=selectedIds(),hidden=doc.ui?.hidden||[],imprinted=new Set((displayItems||items).filter(i=>i.kind==='body').flatMap(i=>i.imprintProfiles||[]));
 const shown=(displayItems||items).filter(item=>!(visualizer?.active&&item.kind!=='body'||item.regionHost||hidden.includes(item.id)||isolate&&!ids.includes(item.id)||item.kind==='sketch'&&imprinted.has(item.id)&&workspaceMode==='solid'&&!sketchMode&&$('pickMode').value!=='sketch'&&!selection.some(s=>s.id===item.id&&s.kind==='sketch')));clear(root);displayCache.prune(shown);
 for(const item of shown){
  const node=new THREE.Group();node.userData.itemId=item.id;root.add(node);const itemSelection=captureMode||sketchMode&&item.kind==='body'?[]:item.previewSelection||selection.filter(s=>s.id===item.id);
  if(item.mesh.triangles.length){const appearance=visualizer?.style(item.id),uvKey=appearance&&appearance.texture!=='none'?JSON.stringify([appearance.size,appearance.rotation,appearance.mapping]):'plain';let g=displayCache.face(item.mesh,uvKey,()=>{let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(item.mesh.vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(item.mesh.normals,3));geometry.setIndex(item.mesh.triangles);if(item.kind==='body')geometry=visualizer?.geometry(geometry,item)||geometry;return geometry;});
   const selected=itemSelection,faceIds=selected.filter(s=>s.kind==='face').map(s=>s.index),whole=selected.some(s=>s.kind==='body'||s.kind==='sketch');
   const alignmentTarget=alignGizmo?.roles?.target===item.id||booleanSession?.type==='subtract'&&selection[0]?.id===item.id;
   const color=item.kind==='body'?(alignmentTarget?'#efbd64':doc.ui?.colors?.[item.id]||(preferences.theme==='dark'?'#99999f':'#aeb9c7')):item.kind==='plane'?'#99b9df':'#8fb8fa';
   const [material,highlight]=displayCache.material(item.mesh,JSON.stringify([whole,alignmentTarget,faceIds.length>0,preferences.theme,preferences.displayMode,!!visualizer?.active,color,appearance]),()=>{
   const material=(item.kind==='body'?visualizer?.material(item):null)||new THREE.MeshStandardMaterial({color:whole&&!alignmentTarget?'#477fb0':color,roughness:.55,metalness:.08,transparent:item.kind!=='body',depthWrite:item.kind==='body',opacity:item.kind==='plane'?.16:item.kind==='sketch'?.22:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:item.kind==='sketch'?-3:1,polygonOffsetUnits:item.kind==='sketch'?-3:1});
   if(whole&&!alignmentTarget&&!visualizer?.active&&item.kind==='body')material.color.set('#477fb0');if(alignmentTarget)material.color.set('#efbd64');
   const highlight=new THREE.MeshBasicMaterial({color:preferences.theme==='dark'?'#6ca9c8':'#298dca',side:THREE.DoubleSide});
   if(faceIds.length&&!visualizer?.active&&preferences.displayMode!=='wireframe'){highlight.transparent=true;highlight.opacity=.72;highlight.depthWrite=false;}
   if(whole&&!alignmentTarget&&!visualizer?.active&&item.kind==='body'){material.emissive.set('#173d63');material.emissiveIntensity=.18;}
   if(visualizer?.active){highlight.transparent=true;highlight.opacity=.25;highlight.depthWrite=false;}if(!visualizer?.active&&item.kind==='body'&&preferences.displayMode==='xray'){material.transparent=true;material.opacity=whole?.6:.24;material.depthWrite=false;highlight.transparent=true;highlight.opacity=.88;highlight.depthWrite=false;}if(!visualizer?.active&&item.kind==='body'&&preferences.displayMode==='wireframe'){material.colorWrite=false;material.depthWrite=false;highlight.colorWrite=faceIds.length>0;highlight.transparent=true;highlight.opacity=.13;highlight.depthWrite=false;}return[material,highlight];});g.clearGroups();for(const f of item.mesh.faceGroups)g.addGroup(f.start,f.count,faceIds.includes(f.faceIndex)?1:0);
   const mesh=new THREE.Mesh(g,[material,highlight]);mesh.castShadow=!!visualizer?.active;mesh.renderOrder=item.kind==='sketch'?3:0;mesh.userData={id:item.id,kind:item.kind,faceGroups:item.mesh.faceGroups};node.add(mesh);
  }
  for(const edge of item.edges){const selected=itemSelection.some(s=>s.kind==='edge'?s.index===edge.index:s.kind==='sketch'||s.kind==='body'),faceBoundary=itemSelection.some(s=>s.kind==='face'&&edge.faceIndices?.includes(s.index)),color=alignGizmo?.roles?.target===item.id?'#ffca71':selected||faceBoundary?'#f1ad58':item.kind==='sketch'?'#4883c8':item.kind==='axis'?'#c89143':preferences.theme==='dark'?(preferences.displayMode==='wireframe'?'#a7c3df':'#222328'):'#52687d',colorWrite=item.kind!=='body'||!visualizer?.active&&showEdges||selected||faceBoundary||selection.some(s=>s.id===item.id&&s.kind==='edge'&&s.index===edge.index);if(item.kind==='sketch'){const wideGeometry=displayCache.edge(edge,()=>{const geometry=new LineSegmentsGeometry();geometry.setPositions(Array.from(edge.lines));return geometry;}),wideMaterial=displayCache.line('wide:'+color+':'+selected,()=>new LineMaterial({color,linewidth:selected?2.8:2,transparent:true,opacity:1,depthTest:false}));wideMaterial.resolution.set(renderer.domElement.clientWidth,renderer.domElement.clientHeight);const wide=new LineSegments2(wideGeometry,wideMaterial);if(!wideGeometry.hasAttribute('instanceDistanceStart'))wide.computeLineDistances();wide.renderOrder=4;wide.userData={id:item.id,kind:'edge',index:edge.index,itemKind:item.kind};node.add(wide);continue;}const geometry=displayCache.edge(edge,()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(edge.lines,3));return g;}),material=displayCache.line('line:'+color+':'+colorWrite+':'+item.kind,()=>{const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:item.kind==='plane'?.4:.9});m.colorWrite=colorWrite;return m;}),line=new THREE.LineSegments(geometry,material);line.renderOrder=1;line.userData={id:item.id,kind:'edge',index:edge.index,itemKind:item.kind};node.add(line);}

 }
 drawCosmeticThreads(shown);
 $('empty').hidden=items.length>0||!!parameterGizmo?.active||!!sketchMode;if(previewOnly!==true){renderSidebar();renderContext();updateSketchDimensions();}updateClip();updateFaceHandle();smartDimensions?.update();visualizer?.update();
}

function referenceParams(type,params,ref=selection.at(-1)){
 const result={...params},item=items.find(i=>i.id===ref?.id);
 if(ref?.kind==='face'&&['offsetFace','shell','hole','extrude','draft','thread','faceSketch'].includes(type)){result.face??=ref.index;result.faceRef??=item?.faceInfo.find(f=>f.index===result.face)?.reference;}
 if((type==='fillet'||type==='chamfer')&&!result.allEdges){result.edges??=selection.filter(s=>s.id===ref?.id&&s.kind==='edge').map(s=>s.index);result.edgeRefs??=result.edges.map(i=>item?.edges.find(e=>e.index===i)?.reference);}
 if(type==='extrude'&&ref?.kind==='face')result.operation??='Add';
 return result;
}
let immediateSession=null;
function resetDirectPreview(force=false){previewVersion++;const changed=displayItems||immediateSession;immediateSession=null;displayItems=null;clear(directOverlay);if(changed||force)render(true);}
function showImmediate(type,params,ref){
 if(type==='extrude'&&params.operation&&params.operation!=='New body'){resetDirectPreview();return false;}
 const item=items.find(i=>i.id===ref.id),value=type==='diameter'?params.diameter:params.distance;
 const transform=item&&immediateTransform(doc,item,ref,type,value);
 if(!transform){
  if(type!=='offsetFace'||value<=0||!item||sectionEnabled){if(immediateSession){immediateSession=null;clear(directOverlay);displayItems=null;render(true);}return false;}
  if(immediateSession?.mode!=='prism'){
   const data=facePrismData(item,ref.index);if(!data)return false;
   clear(directOverlay);if(displayItems){displayItems=null;render(true);}
   const geometry=new THREE.BufferGeometry(),positions=data.base.slice();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
   const material=new THREE.MeshStandardMaterial({color:doc.ui?.colors?.[ref.id]||'#d6dbe2',roughness:.55,metalness:.08,side:THREE.DoubleSide});
   if(preferences.displayMode==='wireframe'){material.colorWrite=false;material.depthWrite=false;}
   const mesh=new THREE.Mesh(geometry,material);directOverlay.add(mesh);
   const edgesGeometry=new THREE.BufferGeometry();edgesGeometry.setAttribute('position',new THREE.BufferAttribute(data.lines.slice(),3).setUsage(THREE.DynamicDrawUsage));
   const edgeLines=new THREE.LineSegments(edgesGeometry,new THREE.LineBasicMaterial({color:'#576372'}));edgeLines.visible=preferences.displayMode!=='shaded';directOverlay.add(edgeLines);
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
 const source=diameterSource(doc,item);
 if(source&&(source.type==='cylinder'||source.params.shape==='circle'))return{featureId:source.id,diameter:2*(source.params.radius??15)};
 return null;
}
function diameterDocument(params,ref){
 const target=diameterTarget(ref);if(!target)throw Error('Diameter source is not editable for this face');
 if(!Number.isFinite(params.diameter)||params.diameter<=.001||params.diameter>2000)throw Error('Diameter must be between 0.001 and 2000 mm');
 const next=snapshot();next.features.find(f=>f.id===target.featureId).params.radius=params.diameter/2;return next;
}

function directRecipe(type,params,ref,id){const refs=ref.refs||[ref],multiple=type==='extrude'&&refs.length>1;return{id,type,name:labelFor(type),params:multiple?{...params,profileIds:refs.map(r=>r.id)}:referenceParams(type,params,ref),inputs:multiple?[...refs.map(r=>r.id),...(params.operation!=='New body'&&params.target?[params.target]:[])]:[ref.id,...(type==='extrude'&&ref.kind==='sketch'&&params.operation!=='New body'&&params.target?[params.target]:[])]};}
function extrusionRefs(){const message=toolSelectionError('extrude',selection,items,doc);if(message)throw Error(message);const refs=selection.map(s=>({...s}));if(refs.length<2)return refs;const selected=refs.map(r=>items.find(i=>i.id===r.id));if(refs.some((r,i)=>r.kind!=='sketch'||!selected[i]?.profileClosed))throw Error('Select closed sketch profiles together; face extrusion uses one face');const n=selected[0].sketchPlane.normal;if(selected.some(i=>i.sketchPlane.normal.reduce((sum,v,k)=>sum+v*n[k],0)<.99999))throw Error('Choose parallel sketch profiles with matching directions');return refs;}
const direct=createDirectModeling({THREE,scene,camera,renderer,stage:$('stage'),getSelection:()=>selection,getOperationRefs:operation=>operation==='extrude'?extrusionRefs():selection.map(r=>({...r})),getDiameterTarget:diameterTarget,getItem:selectedItem,getDoc:()=>doc,isBusy:()=>busy,isSketching:()=>!!parameterGizmo?.active||activeTool==='thread'||!!sketchMode||!!rotationGizmo?.active||!!moveGizmo?.active||!!alignGizmo?.active,getSnap:getSnapOptions,onSnap:showSnap,
 onNavigation:enabled=>{if(!enabled)controls.stopMotion();controls.enabled=enabled&&!sketchMode;},
 getExtrudeTargets:ref=>items.filter(i=>i.kind==='body'&&!(doc.ui.hidden||[]).includes(i.id)&&(ref.kind!=='face'||i.id===ref.id)),getUnits:()=>({factor:unitFactorValue(),label:preferences.units}),onStatus:status,onResetPreview:resetDirectPreview,onImmediate:showImmediate,
 onPreview:async(type,params,ref,isCurrent)=>{const version=++previewVersion,next=type==='diameter'?diameterDocument(params,ref):snapshot();if(type!=='diameter')next.features.push(directRecipe(type,params,ref,'direct_preview'));const result=await rpc('preview',{doc:next});if(isCurrent()){displayItems=result.map(item=>{if(item.id.startsWith('direct_preview:')){const source=ref.refs?.[Number(item.id.split(':')[1])];return source?{...item,id:source.id,previewSelection:[{id:source.id,kind:'body'}]}:item;}if(item.id!=='direct_preview'&&item.id!==ref.id)return item;const original=items.find(i=>i.id===ref.id),previewSelection=[];if(ref.kind==='face'){const source=original?.faceInfo.find(f=>f.index===ref.index);try{const index=resolveReference(source?.reference,item.faceInfo.map(f=>f.reference),ref.index);previewSelection.push({...ref,index});}catch{}}else if(ref.kind==='sketch')previewSelection.push({id:ref.id,kind:'body'});return{...item,id:ref.id,previewSelection};});if(!immediateSession)render(true);else if(!direct.state.dragging&&(type==='diameter'?params.diameter:params.distance)===direct.state.value){immediateSession=null;clear(directOverlay);render(true);}}},
 onCommit:async(type,params,ref)=>{if(type==='diameter'){await rebuild(diameterDocument(params,ref),{selectId:ref.id});return;}if(type==='extrude'&&ref.refs?.length>1){const next=snapshot(),id=uid();next.features.push(directRecipe(type,params,ref,id));await rebuild(next);select(items.filter(i=>i.featureId===id).map(i=>({id:i.id,kind:'body'})));return;}const id=await apply(type,referenceParams(type,params,ref),[ref.id,...(type==='extrude'&&ref.kind==='sketch'&&params.operation!=='New body'&&params.target?[params.target]:[])]);select([{id,kind:'body'}]);}
});
const patternOverlay=new THREE.Group();patternOverlay.name='Pattern preview';scene.add(patternOverlay);
function clearPatternPreview(){while(patternOverlay.children.length)patternOverlay.remove(patternOverlay.children[0]);}
moveGizmo=createTranslationGizmo({THREE,scene,camera,renderer,stage:$('stage'),isBusy:()=>busy,getUnits:()=>({factor:unitFactorValue(),label:preferences.units}),onNavigation:enabled=>{if(!enabled)controls.stopMotion();controls.enabled=enabled&&!sketchMode;},onStatus:status,onActive:()=>renderContext(),getSnap:getSnapOptions,onSnap:showSnap,getItems:()=>items.filter(i=>!(doc.ui.hidden||[]).includes(i.id)&&(!isolate||selectedIds().includes(i.id))),getFrameMode:()=>preferences.gizmoFrame,onFrameMode:mode=>{preferences.gizmoFrame=mode;localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));},getLocalFrame:chosen=>{const ref=selection.at(-1),item=chosen.find(i=>i.id===ref?.id)||chosen[0];return faceFrame(item,ref);},getFacePivot:()=>{const ref=selection.at(-1),face=selectedItem()?.faceInfo.find(f=>ref?.kind==='face'&&f.index===ref.index);return face?(ref.point||face.center):null;},
 onPreview:(ids,delta,options)=>{clearPatternPreview();for(const node of root.children)if(ids.includes(node.userData.itemId)){
  if(options.mode==='pattern'){if(!options.reset)for(let i=1;i<options.count;i++){const copy=node.clone(true);copy.position.set(...delta.map(v=>v*i));patternOverlay.add(copy);}continue;}
  if(options.mode==='scale'){node.scale.setScalar(options.factor);node.position.set(...options.pivot.map(v=>v*(1-options.factor)));}else{node.scale.set(1,1,1);node.position.set(...delta);}node.updateMatrixWorld(true);
 }},
 onCommit:async(ids,delta,options)=>{const next=snapshot(),created=[];for(const id of ids){const mode=options.mode,feature={id:uid(),type:mode,name:mode==='pattern'?'Linear pattern':mode==='scale'?'Scale':'Move / Translate',params:mode==='scale'?{factor:options.factor,center:options.pivot}:{x:delta[0],y:delta[1],z:delta[2],...(mode==='pattern'?{count:options.count}:{})},inputs:[id]};next.features.push(feature);created.push(feature.id);}await rebuild(next);select(created.map(id=>({id,kind:'body'})));}
});
rotationGizmo=createRotationGizmo({THREE,scene,camera,stage:$('stage'),canvas:renderer.domElement,isBusy:()=>busy,onStatus:status,onActive:renderContext,onNavigation:enabled=>{if(!enabled)controls.stopMotion();controls.enabled=enabled&&!sketchMode;},getFrameMode:()=>preferences.gizmoFrame,onFrameMode:mode=>{preferences.gizmoFrame=mode;savePreferencesOnly();},getAngleSnap:()=>preferences.angleSnap,onAngleSnap:value=>{preferences.angleSnap=value;savePreferencesOnly();},getLocalFrame:chosen=>faceFrame(chosen.find(i=>i.id===selection.at(-1)?.id)||chosen[0],selection.at(-1)),getFacePivot:()=>{const ref=selection.at(-1),face=selectedItem()?.faceInfo.find(f=>ref?.kind==='face'&&f.index===ref.index);return face?(ref.point||face.center):null;},
 onPreview:(ids,p)=>{const pivot=new THREE.Vector3(...p.center),rotation=new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...p.axisVector).normalize(),p.angle*Math.PI/180),matrix=new THREE.Matrix4().makeTranslation(...p.center).multiply(rotation).multiply(new THREE.Matrix4().makeTranslation(...pivot.negate().toArray()));for(const node of root.children)if(ids.includes(node.userData.itemId)){matrix.decompose(node.position,node.quaternion,node.scale);node.updateMatrixWorld(true);}},
 onCommit:async(ids,params)=>{const next=snapshot(),created=[];for(const id of ids){const feature={id:uid(),type:'rotate',name:'Rotate',params,inputs:[id]};next.features.push(feature);created.push(feature.id);}await rebuild(next);select(created.map(id=>({id,kind:'body'})));}
});
function savePreferencesOnly(){localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));}
alignGizmo=createPartAlignment({getPreviewItem:id=>(displayItems||items).find(i=>i.id===id),onStart:closePanels,onControls:source=>parameterGizmo.begin(source),stage:$('stage'),isBusy:()=>busy,getItems:()=>items.filter(i=>!(doc.ui.hidden||[]).includes(i.id)&&(!isolate||selectedIds().includes(i.id))),onStatus:status,
 onGuides:state=>{const guides=[];if(state?.method==='concentric')for(const slot of ['source','target']){const item=(displayItems||items).find(i=>i.id===state[slot]),c=item?.faceInfo.find(f=>f.index===state[slot+'Face']?.index)?.cylinder;if(c){const padding=Math.max(3,(c.max-c.min)*.2);guides.push({role:slot==='source'?'moving':'target',from:c.origin.map((v,i)=>v+c.axis[i]*(c.min-padding)),to:c.origin.map((v,i)=>v+c.axis[i]*(c.max+padding))});}}snapGuides.setAxes(guides);},
 onResetPreview:()=>{previewVersion++;if(displayItems){displayItems=null;render(true);}renderContext();},
 onRoles:(source,target)=>{selection=[source,target].filter(Boolean).map(id=>({id,kind:'body'}));render(true);renderContext();},
 onPreview:async(source,target,params,isCurrent)=>{const next=snapshot();next.features.push({id:'align_preview',type:'align',name:'Align preview',params,inputs:[source,target]});const result=await rpc('preview',{doc:next});if(isCurrent()){displayItems=result.map(i=>i.id==='align_preview'?{...i,id:source}:i);render(true);}},
 onCommit:async(source,target,params)=>{const id=await apply('align',params,[source,target]);select([{id,kind:'body'}]);}
});
parameterGizmo=createCanvasToolGizmo({THREE,scene,camera,stage:$('stage'),canvas:renderer.domElement,units:()=>({factor:unitFactorValue(),label:preferences.units}),snap:getSnapOptions,busy:()=>busy,fit,onActive:()=>{if(parameterGizmo?.active)$('empty').hidden=true;renderContext();},onStatus:status,onNavigation:enabled=>{if(!enabled)controls.stopMotion();controls.enabled=enabled&&!sketchMode;},onResetPreview:()=>resetDirectPreview(true),
 onPreview:async(params,isCurrent,source)=>{const change=featureChange(source.type,params,source.inputs(),source.editId||null,'gizmo_preview',source.reference?.());const result=await rpc('preview',{doc:change.next});if(isCurrent()){displayItems=result.map(i=>i.featureId===change.id?{...i,previewSelection:[{id:i.id,kind:i.kind}]}:i);if(source.allowSelection)displayItems.push(...items.filter(i=>i.kind==='sketch'&&!displayItems.some(p=>p.id===i.id)));render(true);}}
});
sketchToolSession=createSketchToolSession({THREE,scene,camera,stage:$('stage'),gizmo:parameterGizmo,sketchBar:$('sketchBar'),exitButton:$('finishSketch'),getDoc:()=>doc,getItems:()=>items,getSelection:()=>selection,getFrame:()=>basis(sketchMode?.params),units:()=>({factor:unitFactorValue(),label:preferences.units}),snapshot,uid,select,status,rebuild,fit,preview:next=>rpc('preview',{doc:next}),showPreview:result=>{displayItems=result;render(true);},resetPreview:()=>resetDirectPreview(true),committed:id=>{if(sketchMode)sketchMode.createdId=id;},end:()=>{if(sketchMode)sketchMode.editMode='select';refreshSketchHint();render(true);}});
function activateSketchOperation(type,editId=null){
 if(busy)return;if(type==='text'&&!editId){const feature=doc.features.find(f=>f.id===selectedItem()?.featureId);if(feature?.type==='sketch'&&feature.params.shape==='text')editId=feature.id;}
 if(!sketchMode){
  const item=selectedItem(),feature=editId?doc.features.find(f=>f.id===editId):doc.features.find(f=>f.id===item?.featureId),frame=feature?.params.basis||item?.sketchPlane;
  if(!frame){chooseSketchPlane(type);return;}
  beginDrawing({plane:'Selected face',basis:frame,shape:'rectangle',closed:true,width:30,height:20},{direct:true,preserveView:true});
 }
 parameterGizmo.cancel();sketchMode.editMode=type;refreshSketchHint();sketchToolSession.start(type,editId);controls.enabled=false;renderContext();
}
const faceHandle=direct.handle,faceDistance=direct.dimensions;
const faceDirection=()=>direct.direction(),gizmoTarget=()=>direct.target(),showFaceDistance=(value=0,operation)=>direct.begin(value,operation),updateFaceHandle=()=>{if(visualizer?.active){faceHandle.hidden=true;return;}direct.update();};
const cadDiagnostic=new URLSearchParams(location.search).has('diagnostics')?document.createElement('output'):null;
if(cadDiagnostic){cadDiagnostic.id='cadDiagnostic';cadDiagnostic.dataset.control='diagnostic';$('stage').append(cadDiagnostic);}
document.documentElement.dataset.cadBuild=typeof __CAD_BUILD__==='string'?__CAD_BUILD__:'dev';

// In-canvas editable sketch dimensions (persisted as parametric history edits).
const sketchDimensions=document.createElement('div');sketchDimensions.id='sketchDimensions';sketchDimensions.hidden=true;$('stage').append(sketchDimensions);
const dimensionLines=document.createElementNS('http://www.w3.org/2000/svg','svg');dimensionLines.id='sketchDimensionLines';dimensionLines.setAttribute('aria-hidden','true');sketchDimensions.append(dimensionLines);
let dimensionFeature=null,dimensionDocSource=null,dimensionDocCache=null;
function resolvedDimensionDoc(){if(dimensionDocSource!==doc){dimensionDocCache=resolveDimensionDocument(doc,basis);dimensionDocSource=doc;}return dimensionDocCache;}
function updateSketchDimensions(){
 const item=selectedItem(),ref=selection.at(-1);
 const feature=item?.kind==='sketch'&&ref?.kind==='sketch'?resolvedDimensionDoc().features.find(f=>f.id===item.featureId):null;
 const offsetSource=feature?.type==='sketchOffset'?doc.features.find(f=>f.id===feature.inputs[0]&&f.type==='sketch'&&f.params.shape==='circle'&&!f.params.operations?.length):null;
 if(!feature||(feature.type!=='sketch'&&!offsetSource)||busy||parameterGizmo?.active||direct.state.preview||Boolean(sketchMode?.editMode&&sketchMode.editMode!=='select')){sketchDimensions.hidden=true;dimensionFeature=null;return;}
 const p=offsetSource?{...offsetSource.params,shape:'annulus',innerRadius:Math.min(offsetSource.params.radius,offsetSource.params.radius+feature.params.distance),radius:Math.max(offsetSource.params.radius,offsetSource.params.radius+feature.params.distance)}:feature.params||{},shape=p.shape;
 const fields=shape==='arc'?[['sagitta','H',p.sagitta??10]]:shape==='annulus'?[['innerDiameter','Ø in',2*p.innerRadius],['outerDiameter','Ø out',2*p.radius]]:shape==='circle'?[['diameter','Ø',2*(p.radius??15)]]:
 ['rectangle','ellipse'].includes(shape)?[['width','W',p.width??40],['height','H',p.height??30]]:
 shape==='polygon'?[['radius','R',p.radius??15]]:[];
 if(shape==='polyline'&&Array.isArray(p.points)&&p.points.length>=2){
  const closed=Boolean(p.closed),count=p.points.length-(closed?0:1);
  for(let i=0;i<count;i++){const a=p.points[i],b=p.points[(i+1)%p.points.length],dx=b[0]-a[0],dy=b[1]-a[1];
   fields.push(['segmentLength:'+i,'L'+(i+1),Math.hypot(dx,dy)],['segmentAngle:'+i,'∠'+(i+1),Math.atan2(dy,dx)*180/Math.PI]);
  }
 }
 if(!fields.length&&shape!=='spline'){sketchDimensions.hidden=true;dimensionFeature=null;return;}

 const rect=$('stage').getBoundingClientRect(),bounds=item.bounds,center=new THREE.Vector3(...bounds[0].map((v,i)=>(v+bounds[1][i])/2)).project(camera);
 if(center.z < -1||center.z > 1){sketchDimensions.hidden=true;return;}
 const id=feature.id;
 const dimensionKey=id+JSON.stringify(p)+preferences.units+preferences.precision;if(dimensionFeature!==dimensionKey){dimensionFeature=dimensionKey;sketchDimensions.replaceChildren(dimensionLines);
 for(const [key,label,value] of fields){const wrap=document.createElement('label');wrap.textContent=label+' ';const input=document.createElement('input');input.type='number';input.step='any';input.value=String(Number((value/(key.startsWith('segmentAngle:')?1:unitFactorValue())).toFixed(preferences.precision)));input.dataset.original=input.value;input.dataset.dimension=key;input.setAttribute('aria-label',key.startsWith('segmentAngle:')?label+' angle in degrees':label+' dimension in '+preferences.units);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sketchDimensions.querySelector('button')?.click();}});input.inputMode='decimal';input.onfocus=()=>input.select();input.oninput=()=>{const button=sketchDimensions.querySelector('button');if(button)button.hidden=false;};wrap.dataset.dimensionLabel=key;wrap.append(input);sketchDimensions.append(wrap);}
 const applyButton=document.createElement('button');applyButton.hidden=true;applyButton.textContent='✓';applyButton.title='Apply dimensions';applyButton.setAttribute('aria-label','Apply sketch dimensions');applyButton.onclick=async()=>{
 if(offsetSource){const inner=Number(sketchDimensions.querySelector('[data-dimension=innerDiameter]').value)*unitFactorValue()/2,outer=Number(sketchDimensions.querySelector('[data-dimension=outerDiameter]').value)*unitFactorValue()/2;if(!Number.isFinite(inner)||!Number.isFinite(outer)||inner<=0||outer<=inner){status('Outer diameter must be greater than inner diameter');return;}const next=snapshot(),positive=feature.params.distance>=0;next.features.find(f=>f.id===offsetSource.id).params.radius=positive?inner:outer;next.features.find(f=>f.id===feature.id).params.distance=(positive?1:-1)*(outer-inner);try{await rebuild(next,{selectId:item.id});dimensionFeature=null;render();}catch(e){error(e);}return;}
 const updated={...feature.params};
 for(const input of sketchDimensions.querySelectorAll('input')){
  const key=input.dataset.dimension,n=Number(input.value)*(key.startsWith('segmentAngle:')?1:unitFactorValue());if(input.value===input.dataset.original)continue;
  if(input.value.trim()===''||!Number.isFinite(n)||(!['x','y','sagitta'].includes(key)&&!key.startsWith('segmentAngle:')&&n<=0)){status('Enter a valid dimension (size must be greater than zero)');input.focus();return;}
  if(key==='diameter')updated.radius=n/2;
  else if(key.startsWith('segment'))continue;
  else updated[key]=n;
 }
 if(shape==='polyline'){
  updated.points=p.points.map(pt=>[...pt]);updated.constraints=JSON.parse(JSON.stringify(p.constraints||[]));
  for(let i=0;i<p.points.length-(p.closed?0:1);i++)for(const [prefix,type,factor]of [['segmentLength:','length',unitFactorValue()],['segmentAngle:','angle',1]]){const input=sketchDimensions.querySelector('[data-dimension="'+prefix+i+'"]');if(!input||input.value===input.dataset.original)continue;const value=Number(input.value)*factor;if(!Number.isFinite(value)||(type==='length'&&value<=0)){status('Enter a valid sketch dimension');return;}const b=(i+1)%p.points.length;updated.constraints=updated.constraints.filter(c=>!(c.type===type&&c.a===i&&c.b===b));updated.constraints.push({type,a:i,b,value});}
 }
 try{const id=feature.id;await apply('sketch',updated,feature.inputs||[],id);dimensionFeature=null;render();}catch(e){error(e);}
 };sketchDimensions.append(applyButton);if(['arc','spline'].includes(shape)){const edit=document.createElement('button');edit.type='button';edit.setAttribute('aria-label','Edit curve points');edit.textContent='Edit points';edit.onclick=()=>startTool('sketch',{},feature.id);sketchDimensions.append(edit);}
 }
 layoutDimensions({THREE,basis,camera,stage:$('stage'),overlay:sketchDimensions,svg:dimensionLines,params:p});const curveEdit=sketchDimensions.querySelector('[aria-label="Edit curve points"]');if(curveEdit){curveEdit.style.position='absolute';curveEdit.style.left=Math.max(65,Math.min(rect.width-170,(center.x+1)*rect.width/2+15))+'px';curveEdit.style.top=Math.max(150,Math.min(rect.height-120,(1-center.y)*rect.height/2+35))+'px';}
}

function renderContext(){updateBooleanSelection();sketchToolSession?.update();updateSketchEditHUD();if($('stage'))$('stage').dataset.moreTools='false';const c=$('context');c.replaceChildren();const item=selectedItem();c.hidden=!!booleanSession||!item||!!parameterGizmo?.active||!!sketchMode||direct.state.preview||activeTool==='thread'||!!rotationGizmo?.active||!!moveGizmo?.active||!!alignGizmo?.active;if(!item)return;
 const picked=selection.at(-1),onFace=picked?.kind==='face'&&item.kind==='body',onEdge=picked?.kind==='edge'&&item.kind==='body',planarFace=onFace&&item.faceInfo.find(f=>f.index===picked.index)?.type==='PLANE';
 const commands=item.kind==='sketch'?[...(doc.features.find(f=>f.id===item.featureId)?.params.shape==='circle'?[['hole','Hole']]:[]),['extrude','Extrude'],['revolve','Revolve'],['sweep','Sweep']]:item.kind==='plane'?[['rectangle','Sketch on plane']]:item.kind==='axis'?[]:onEdge?[['fillet','Fillet'],['chamfer','Chamfer']]:onFace&&item.faceInfo.find(f=>f.index===picked.index)?.cylinder?[['thread','Thread'],['concentric','Concentric'],['align','Align'],['move','Move'],['scale','Scale']]:planarFace?[['offsetFace','Pull / Offset Face'],['extrude','Extrude'],['hole','Hole'],...(Math.abs(item.faceInfo.find(f=>f.index===picked.index)?.normal?.[2]||0)<.9?[['draft','Draft / Taper']]:[])]:[['move','Move'],['scale','Scale'],['pattern','Pattern'],...(onFace&&item.faceInfo.find(f=>f.index===picked.index)?.cylinder?[['thread','Thread']]:[]),['align','Align'],['rotate','Rotate'],['fillet','Fillet']];
 if(selection.length>=2&&selection.every(r=>r.kind==='body'))commands.unshift(['union','Union'],['subtract','Subtract'],['intersect','Intersect']);
 const summary=document.createElement('span');summary.className='selectionSummary';summary.title=selection.length>1?selection.length+' selected':'';summary.textContent=selection.length>1?selection.length+(selection.every(r=>r.kind==='body')?' bodies':' selected'):onEdge?'Edge':planarFace?'Planar face':onFace?(item.faceInfo.find(f=>f.index===picked.index)?.cylinder?'Cylindrical face':'Curved face'):item.kind==='body'?'Body':item.kind==='sketch'?'Sketch':'Construction';c.append(summary);
 if(planarFace){const project=document.createElement('button');project.dataset.control='context';project.setAttribute('aria-label','Project face to sketch');project.innerHTML=ico('sketch')+'<span>Project face</span>';project.title='Create an exact linked sketch from this planar face';project.onclick=async()=>{try{await apply('faceSketch',{distance:0},[picked.id],null,picked);status('Face projected to linked sketch · edit the source face in History to update its outline');}catch(e){error(e);}};c.append(project);}
 if(planarFace){const offset=document.createElement('button');offset.dataset.control='context';offset.setAttribute('aria-label','Offset Sketch');offset.innerHTML=ico('sketchOffset')+'<span>Offset Sketch</span>';offset.onclick=()=>startTool('faceSketch',referenceParams('faceSketch',{distance:0},picked));c.append(offset);}
 if(planarFace){const sketchFace=document.createElement('button');buttonLabel(sketchFace,'sketch','Sketch on face');sketchFace.querySelector('span').textContent='Sketch';sketchFace.onclick=()=>quickSketch('circle');c.append(sketchFace);}

 if(item.kind==='sketch'){const edit=document.createElement('button');buttonLabel(edit,'sketch','Edit sketch');edit.onclick=()=>{setWorkspaceMode('sketch');startTool(doc.features.find(f=>f.id===item.featureId)?.type||'sketch',{},item.featureId);};c.append(edit);}
 if(selection.length>1&&selection.every(s=>s.kind==='sketch')){for(const [operation,label]of [['Join','Profile'],['Intersect','Intersect']]){const button=document.createElement('button');button.dataset.control='context';button.setAttribute('aria-label',label==='Trim'?'Trim region':label);button.innerHTML=ico(operation==='Cut'?'subtract':'union')+'<span>'+label+'</span>';button.title=operation==='Cut'?'First profile minus the remaining profiles':'Combine closed profiles';button.onclick=()=>apply('sketchProfile',{operation},selectedIds()).catch(error);c.append(button);}}
 if(selection.length===1&&selection[0].kind==='sketch'&&(selectedItem()?.profileClosed||doc.features.find(f=>f.id===selectedItem()?.featureId)?.params.shape==='polyline')){const offset=document.createElement('button');offset.dataset.control='context';offset.setAttribute('aria-label','Offset sketch');offset.innerHTML=ico('sketchOffset')+'<span>Offset</span>';offset.onclick=()=>activateSketchEdit('offset');c.append(offset);}
 if(selection.length===1&&selection[0].kind==='sketch'){const dim=document.createElement('button');buttonLabel(dim,'measure','Smart Dimension');dim.onclick=()=>{try{smartDimensions.show();}catch(e){error(e);}};c.append(dim);}
 const deselect=document.createElement('button');deselect.dataset.control='context';deselect.setAttribute('aria-label','Deselect all');deselect.innerHTML=ico('close')+'<span>Deselect all</span>';deselect.onclick=()=>select([]);c.append(deselect);for(const [type,label]of commands.filter(([type])=>!toolSelectionError(type,selection,items,doc))){const b=document.createElement('button');buttonLabel(b,type,label);b.dataset.contextTool=type;if(type==='offsetFace')b.querySelector('span').textContent='Offset Face';if(type==='draft')b.querySelector('span').textContent='Draft';b.onclick=()=>type==='offsetFace'?showFaceDistance(0):startTool(type);c.append(b);}if(pickCandidates.length>1){const other=document.createElement('button');other.setAttribute('aria-label','Select other');other.innerHTML=ico('selectOther')+'<span>Select other</span>';other.onclick=showSelectionChoices;c.append(other);}const del=document.createElement('button');del.textContent='Delete';del.onclick=()=>apply('delete',{},selectedIds()).then(()=>select([])).catch(error);c.append(del);const more=document.createElement('button');more.dataset.control='context';more.setAttribute('aria-label','More tools');more.innerHTML=ico('tools')+'<span>More tools</span>';more.onclick=()=>{$('stage').dataset.moreTools='true';};c.append(more);workspaceChrome?.update();
}

function showSelectionChoices(){
 const dialog=document.createElement('dialog');dialog.className='selectionChoices';const heading=document.createElement('h2');heading.textContent='Select overlapping geometry';dialog.append(heading);
 for(const ref of pickCandidates){const item=items.find(i=>i.id===ref.id);if(!item)continue;const label=(ref.kind==='sketch'?'Sketch profile':ref.kind==='face'?'Solid face '+(ref.index+1):ref.kind==='edge'?'Edge':'Body')+' · '+item.name,b=document.createElement('button');b.innerHTML=ico(ref.kind==='sketch'?'sketch':'face')+'<span>'+esc(label)+'</span>';b.onclick=()=>{dialog.close();select([ref]);};dialog.append(b);}
 const cancel=document.createElement('button');cancel.innerHTML=ico('close')+'<span>Cancel</span>';cancel.onclick=()=>dialog.close();dialog.append(cancel);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
}

function select(next,extend=false){if(parameterGizmo?.active&&!parameterGizmo.allowSelection)closePanels();direct?.cancel();rotationGizmo?.cancel();moveGizmo?.cancel();snapGuides.hide();if(extend){for(const n of next){selection=selection.filter(s=>s.id!==n.id||!((s.kind==='body')!==(n.kind==='body')));const index=selection.findIndex(s=>s.id===n.id&&s.kind===n.kind&&s.index===n.index);if(index>=0)selection.splice(index,1);else selection.push(n);}}else selection=next;const picked=selection.at(-1),pickedItem=selectedItem();if(pickedItem){const desired=pickedItem.kind==='body'&&sketchMode?.editMode!=='sketchProject'?'solid':workspaceMode;if(desired!==workspaceMode)setWorkspaceMode(desired);}render();const i=selectedItem();if(i)status(i.name+(i.kind==='body'?' · '+i.volume.toFixed(2)+' mm³':' · '+i.kind));if(parameterGizmo?.active&&parameterGizmo.allowSelection)parameterGizmo.changed();}
$('multi').hidden=false;$('multi').setAttribute('aria-label','Multi-select bodies');$('multi').innerHTML=ico('multi')+'<span>Multi-select</span>';$('multi').onclick=()=>{const on=$('multi').getAttribute('aria-pressed')!=='true';$('multi').setAttribute('aria-pressed',String(on));$('pickMode').value=on?'body':'auto';if(on){select([...new Set(selection.filter(r=>items.some(i=>i.id===r.id&&i.kind==='body')).map(r=>r.id))].map(id=>({id,kind:'body'})));}status(on?'Tap bodies to add or remove them':'Multi-select off');};$('isolate').onclick=()=>{isolate=!isolate;$('isolate').classList.toggle('active',isolate);render();};
$('measure').onclick=async()=>{try{if(selection.length>=1&&selection.every(s=>s.kind==='sketch')){smartDimensions.show();return;}const selected=selectedIds();if(selection.length===2){const d=await rpc('measure',{ids:selected,refs:selection});status('Minimum distance: '+d.toFixed(3)+' mm');}else{const i=selectedItem();if(!i)throw Error('Select one or two bodies to measure');const ref=selection[0];if(ref?.kind==='edge'){status('Edge length: '+i.edges.find(e=>e.index===ref.index).length.toFixed(3)+' mm');return;}if(ref?.kind==='face'){status('Face area: '+i.faceInfo.find(f=>f.index===ref.index).area.toFixed(3)+' mm²');return;}const b=i.bounds,size=b[0].map((v,n)=>b[1][n]-v);status(size.map(n=>n.toFixed(3)).join(' × ')+' mm · area '+i.area.toFixed(2)+' mm² · volume '+i.volume.toFixed(2)+' mm³');}}catch(e){error(e);}};
const ray=new THREE.Raycaster();let pointerStart=null,touchCount=0,pickCandidates=[],penActive=false,lastPenAt=-Infinity,lastCanvasTap=null;
// A face control can appear under the finger after the first tap.
 // Recognize the second tap before the new control can consume it.
 $('stage').addEventListener('pointerdown',e=>{
  if(!e.target.closest?.('#faceDistance,#faceDragHandle')||!lastCanvasTap||sketchMode)return;
  const previous=lastCanvasTap;
  if(e.pointerType!==previous.type||performance.now()-previous.time>350||Math.hypot(e.clientX-previous.x,e.clientY-previous.y)>(e.pointerType==='touch'?24:12))return;
  e.preventDefault();e.stopImmediatePropagation();lastCanvasTap=null;pointerStart=null;touchCount=0;
  const full={id:previous.id,kind:'body'};select(promoteBodySelection(previous.before||selection,previous.id));pickCandidates=[full];
 },true);
const sketchTouches=new Map();let sketchTouchNavigation=false,sketchTouchPose=null,sketchTouchPointCount=0;
function sketchTouchState(){const pts=[...sketchTouches.values()];return{x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length,distance:pts.length>1?Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y):0};}
function sketchTouch(e,phase){if(e.pointerType!=='touch'||!sketchMode||penActive)return false;e.stopImmediatePropagation();controls.enabled=false;
 if(phase==='down'){if(!sketchTouches.size)sketchTouchPointCount=sketchMode.points.length;sketchTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);if(sketchTouches.size>1||performance.now()-lastPenAt<5000){sketchTouchNavigation=true;sketchMode.points.length=sketchTouchPointCount;pointerStart=null;draft=null;touchCount=0;drawingMeasure.hidden=true;clear(preview);}sketchTouchPose=sketchTouchState();return sketchTouchNavigation;}
 if(!sketchTouches.has(e.pointerId))return false;
 if(phase==='move'){sketchTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!sketchTouchNavigation)return false;const next=sketchTouchState(),prior=sketchTouchPose,unit=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight;if(prior){const offset=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-(next.x-prior.x)*unit).addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),(next.y-prior.y)*unit);camera.position.add(offset);controls.target.add(offset);if(prior.distance>5&&next.distance>5)camera.zoom=Math.max(.05,Math.min(100,camera.zoom*next.distance/prior.distance));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);controls.syncPose();}sketchTouchPose=next;return true;}
 const navigating=sketchTouchNavigation;sketchTouches.delete(e.pointerId);sketchTouchPose=sketchTouches.size?sketchTouchState():null;if(!sketchTouches.size){sketchTouchNavigation=false;controls.enabled=true;}if(navigating){touchCount=0;pointerStart=null;draft=null;}return navigating;
}
function cast(e){const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);ray.params.Line.threshold=(camera.top-camera.bottom)/camera.zoom/r.height*(e.pointerType==='touch'?14:e.pointerType==='pen'?8:6);}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(busy){pointerStart=null;return;}controls.stopMotion();if(sketchMode&&e.button!==0){pointerStart=null;return;}
 if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}
 if(e.pointerType==='pen'){penActive=true;lastPenAt=performance.now();touchCount=0;e.preventDefault();e.stopImmediatePropagation();controls.enabled=false;}
 if(sketchTouch(e,'down'))return;
 if(e.pointerType==='touch')touchCount++;
 const fingerNavigation=e.pointerType==='touch'&&sketchMode&&performance.now()-lastPenAt<5000;
 if(fingerNavigation)controls.enabled=true;
 if(touchCount>1){lastCanvasTap=null;pointerStart=null;draft=null;drawingMeasure.hidden=true;clear(preview);controls.enabled=true;return;}
 pointerStart={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};
 if(sketchMode&&!sketchMode.editMode&&!fingerNavigation&&touchCount<=1){cast(e);drawingDown(e);}
},true);
renderer.domElement.addEventListener('pointermove',e=>{if(sketchMode&&e.buttons&&!(e.buttons&1))return;if(sketchTouch(e,'move'))return;if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}if(e.pointerType==='pen'){e.preventDefault();e.stopImmediatePropagation();lastPenAt=performance.now();}if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5){pointerStart.moved=true;lastCanvasTap=null;}if(sketchMode&&!sketchMode.editMode&&touchCount<=1){cast(e);if(draft)drawingMove(e);else worldOnSketch(e);}},true);
renderer.domElement.addEventListener('pointerup',e=>{if(sketchMode&&e.button!==0)return;if(busy){pointerStart=null;touchCount=0;return;}if(e.pointerType==='touch'&&penActive){e.preventDefault();e.stopImmediatePropagation();return;}if(e.pointerType==='pen'){e.preventDefault();e.stopImmediatePropagation();penActive=false;lastPenAt=performance.now();}if(sketchTouch(e,'up'))return;const tap=pointerStart&&!pointerStart.moved&&touchCount<=1;if(sketchMode&&!sketchMode.editMode){if(tap&&draft&&!draft.poly){cast(e);const hit=ray.intersectObjects(root.children,true).find(h=>h.object.userData.kind==='sketch'||h.object.userData.itemKind==='sketch');if(draft.secondTap){finishDrag(e);}else if(hit){const id=hit.object.userData.id;sketchMode.createdId=id;select([{id,kind:'sketch'}]);draft=null;drawingMeasure.hidden=true;clear(preview);}else{draft.anchored=true;updateHistoryButtons();status('Tap the end point · drag also works');}}else if(draft)finishDrag(e);}else if(tap){cast(e);if(planePicker?.active){planePicker.pick(ray);pointerStart=null;if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);return;}
 if(sketchMode?.editMode==='trimEdge'){trimSketchAt(e).catch(err=>status(err.message));pointerStart=null;if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);return;}
 if(sketchMode?.editMode==='offset'){chooseOffsetSketchEdge(e);pointerStart=null;if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);return;}
 if(sketchToolSession?.active&&['text','sketchFillet','sketchChamfer'].includes(sketchMode?.editMode)){const p=worldOnSketch({...e,altKey:true});if(p){const frame=basis(sketchMode.params),y=skCross(frame.normal,frame.x),world=frame.origin.map((v,i)=>v+frame.x[i]*p[0]+y[i]*p[1]);sketchToolSession.pick(world,(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*22);}pointerStart=null;if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);return;}
 const mode=booleanSession?'body':sketchMode?.editMode==='sketchProject'?'auto':sketchMode?.editMode?'sketch':visualizer?.active?'body':$('pickMode').value,hits=ray.intersectObjects(root.children,true),front=hits.find(h=>h.object.isMesh&&h.object.userData.kind==='body'),tolerance=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*3;
 const isSketch=h=>h.object.userData.kind==='sketch'||h.object.userData.itemKind==='sketch',visible=h=>preferences.displayMode==='wireframe'||!front||h.distance<=front.distance+tolerance;
 let eligible=mode==='edge'?hits.filter(h=>h.object.isLineSegments&&h.object.userData.itemKind==='body'&&visible(h)):mode==='body'?hits.filter(h=>h.object.isMesh&&h.object.userData.kind==='body'):mode==='face'?hits.filter(h=>h.object.isMesh&&h.object.userData.kind==='body'):mode==='sketch'?hits.filter(h=>isSketch(h)&&visible(h)):hits.filter(h=>(isSketch(h)||h.object.isMesh||h.object.isLineSegments&&h.object.userData.itemKind==='body'&&(h.distanceToRay||0)<=(200/camera.zoom/renderer.domElement.clientHeight*(e.pointerType==='touch'?9:5)))&&visible(h));
 // Automatic selection follows the active workspace: solid faces first in Solid,
 // sketch profiles first in Sketch. Explicit selection filters remain authoritative.
 if(mode==='auto')eligible.sort((a,b)=>{
  const priority=h=>workspaceMode==='solid'?(h.object.isLineSegments&&h.object.userData.itemKind==='body'?4:h.object.isMesh&&h.object.userData.kind==='body'?3:isSketch(h)?(h.object.isMesh?2:1):0):(isSketch(h)&&h.object.isMesh?3:isSketch(h)?2:1);
  return priority(b)-priority(a)||a.distance-b.distance;
 });
 else if(mode==='sketch')eligible.sort((a,b)=>Number(isSketch(b)&&b.object.isMesh)-Number(isSketch(a)&&a.object.isMesh)||a.distance-b.distance);
 if(sketchMode?.editMode)eligible.sort((a,b)=>(items.find(i=>i.id===a.object.userData.id)?.area||Infinity)-(items.find(i=>i.id===b.object.userData.id)?.area||Infinity)||a.distance-b.distance);
 pickCandidates=[];const keys=new Set();for(const hit of eligible){const d=hit.object.userData,kind=isSketch(hit)?'sketch':mode==='body'?'body':d.kind==='edge'?'edge':'face',ref={id:d.id,kind,visible:visible(hit)};if(kind==='edge'){ref.index=d.index;ref.point=hit.point.toArray();}if(kind==='face'){const matched=d.faceGroups?.find(g=>hit.faceIndex*3>=g.start&&hit.faceIndex*3<g.start+g.count);if(!matched||!Number.isInteger(matched.faceIndex)||matched.faceIndex<0)continue;ref.index=matched.faceIndex;ref.point=hit.point.toArray();}if(parameterGizmo?.active&&parameterGizmo.allowSelection&&!items.some(i=>i.id===ref.id))continue;const key=[ref.id,ref.kind,ref.index].join(':');if(!keys.has(key)){keys.add(key);pickCandidates.push(ref);}}
 // Sketch profiles are selected before the host face in automatic mode; face remains in Select other.
 if(alignGizmo?.active){alignGizmo.pick(pickCandidates);parameterGizmo?.changed();lastCanvasTap=null;}else if(parameterGizmo?.active&&!parameterGizmo.allowSelection){status('Drag a handle, tap a dimension, or cancel this operation');}else{
 const now=performance.now(),bodyId=front?.object.userData.id;
 const doubleTap=bodyId&&!booleanSession&&mode!=='sketch'&&lastCanvasTap?.id===bodyId&&lastCanvasTap.type===e.pointerType&&now-lastCanvasTap.time<=350&&Math.hypot(e.clientX-lastCanvasTap.x,e.clientY-lastCanvasTap.y)<=(e.pointerType==='touch'?24:12);
 const candidate=doubleTap?{id:bodyId,kind:'body'}:pickCandidates[0],extend=extendCanvasSelection(selection,candidate,{explicit:e.shiftKey||e.metaKey||e.ctrlKey||$('multi').getAttribute('aria-pressed')==='true'||!!booleanSession,filter:mode});
 if(doubleTap){const full={id:bodyId,kind:'body'};select(promoteBodySelection(lastCanvasTap.before||selection,bodyId));pickCandidates=[full];lastCanvasTap=null;}
 else{const before=selection.map(r=>({...r}));if(pickCandidates.length)select([pickCandidates[0]],extend);else select([]);lastCanvasTap=bodyId?{id:bodyId,type:e.pointerType,time:now,x:e.clientX,y:e.clientY,before}:null;}
 }
 }
 if(e.pointerType==='touch')touchCount=Math.max(0,touchCount-1);if(e.pointerType==='pen')controls.enabled=!sketchMode;pointerStart=null;
},true);
renderer.domElement.addEventListener('pointercancel',()=>{sketchTouches.clear();sketchTouchNavigation=false;sketchTouchPose=null;lastCanvasTap=null;touchCount=0;penActive=false;controls.enabled=!sketchMode;pointerStart=null;draft=null;drawingMeasure.hidden=true;clear(preview);});
function fit(){const b=new THREE.Box3().setFromObject(root);if(b.isEmpty()){controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();return;}const size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),aspect=renderer.domElement.clientWidth/Math.max(1,renderer.domElement.clientHeight),direction=camera.position.clone().sub(controls.target).normalize();if(!direction.length())direction.set(1,-1,1).normalize();controls.target.copy(c);camera.position.copy(c).addScaledVector(direction,Math.max(250,size.length()*2));camera.far=Math.max(10000,size.length()*10);controls.update();camera.updateMatrixWorld(true);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}camera.zoom=Math.max(.02,Math.min(40,200*aspect*.72/Math.max(maxX-minX,1),200*.70/Math.max(maxY-minY,1)));if(visualizer?.active&&visualizer.inspectorVisible){const w=renderer.domElement.clientWidth,h=renderer.domElement.clientHeight,left=w>760?174:64,right=w>760?356:56;camera.zoom*=Math.max(140,w-left-right)/w;camera.setViewOffset(w,h,(right-left)/2,0,w,h);}else camera.clearViewOffset();camera.updateProjectionMatrix();controls.update();}
async function leaveSketchForView(){if(!sketchMode)return true;if(parameterGizmo?.active&&parameterGizmo.source?.type!=='sketchProfile'){status('Apply or cancel the current sketch operation before changing to 3D');return false;}if(sketchMode.points.length===1){status('Complete the current sketch segment before changing to 3D');return false;}await $('finishSketch').onclick();return !sketchMode;}
async function view(name){if(sketchMode){const n=new THREE.Vector3(...basis(sketchMode.params).normal),d=new THREE.Vector3(...cubeDirection(name)).normalize();if(Math.abs(n.dot(d))<.999999&&!await leaveSketchForView())return;}document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));const c=controls.target.clone(),d=300,dir=cubeDirection(name);$('viewCube').dataset.orientation=name;camera.up.set(0,0,1);if(Math.abs(dir[2])===1&&dir[0]===0&&dir[1]===0)camera.up.set(0,1,0);camera.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(d));controls.syncPose();camera.updateMatrixWorld(true);updateFaceHandle();rotationGizmo?.update();moveGizmo?.update();worldReference.update();}
const orientationCube=createOrientationCube({THREE,camera,controls,root:$('viewCube'),onView:view,onOrbit:leaveSketchForView});
$('fit').onclick=fit;document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
function resize(){const r=$('canvas').getBoundingClientRect(),aspect=r.width/Math.max(1,r.height);camera.left=-100*aspect;camera.right=100*aspect;camera.top=100;camera.bottom=-100;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);if(visualizer?.active)fit();}
new ResizeObserver(resize).observe($('canvas'));resize();function frame(){
 requestAnimationFrame(frame);
 controls.update();parameterGizmo?.update();visualizer?.update();planePicker?.update();orientationCube.update(preferences.theme);worldReference.update();rotationGizmo?.update();moveGizmo?.update();snapGuides.update();sketchToolSession?.update();workspaceChrome?.update();
 if(cadDiagnostic){const text='Build '+document.documentElement.dataset.cadBuild+' · '+(selection.at(-1)?.kind||'none')+' · gizmo '+(gizmoTarget()?'ON':'OFF')+' · preview '+Boolean(displayItems);if(cadDiagnostic.textContent!==text)cadDiagnostic.textContent=text;}
 try{updateFaceHandle();}catch(e){console.error('Face gizmo render failed',e);faceHandle.hidden=true;}
 try{smartDimensions?.update();updateSketchDimensions();}catch(e){console.error('Sketch dimensions render failed',e);sketchDimensions.hidden=true;}
 renderer.render(scene,camera);
}frame();
function cachedSketchGuidepoints(plane){const key=JSON.stringify([plane,doc.ui.hidden||[],isolate?selectedIds():null,sketchMode.points]);if(sketchSnapCache?.items===items&&sketchSnapCache.key===key){sketchSnapStats.hits++;return sketchSnapCache.points;}sketchSnapStats.builds++;const points=sketchGuidepoints(isolate?items.filter(i=>selectedIds().includes(i.id)):items,plane,{hidden:doc.ui.hidden||[],draftPoints:sketchMode.points});sketchSnapCache={items,key,points};return points;}
let sketchSnapCache=null;const sketchSnapStats={hits:0,builds:0};
function worldOnSketch(event){
 const b=basis(sketchMode.params),normal=new THREE.Vector3(...b.normal),plane=new THREE.Plane(normal,-normal.dot(new THREE.Vector3(...b.origin))),hit=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,hit))return null;
 const x=new THREE.Vector3(...b.x).normalize(),y=normal.clone().cross(x).normalize(),delta=hit.sub(new THREE.Vector3(...b.origin)),raw=[delta.dot(x),delta.dot(y)];
 if(!preferences.snap||event?.altKey){snapGuides.hide();return raw;}
 const threshold=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*10,points=preferences.snapGeometry?cachedSketchGuidepoints(b):[],closest=nearestGuidepoint(raw,points,threshold),snapped=closest?.point||(preferences.snapGrid?raw.map(v=>Math.round(v/gridStep)*gridStep):raw),world=new THREE.Vector3(...b.origin).addScaledVector(x,snapped[0]).addScaledVector(y,snapped[1]).toArray();
 if(closest||preferences.snapGrid)snapGuides.show({point:world,label:closest?.label||'Grid '+gridStep+' mm',kind:closest?.kind||'grid',showGuides:preferences.snapGuides,showHints:preferences.snapHints});else snapGuides.hide();return snapped;
}
function hasSessionProfiles(){return !!sketchMode&&(!!sketchMode.createdId&&doc.features.some(f=>f.id===sketchMode.createdId)||!!sketchMode.startDoc&&doc.features.some(f=>(f.type.startsWith('sketch')||f.type==='faceSketch')&&!sketchMode.startDoc.features.some(prior=>prior.id===f.id)));}
function refreshSketchHint(){
 if(!sketchMode||!$('sketchHint'))return;
 const mode=sketchMode.editMode;
 syncSketchStart();
 if($('sketchTrimHUD'))$('sketchTrimHUD').hidden=mode!=='trimEdge';
 if($('sketchEditHUD')&&!['offset','profile'].includes(mode))$('sketchEditHUD').hidden=true;
 if(mode)snapGuides.hide();
 controls.enabled=!['offset','profile'].includes(mode);
 $('sketchHint').title=mode==='trimEdge'?'Trim · tap segments between intersections':
 mode==='offset'?'Offset Edge · select edge or chain, enter distance':
 mode==='profile'?'Profile · select closed profiles to join or intersect':
 sketchOperationTypes.has(mode)||mode==='text'?({sketchMirror:'Mirror',sketchPattern:'Pattern',sketchProject:'Project',sketchTransform:'Move / Rotate',sketchFillet:'Fillet',sketchChamfer:'Chamfer',text:'Text'}[mode])+' · select geometry and adjust the gizmo':
 mode==='select'?'Select sketch geometry · tap to edit dimensions':
 sketchMode.params.shape+' · '+(sketchMode.params.plane||'selected face')+' · '+(['polyline','spline'].includes(sketchMode.params.shape)?'Tap points · tap first to close':'Drag or tap start → end');
 $('sketchHint').textContent=({trimEdge:'Trim',offset:'Offset',profile:'Profile',select:'Select sketch geometry',sketchMirror:'Mirror',sketchPattern:'Pattern',sketchProject:'Project',sketchTransform:'Move / Rotate',sketchFillet:'Fillet',sketchChamfer:'Chamfer',text:'Text'}[mode]||sketchMode.params.shape.replace(/^./,c=>c.toUpperCase()))+' · '+(sketchMode.params.plane||'Face');
 $('sketchBar').setAttribute('aria-label',$('sketchHint').title);
}
function sketchEditRefs(){return selection.filter(ref=>ref.kind==='sketch'&&items.some(item=>{if(item.id!==ref.id)return false;if(sketchMode&&!sameSketchPlane(item.sketchPlane,basis(sketchMode.params)))return false;if(item.profileClosed)return true;return sketchMode?.editMode==='offset'&&item.kind==='sketch'&&!item.construction;}));}
function updateSketchEditHUD(){const hud=$('sketchEditHUD');if(!hud||hud.hidden)return;const action=sketchMode?.editMode,refs=sketchEditRefs();hud.querySelector('output').textContent=refs.length+' selected';hud.querySelector('[data-apply]').disabled=busy||(action==='offset'?refs.length<1:refs.length<2);hud.querySelector('[data-offset] input').disabled=action==='offset'&&!refs.length;for(const button of document.querySelectorAll('[data-sketch-edit]'))button.setAttribute('aria-pressed',String(button.dataset.sketchEdit===action));}
// Sketch coordinates are kept exact in the originating plane. A coplanar
// sketch may have a different origin and XY basis, e.g. projected body faces.
const skDot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const skCross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function sameSketchPlane(a,b){
 const delta=a.origin.map((v,i)=>v-b.origin[i]);
 return Math.abs(skDot(delta,b.normal))<.0001&&Math.abs(skDot(a.normal,b.normal))>.9999;
}
function sketchPointToFrame(point,from,to){
 const y=skCross(from.normal,from.x),ty=skCross(to.normal,to.x);
 const world=from.origin.map((v,i)=>v+from.x[i]*point[0]+y[i]*point[1]);
 const d=world.map((v,i)=>v-to.origin[i]);
 return[skDot(d,to.x),skDot(d,ty)];
}
function nearestLineOnSketch(p,point){
 const pts=geometryPoints(p),length=closedGeometry(p)?pts.length:pts.length-1;
 let best={distance:Infinity,index:-1};
 for(let i=0;i<length;i++){
  const a=pts[i],b=pts[(i+1)%pts.length],v=[b[0]-a[0],b[1]-a[1]],den=skDot(v,v);
  if(den<1e-10)continue;
  const t=Math.max(0,Math.min(1,skDot([point[0]-a[0],point[1]-a[1]],v)/den));
  const d=Math.hypot(point[0]-a[0]-v[0]*t,point[1]-a[1]-v[1]*t);
  if(d<best.distance)best={distance:d,index:i};
 }
 return best;
}
function sketchEditableCandidates(event){
 if(!sketchMode)return[];
 const active=basis(sketchMode.params),at=worldOnSketch({...event,altKey:true});
 if(!at)return[];
 const tolerance=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*(event.pointerType==='touch'?18:12);
 const visibleSketches=new Set(items.filter(item=>item.kind==='sketch').map(item=>item.featureId||item.id));
 return doc.features.filter(f=>visibleSketches.has(f.id)&&f.type==='sketch'&&(sketchMode.editMode==='trimEdge'?['polyline','rectangle','circle','arc']:['polyline','rectangle','circle','arc']).includes(f.params.shape)&&!(doc.ui.hidden||[]).includes(f.id))
 .flatMap(f=>{try{
  const b=basis(f.params);if(!sameSketchPlane(b,active))return[];
  const p=sketchPointToFrame(at,active,b),near=['circle','arc'].includes(f.params.shape)?nearestCircularSketch(f.params,p):nearestLineOnSketch(f.params,p);
  return near.distance<=tolerance?[{f,p,b,near}]:[];
 }catch{return[];} }).sort((a,b)=>a.near.distance-b.near.distance);
}
function visibleSketchCurves(){return items.filter(item=>item.kind==='sketch'&&!item.regionParent&&!(doc.ui.hidden||[]).includes(item.id)&&sameSketchPlane(item.sketchPlane,basis(sketchMode.params)));}
async function trimNativeSketchAt(event){
 const frame=basis(sketchMode.params),point=worldOnSketch({...event,altKey:true});if(!point)return;
 const pixel=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight,tolerance=pixel*(event.pointerType==='touch'?18:12),curves=visibleSketchCurves(),y=[frame.normal[1]*frame.x[2]-frame.normal[2]*frame.x[1],frame.normal[2]*frame.x[0]-frame.normal[0]*frame.x[2],frame.normal[0]*frame.x[1]-frame.normal[1]*frame.x[0]],candidates=[];
 for(const item of curves){let distance=Infinity;for(const e of item.edges||[]){if(!e.lines||e.lines.length<6||e.lines.length%3!==0||!Array.from(e.lines).every(Number.isFinite))continue;const points=[];for(let i=0;i<e.lines.length;i+=3){const delta=e.lines.slice(i,i+3).map((v,j)=>v-frame.origin[j]);points.push([skDot(delta,frame.x),skDot(delta,y)]);}distance=Math.min(distance,nearestLineOnSketch({shape:'polyline',points,closed:false},point).distance);}if(distance<=tolerance)candidates.push({item,distance});}
 candidates.sort((a,b)=>a.distance-b.distance);if(!candidates.length){status('Trim · tap a visible sketch curve');return;}
 if(candidates.length>1&&Math.abs(candidates[0].distance-candidates[1].distance)<pixel*.5)throw Error('Multiple sketch edges overlap here. Tap away from the intersection or isolate a sketch.');
 const source=candidates[0].item,b=source.sketchPlane,p=sketchPointToFrame(point,frame,b),id=uid(),next=snapshot();next.features.push({id,type:'sketchTrim',name:'Trim curve',params:{point:p,tolerance},inputs:[source.id,...curves.filter(i=>i.id!==source.id).map(i=>i.id)]});await rebuild(next,{selectId:id});if(sketchMode){sketchMode.editMode='trimEdge';sketchMode.createdId=items.some(i=>i.id===id)?id:null;}status('Trimmed native curve · tap another segment or Done');
}
async function trimSketchAt(event){return trimNativeSketchAt(event);}
async function activateSketchTrim(){
 if(busy)return;
 parameterGizmo?.cancel();
 try{
  if(!sketchMode){
   const item=selectedItem(),f=doc.features.find(f=>f.id===item?.featureId);
   if(item?.kind!=='sketch'||f?.type!=='sketch'){status('Start Sketch or select a straight sketch profile before Trim');return;}
   beginDrawing({...f.params,basis:item.sketchPlane},{direct:true,preserveView:false});
   sketchMode.createdId=f.id;
  }
  await commitSketchPath();draft=null;clear(preview);drawingMeasure.hidden=true;
  if($('sketchEditHUD'))$('sketchEditHUD').hidden=true;
  sketchMode.editMode='trimEdge';
  let hud=$('sketchTrimHUD');
  if(!hud){hud=document.createElement('div');hud.id='sketchTrimHUD';hud.dataset.control='sketch-trim';
   hud.innerHTML='<button type="button" aria-label="Done trimming">Done</button>';
   hud.querySelector('button').onclick=stopSketchTrim;$('sketchBar').insertBefore(hud,$('finishSketch'));
  }
  hud.hidden=false;render(true);workspaceChrome?.update();
  refreshSketchHint();status('Trim · tap the segment between intersections; Escape exits Trim');
 }catch(e){error(e);}
}
function stopSketchTrim(){
 if($('sketchTrimHUD'))$('sketchTrimHUD').hidden=true;
 if(sketchMode?.editMode==='trimEdge')sketchMode.editMode='select';refreshSketchHint();
 render(true);workspaceChrome?.update();
}
function chooseOffsetSketchEdge(event){
 const hud=$('sketchEditHUD');if(!hud)return;
 const candidates=sketchEditableCandidates(event);
 if(!candidates.length){
  const plane=basis(sketchMode.params),at=worldOnSketch({...event,altKey:true}),tolerance=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*(event.pointerType==='touch'?18:12);
  if(!at)return;
  for(const item of items){const f=doc.features.find(f=>f.id===item.featureId);if(!f||item.kind!=='sketch'||item.regionParent||f.type==='sketch'&&['polyline','rectangle','circle','arc'].includes(f.params.shape)&&!f.params.operations?.length&&!f.params.serializedDrawing||item.regionHost||(doc.ui.hidden||[]).includes(item.id)||!sameSketchPlane(item.sketchPlane,plane))continue;let distance=Infinity;for(const edge of item.edges||[]){if(!edge.lines||edge.lines.length<6||edge.lines.length%3!==0||!Array.from(edge.lines).every(Number.isFinite))continue;const pts=[];for(let i=0;i<edge.lines.length;i+=3){const w=edge.lines.slice(i,i+3),v=w.map((n,k)=>n-plane.origin[k]),y=[plane.normal[1]*plane.x[2]-plane.normal[2]*plane.x[1],plane.normal[2]*plane.x[0]-plane.normal[0]*plane.x[2],plane.normal[0]*plane.x[1]-plane.normal[1]*plane.x[0]];pts.push([skDot(v,plane.x),skDot(v,y)]);}distance=Math.min(distance,nearestLineOnSketch({shape:'polyline',points:pts,closed:false},at).distance);}if(distance<=tolerance)candidates.push({f,near:{distance,index:0}});}
  candidates.sort((a,b)=>a.near.distance-b.near.distance);
 }
 if(!candidates.length){status('Offset · tap a sketch edge');return;}
 const {f,near}=candidates[0],mode=hud.querySelector('[data-offset-type] select').value;
 const at=worldOnSketch({...event,altKey:true}),frame=basis(sketchMode.params),y=skCross(frame.normal,frame.x);offsetPick={id:f.id,point:frame.origin.map((v,i)=>v+frame.x[i]*at[0]+y[i]*at[1])};offsetAnchorCache=null;
 hud.dataset.edgeIndex=String(near.index);
 const eligible=items.filter(i=>!(doc.ui.hidden||[]).includes(i.id)&&doc.features.some(v=>v.id===i.featureId));
 const ids=mode==='Single'?[f.id]:[...new Set([...sketchEditRefs().map(r=>r.id),...connectedSketchIds(eligible,f.id)])];
 select(ids.map(id=>({id,kind:'sketch'})));
 hud.querySelector('output').textContent=mode==='Single'?'Edge '+(near.index+1)+' selected':ids.length+' profiles selected';
 parameterGizmo?.changed();
}
let offsetPick=null,offsetAnchorCache=null;
function offsetGeometry(params){
 const refs=sketchEditRefs(),item=items.find(i=>i.id===(refs.some(r=>r.id===offsetPick?.id)?offsetPick.id:refs.at(-1)?.id));
 if(!item)return null;
 const pick=offsetPick?.id===item.id?offsetPick.point:null;
 if(!offsetAnchorCache||offsetAnchorCache.item!==item||offsetAnchorCache.pick!==pick||offsetAnchorCache.mode!==params.mode){
  const frame=item.sketchPlane,n=new THREE.Vector3(...frame.normal),x=new THREE.Vector3(...frame.x),centre=new THREE.Vector3(...item.bounds[0].map((v,i)=>(v+item.bounds[1][i])/2));let best=null;
  for(const edge of item.edges||[]){if(!edge.lines||edge.lines.length<6||edge.lines.length%3!==0||!Array.from(edge.lines).every(Number.isFinite))continue;for(let i=3;i<edge.lines.length;i+=3){
   const a=new THREE.Vector3(...edge.lines.slice(i-3,i)),b=new THREE.Vector3(...edge.lines.slice(i,i+3)),v=b.clone().sub(a);if(v.lengthSq()<1e-12)continue;
   const point=pick?a.clone().addScaledVector(v,Math.max(0,Math.min(1,new THREE.Vector3(...pick).sub(a).dot(v)/v.lengthSq()))):a.clone().add(b).multiplyScalar(.5),score=pick?point.distanceToSquared(new THREE.Vector3(...pick)):-point.dot(x);
   if(best&&score>=best.score)continue;
   const direction=n.clone().cross(v).normalize();if(item.profileClosed&&params.mode!=='Single'&&direction.dot(point.clone().sub(centre))<0)direction.negate();best={point,direction,score};
  }
  }
  offsetAnchorCache={item,pick,mode:params.mode,...(best||{point:centre,direction:x})};
 }
 const {point,direction}=offsetAnchorCache;
 return{origin:point.clone().addScaledVector(direction,params.distance).toArray(),direction:direction.toArray(),coefficient:1,kind:'linear',unit:'mm'};
}
function offsetPlan(params,previewOnly=false){
 const refs=sketchEditRefs(),ids=[...new Set(refs.map(r=>r.id))];if(!ids.length)throw Error('Select a sketch edge or profile');
 const next=snapshot(),remaining=new Set(ids),created=[],chosen=items.filter(i=>ids.includes(i.id));
 while(remaining.size){const seed=remaining.values().next().value,group=params.mode==='Single'?[seed]:connectedSketchIds(chosen,seed).filter(id=>remaining.has(id));for(const id of group)remaining.delete(id);const id=previewOnly?'sketch_offset_preview_'+created.length:uid();created.push(id);next.features.push({id,type:'sketchOffset',name:'Offset chain',params:{...params,keepInputs:true},inputs:group});}
 return{next,created};
}
async function activateSketchEdit(action){
 if(action==='trim')return activateSketchTrim();if(busy)return;parameterGizmo?.cancel();if($('sketchTrimHUD'))$('sketchTrimHUD').hidden=true;
 try{
  if(!sketchMode){const ref=selection.at(-1),item=items.find(i=>i.id===ref?.id);if(item?.kind!=='sketch'||action!=='offset'&&!item.profileClosed){status('Start a sketch or select a suitable sketch profile');return;}const feature=doc.features.find(f=>f.id===item.featureId);beginDrawing({...feature.params,basis:item.sketchPlane,shape:feature.params.shape||'rectangle'},{direct:true,preserveView:true});sketchMode.createdId=item.id;}
  await commitSketchPath();draft=null;clear(preview);drawingMeasure.hidden=true;sketchMode.editMode=action;refreshSketchHint();controls.enabled=false;offsetPick=null;offsetAnchorCache=null;
  let hud=$('sketchEditHUD');
  if(!hud){
   hud=document.createElement('section');hud.id='sketchEditHUD';hud.dataset.control='sketch-edit';hud.setAttribute('aria-label','Sketch profile editing');
   hud.innerHTML='<strong></strong><output aria-live="polite"></output><label data-offset-type>Type <select aria-label="Offset edge type"><option>Chain</option><option>Single</option></select></label><label data-offset>Offset <input name="distance" aria-label="Offset distance" type="number" value="1" min="-500" max="500" step="any"> <span data-unit></span></label><label data-operation>Profile <select aria-label="Profile operation"><option>Join</option><option>Intersect</option></select></label><button type="button" data-apply aria-label="Apply sketch edit">✓</button><button type="button" data-close aria-label="Close sketch edit">×</button>';$('stage').append(hud);
   hud.querySelector('[data-close]').onclick=()=>{parameterGizmo?.cancel(false);hud.hidden=true;if(sketchMode)sketchMode.editMode='select';refreshSketchHint();render(true);};
   hud.querySelector('[data-offset-type] select').onchange=()=>{hud.dataset.edgeIndex='0';offsetAnchorCache=null;if(hud.querySelector('[data-offset-type] select').value==='Single'&&selection.length>1)select([selection.at(-1)]);};
  }
  hud.hidden=false;hud.querySelector('[data-unit]').textContent=preferences.units;hud.querySelector('strong').textContent=action==='offset'?'Offset':'Profile';
  hud.querySelector('[data-offset]').hidden=action!=='offset';hud.querySelector('[data-offset-type]').hidden=action!=='offset';hud.querySelector('[data-operation]').hidden=action==='offset';hud.querySelector('[data-operation] select').value='Join';
  const read=()=>{
   if(action!=='offset')return{operation:hud.querySelector('[data-operation] select').value};
   const raw=hud.querySelector('[data-offset] input').value,distance=Number(raw)*unitFactorValue();if(!raw.trim()||!Number.isFinite(distance)||Math.abs(distance)<1e-7||Math.abs(distance)>500)throw Error('Enter a non-zero offset distance within 500 mm');
   return{distance,mode:hud.querySelector('[data-offset-type] select').value,edgeIndex:Number(hud.dataset.edgeIndex||0)};
  };
  const commit=async()=>{
   const params=read(),refs=sketchEditRefs();if(action!=='offset'&&refs.length<2)throw Error('Select at least two closed profiles');
   let created;if(action==='offset'){const plan=offsetPlan(params);await rebuild(plan.next);created=plan.created;}else created=[await apply('sketchProfile',params,refs.map(r=>r.id))];
   sketchMode.createdId=created.at(-1);sketchMode.editMode='select';hud.hidden=true;refreshSketchHint();select(created.map(id=>({id,kind:'sketch'})));render(true);
  };
  hud.querySelector('[data-apply]').onclick=()=>commit().catch(error);
  if(action!=='offset')select([]);else if(!sketchEditRefs().length&&sketchMode.createdId){const item=items.find(i=>i.id===sketchMode.createdId&&(i.profileClosed||doc.features.find(f=>f.id===i.featureId)?.params.shape==='polyline'));if(item)select([{id:item.id,kind:'sketch'}]);}
  updateSketchEditHUD();
  parameterGizmo.begin({type:action==='offset'?'sketchOffset':'sketchProfile',title:action==='offset'?'Offset':'Profile',host:hud,compact:true,actionHost:$('sketchBar'),actionBefore:$('finishSketch'),fields:[{name:'distance',label:'Offset',factor:unitFactorValue()}],read,apply:hud.querySelector('[data-apply]'),cancel:hud.querySelector('[data-close]'),status:hud.querySelector('output'),allowSelection:true,geometry:action==='offset'?(_key,params)=>offsetGeometry(params):null,preview:action==='offset',onPreview:async(params,isCurrent)=>{if(!sketchEditRefs().length){if(isCurrent())resetDirectPreview(true);return;}const {next}=offsetPlan(params,true),result=await rpc('preview',{doc:next});if(isCurrent()){displayItems=result;render(true);}},commit,onCancel:()=>hud.querySelector('[data-close]').onclick()});
  status(action==='offset'?'Offset · select an edge, drag the arrow or type a distance':'Select profiles, then Apply');render(true);
 }catch(e){error(e);}
}
async function commitSketchPath(closed=false){
 const current=sketchMode;if(!current||current.points.length<2)return;if(current.params.shape==='arc'){if(current.points.length<3)throw Error('Complete the three-point arc or cancel the sketch');const [a,b,c]=current.points;current.params={...current.params,...(current.params.startMode==='centerArc'?centerPointArc(a,b,c):threePointArc(a,b,c))};current.points=[];current.createdId=await apply('sketch',current.params,[]);draft=null;clear(preview);return;}
 splinePreviewSession++;splinePreviewPending=null;current.createdId=await apply('sketch',{...current.params,closed:closed||current.params.closed,points:current.points,x:0,y:0},[]);
 current.points=[];current.redoPoints=[];draft=null;drawingMeasure.hidden=true;clear(preview);updateHistoryButtons();
}
async function selectSketchProfiles(){
 if(!sketchMode)return;parameterGizmo?.cancel();try{await commitSketchPath();sketchMode.editMode='select';refreshSketchHint();draft=null;drawingMeasure.hidden=true;clear(preview);if($('sketchEditHUD'))$('sketchEditHUD').hidden=true;render(true);workspaceChrome?.update();status('Tap a profile to select and edit dimensions · tap again to deselect');}catch(e){error(e);}
}
async function quickSketch(shape){
 if(!ready||busy)return;try{const previous=sketchMode,ref=selection.at(-1),plane=previous?null:planeFromSelection(),saved=previous?.params,base=saved?{plane:saved.plane,offset:saved.offset,basis:saved.basis,hostBody:saved.hostBody,hostFace:saved.hostFace}:plane?{plane:'Selected face',basis:plane,hostBody:ref.id,hostFace:ref.index}:chosenSketchPlane||{plane:'XY'};
  await commitSketchPath();const createdId=previous?.createdId;endDrawing();beginDrawing({...base,shape,closed:!['polyline','arc','spline'].includes(shape),sides:6,sagitta:10},{direct:true,preserveView:!!previous});if(previous?.direct){sketchMode.startDoc=previous.startDoc;sketchMode.startUndo=previous.startUndo;sketchMode.startRedo=previous.startRedo;sketchMode.createdId=createdId;}
 }catch(e){error(e);}
}
function beginDrawing(p,{direct:directSession=false,preserveView=false}={}){splinePreviewSession++;splinePreviewPending=null;p={...p,startMode:p.startMode||preferences.sketchStartModes?.[p.shape]||defaultStart(p.shape)};if(p.shape==='spline')p.splineMode=p.splineMode||(p.startMode==='control'?'Control':'Fit');if(!preserveView&&!p.basis&&p.plane!=='Selected face'){camera.zoom=Math.min(camera.zoom,5);camera.updateProjectionMatrix();}setWorkspaceMode('sketch');if(p.shape==='polyline')p={...p,constraints:[]};closePanels();sketchMode={params:p,points:[],redoPoints:[],direct:directSession,createdId:null,startDoc:directSession?snapshot():null,startUndo:[...undo],startRedo:[...redo]};renderContext();controls.enabled=true;controls.enableRotate=false;controls.mouseButtons.LEFT=null;$('sketchBar').hidden=false;syncSketchStart();refreshSketchHint();const b=basis(p),n=new THREE.Vector3(...b.normal),origin=new THREE.Vector3(...b.origin);grid.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);grid.position.copy(origin).addScaledVector(n,-.03);if(!preserveView){
  const bx=new THREE.Vector3(...b.x),by=n.clone().cross(bx).normalize(),ranges=[Infinity,-Infinity,Infinity,-Infinity];
  for(const item of items){if(item.kind!=='sketch'||!item.bounds||!item.sketchPlane||!sameSketchPlane(item.sketchPlane,b))continue;
   for(const wx of item.bounds[0][0]===item.bounds[1][0]?[item.bounds[0][0]]:[item.bounds[0][0],item.bounds[1][0]])
   for(const wy of item.bounds[0][1]===item.bounds[1][1]?[item.bounds[0][1]]:[item.bounds[0][1],item.bounds[1][1]])
   for(const wz of item.bounds[0][2]===item.bounds[1][2]?[item.bounds[0][2]]:[item.bounds[0][2],item.bounds[1][2]]){
    const delta=new THREE.Vector3(wx,wy,wz).sub(origin),u=delta.dot(bx),v=delta.dot(by);
    ranges[0]=Math.min(ranges[0],u);ranges[1]=Math.max(ranges[1],u);
    ranges[2]=Math.min(ranges[2],v);ranges[3]=Math.max(ranges[3],v);
   }
  }
  const focus=origin.clone();
  if(Number.isFinite(ranges[0])){
   focus.addScaledVector(bx,(ranges[0]+ranges[1])/2).addScaledVector(by,(ranges[2]+ranges[3])/2);
   const width=Math.max(10,ranges[1]-ranges[0]),height=Math.max(10,ranges[3]-ranges[2]),margin=1.65;
   const fitZoom=Math.min((camera.right-camera.left)/(width*margin),(camera.top-camera.bottom)/(height*margin));
   camera.zoom=Math.max(.05,Math.min(12,fitZoom));
   camera.updateProjectionMatrix();
  }
  controls.target.copy(focus);camera.up.set(0,0,1);if(Math.abs(n.z)>.9)camera.up.set(0,1,0);
  camera.position.copy(focus).addScaledVector(n,300);controls.syncPose();
 }camera.updateMatrixWorld(true);render(true);status('Sketch active · snap '+gridStep+' mm');}
function drawingDown(event){const p=worldOnSketch(event);if(!p)return;if(!draft&&!sketchMode.points.length&&selection.length)select([]);if(draft?.anchored){draft.end=p;draft.secondTap=true;drawDraft();return;}if(sketchMode.params.shape==='arc'&&sketchMode.params.startMode!=='height'){sketchMode.points=[...sketchMode.points,p].slice(0,3);sketchMode.redoPoints=[];draft={start:sketchMode.points[0],end:p,poly:true,arc:true};drawDraft();updateHistoryButtons();return;}if(['polyline','spline'].includes(sketchMode.params.shape)){
 try{const tolerance=(camera.top-camera.bottom)/camera.zoom/renderer.domElement.clientHeight*(event.pointerType==='touch'?14:8),next=appendStrokePoint(sketchMode.points,p,tolerance);if(next.changed){sketchMode.points=next.points;sketchMode.redoPoints=[];}const last=sketchMode.points.at(-1);if(!last)return;draft={start:last,end:next.close?sketchMode.points[0]:p,poly:true,closePath:next.close};drawDraft();updateHistoryButtons();if(next.close)status('Release to close this profile');}catch(e){status(e.message);}
 }else{draft={start:p,end:p};updateHistoryButtons();}}
function drawingMove(event){const p=worldOnSketch(event);if(!p)return;draft.end=p;drawDraft();}
let splinePreviewRunning=false,splinePreviewPending=null,splinePreviewSession=0;
function queueSplinePreview(params){if(busy)return;splinePreviewPending={params,session:splinePreviewSession};if(splinePreviewRunning)return;const run=async()=>{splinePreviewRunning=true;try{while(splinePreviewPending){const job=splinePreviewPending;splinePreviewPending=null;try{const lines=await rpc('curvePreview',{params:job.params});if(job.session!==splinePreviewSession||sketchMode?.params.shape!=='spline'||!draft)continue;clear(preview);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));preview.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:preferences.theme==='dark'?'#8bd1ff':'#2372dd'})));if(job.params.splineMode==='Control'){const b=basis(job.params),x=new THREE.Vector3(...b.x),y=new THREE.Vector3(...b.normal).cross(x),origin=new THREE.Vector3(...b.origin),points=job.params.points.map(p=>origin.clone().addScaledVector(x,p[0]).addScaledVector(y,p[1]));if(job.params.closed)points.push(points[0]);const guide=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#bd9b61',dashSize:1,gapSize:.7,transparent:true,opacity:.6}));guide.computeLineDistances();preview.add(guide);}}catch(e){if(job.session===splinePreviewSession)status('Spline preview: '+e.message);}}}finally{splinePreviewRunning=false;}};run();}
function drawDraft(){if(sketchMode.params.shape!=='spline')clear(preview);drawingMeasure.hidden=false;const b=basis(sketchMode.params),x=new THREE.Vector3(...b.x),n=new THREE.Vector3(...b.normal),y=n.clone().cross(x),origin=new THREE.Vector3(...b.origin),world=q=>origin.clone().addScaledVector(x,q[0]).addScaledVector(y,q[1]);let pts=[],measurement='';
 const a=draft.start,c=draft.end,shape=sketchMode.params.shape,p=dragRecipe(shape,a,c,sketchMode.params.startMode),fmt=n=>(n/unitFactorValue()).toFixed(preferences.precision);
 if(draft.arc&&sketchMode.points.length>=2){try{const [a,b]=sketchMode.points,c=sketchMode.points[2]||draft.end,recipe=sketchMode.params.startMode==='centerArc'?centerPointArc(a,b,c):threePointArc(a,b,c);pts=arcPreviewPoints(...recipe.points,recipe.sagitta);}catch{pts=[...sketchMode.points,draft.end];}}else if(draft.poly)pts=[...sketchMode.points,draft.end];else if(shape==='rectangle'){const left=p.x-p.width/2,right=p.x+p.width/2,bottom=p.y-p.height/2,top=p.y+p.height/2;pts=[[left,bottom],[right,bottom],[right,top],[left,top],[left,bottom]];}else if(shape==='arc')pts=arcPreviewPoints(a,c,sketchMode.params.sagitta??10);else{const rx=shape==='ellipse'?p.width/2:p.radius,ry=shape==='ellipse'?p.height/2:p.radius,count=shape==='polygon'?Math.max(3,Math.round(sketchMode.params.sides||6)):80;pts=Array.from({length:count+1},(_,i)=>[p.x+rx*Math.cos(i/count*Math.PI*2),p.y+ry*Math.sin(i/count*Math.PI*2)]);}
 measurement=['rectangle','ellipse'].includes(shape)?fmt(p.width)+' × '+fmt(p.height):shape==='circle'?'Ø '+fmt(2*p.radius):fmt(Math.hypot(c[0]-a[0],c[1]-a[1]));const labelPoint=world(a).project(camera),rect=$('stage').getBoundingClientRect();drawingMeasure.textContent=measurement+' '+preferences.units;drawingMeasure.style.left=Math.max(64,Math.min(rect.width-180,(labelPoint.x+1)*rect.width/2+12))+'px';drawingMeasure.style.top=Math.max(100,Math.min(rect.height-100,(1-labelPoint.y)*rect.height/2+16))+'px';
 if(shape==='spline'&&draft.poly){const points=pts.filter((p,i)=>!i||Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])>1e-8);if(points.length>=2)queueSplinePreview({...sketchMode.params,basis:b,points:draft.closePath?points.slice(0,-1):points,closed:!!draft.closePath,x:0,y:0});return;}
 const g=new THREE.BufferGeometry().setFromPoints(pts.map(world));preview.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:preferences.theme==='dark'?'#8bd1ff':'#2372dd'})));
}
async function finishDrag(){if(draft.arc){if(sketchMode.points.length===3){try{await commitSketchPath();drawingMeasure.hidden=true;render();status('Arc ready · draw another or Exit sketch');}catch(e){sketchMode.points.pop();status(e.message);}}return;}if(draft.closePath){try{await commitSketchPath(true);status('Closed profile ready · draw another or Exit sketch');}catch(e){error(e);}return;}if(draft.poly)return;const a=draft.start,b=draft.end,p={...sketchMode.params};if(Math.hypot(b[0]-a[0],b[1]-a[1])<gridStep/2){draft=null;drawingMeasure.hidden=true;clear(preview);return;}
 if(p.shape==='arc'){p.points=[a,b];p.x=p.y=0;p.closed=false;}else Object.assign(p,dragRecipe(p.shape,a,b,p.startMode));
 try{const id=await apply('sketch',p,[]);snapGuides.hide();if(sketchMode?.direct){sketchMode.createdId=id;draft=null;drawingMeasure.hidden=true;clear(preview);render();status('Edit dimensions or draw another profile · Exit sketch when done');}else endDrawing();}catch(e){error(e);}
}
function endDrawing(){parameterGizmo?.cancel();sketchToolSession?.close();splinePreviewSession++;splinePreviewPending=null;sketchSnapCache=null;if($('sketchEditHUD'))$('sketchEditHUD').hidden=true;if($('sketchTrimHUD'))$('sketchTrimHUD').hidden=true;sketchTouches.clear();sketchTouchNavigation=false;sketchTouchPose=null;pointerStart=null;touchCount=0;drawingMeasure.hidden=true;snapGuides.hide();sketchMode=null;draft=null;render(true);renderContext();controls.enabled=true;controls.enableRotate=true;controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;$('sketchBar').hidden=true;clear(preview);updateHistoryButtons();}
const sketchStart=document.createElement('label');sketchStart.id='sketchStart';sketchStart.innerHTML='<span>Start</span><select aria-label="Sketch start mode"></select>';$('sketchBar').insertBefore(sketchStart,$('cancelSketch'));
function syncSketchStart(){const choices=startChoices(sketchMode?.params.shape);sketchStart.hidden=!!sketchMode?.editMode||!choices.length;const select=sketchStart.querySelector('select');select.replaceChildren(...choices.map(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;return option;}));if(choices.length)select.value=sketchMode.params.startMode;}
sketchStart.querySelector('select').onchange=e=>{if(!sketchMode||busy||draft){syncSketchStart();return;}sketchMode.params.startMode=e.target.value;if(sketchMode.params.shape==='spline')sketchMode.params.splineMode=e.target.value==='control'?'Control':'Fit';preferences.sketchStartModes={...preferences.sketchStartModes,[sketchMode.params.shape]:e.target.value};localStorage.setItem('reqoo-cad-preferences',JSON.stringify(preferences));};
async function migrateSketchRegions(){try{await ensureSketchRegions();}catch(e){status('Project opened · sketch regions could not be updated: '+e.message);}}
async function ensureSketchRegions({ids=null,selectResult=false}={}){const groups=new Map(),bodies=items.filter(i=>i.kind==='body'),used=new Set(bodies.flatMap(i=>i.imprintProfiles||[]));for(const item of items){if(item.kind!=='sketch'||!item.profileClosed||used.has(item.id)||ids&&!ids.includes(item.id))continue;const f=doc.features.find(f=>f.id===item.featureId),host=f?.params.hostBody;if(!host||!bodies.some(b=>b.id===host)||f.type!=='sketch')continue;if(!groups.has(host))groups.set(host,[]);groups.get(host).push(item.id);}if(!groups.size)return null;const next=snapshot();let last;for(const [host,profiles]of groups){last=uid();next.features.push({id:last,type:'imprint',name:'Sketch regions',params:{},inputs:[host,...profiles]});}await rebuild(next,{history:false,selectId:selectResult?last:null});return last;}
$('pickMode').addEventListener('change',()=>render());
$('cancelSketch').onclick=async()=>{const current=sketchMode;try{if(current?.direct){await rebuild(current.startDoc,{history:false});undo=current.startUndo;redo=current.startRedo;updateHistoryButtons();}endDrawing();setWorkspaceMode('solid');}catch(e){error(e);}};
$('finishSketch').onclick=async()=>{if(!sketchMode)return;try{const current=sketchMode;await commitSketchPath();const selected=selection.filter(r=>r.kind==='sketch').map(r=>({...r})),features=current.startDoc?doc.features.slice(current.startDoc.features.length):doc.features.filter(f=>f.id===current.createdId),created=new Set(features.map(f=>f.id)),ids=items.filter(i=>i.kind==='sketch'&&created.has(i.featureId)).map(i=>i.id);if(hasSessionProfiles())await ensureSketchRegions({ids,selectResult:true});endDrawing();setWorkspaceMode('solid');const profiles=selected.filter(r=>items.some(i=>i.id===r.id&&i.kind==='sketch'));if(profiles.length)select(profiles);}catch(e){error(e);}};

async function saveProject(){
 if(busy)throw Error('Wait for the current CAD operation before saving');
 if(parameterGizmo?.active||displayItems||rotationGizmo?.active||moveGizmo?.active||alignGizmo?.active)throw Error('Apply or cancel the geometry preview before saving');
 await commitSketchPath();
 doc.title=$('projectName').value.trim().slice(0,80)||'Untitled';$('projectName').value=doc.title;
 const content=serializeProject(doc);saveLocal();download((doc.title||'R3ds')+'.rqcad',new Blob([content],{type:'application/json'}));status('Project downloaded · '+doc.features.length+' history steps');
}


function download(name,content){const u=URL.createObjectURL(content instanceof Blob?content:new Blob([content])),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
async function exportFile(format){if(parameterGizmo?.active||displayItems||rotationGizmo?.active||moveGizmo?.active||alignGizmo?.active)throw Error('Apply or cancel the geometry preview before exporting');if(format==='svg'||format==='dxf'){const item=selectedItem(),f=doc.features.find(f=>f.id===item?.featureId);if(item?.kind!=='sketch'||!f)throw Error('Select a supported sketch first');const simple=f.type==='sketch'&&!f.params.operations?.length&&!f.params.serializedDrawing&&['circle','rectangle','polygon','polyline'].includes(f.params.shape);const content=simple?sketchExport(resolvedDimensionDoc().features.find(v=>v.id===f.id).params,format):await rpc('sketchExport',{targetId:item.id,format});download((doc.title||'Sketch')+'.'+format,content);return;}const ids=selectedIds().filter(id=>items.find(i=>i.id===id)?.kind==='body');const chosen=ids.length?ids:items.filter(i=>i.kind==='body'&&!(doc.ui.hidden||[]).includes(i.id)).map(i=>i.id);if(!chosen.length)throw Error('Create a solid body first');setBusy(true);try{const blob=format==='3mf'?threeMF(items.filter(i=>chosen.includes(i.id))):await rpc('export',{format,ids:chosen});download((doc.title||'R3ds')+'.'+(format==='step'?'step':format==='3mf'?'3mf':'stl'),blob);status('Exported '+format.toUpperCase()+' · mm');}finally{setBusy(false);}}
function fileMenu(){
 closePanels();const m=$('menu');m.replaceChildren();m.dataset.key='file';m.hidden=false;
 for(const [label,fn]of [['New project',newProject],['Save project',saveProject],['Open project',()=>$('openFile').click()],['Import STEP',()=>$('stepFile').click()],['Export STEP',()=>exportFile('step')],['Export STL',()=>exportFile('stl')],['Export 3MF',()=>exportFile('3mf')],['Export sketch SVG',()=>exportFile('svg')],['Export sketch DXF',()=>exportFile('dxf')],['Restore backup',restoreProjectBackup],['Generators',()=>window.open('/3d-studio/','_blank','noopener')],['Items',()=>showSidebar('items')],['History',()=>showSidebar('history')],['Settings',()=>showSidebar('settings')],['About / licenses',()=>{status('R3ds · REQOO 3D Studios · OpenCascade solid kernel · local projects');window.open('./THIRD-PARTY-NOTICES.txt','_blank','noopener');}]]){
  const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(error);m.append(b);
 }
}
$('fileMenu').onclick=fileMenu;$('exportTop').onclick=()=>{fileMenu();$('menu').querySelectorAll('button').forEach(b=>b.hidden=!/^Export/.test(b.textContent));};
$('openFile').onchange=async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>24e6)throw Error('Project exceeds 24 MB');const parsed=parseProject(await f.text());await rebuild(parsed);endDrawing();setWorkspaceMode('solid');selection=[];isolate=false;render(true);await migrateSketchRegions();if(recoveryRaw!==null)finishRecovery();closePanels();fit();}catch(e){error(e);}finally{$('openFile').value='';}};
$('stepFile').onchange=async e=>{const f=e.target.files[0];try{if(!f)return;if(f.size>20e6)throw Error('STEP file exceeds 20 MB');await apply('import',{step:await f.text()},[]);closePanels();fit();}catch(e){error(e);}finally{$('stepFile').value='';}};
document.addEventListener('keydown',async e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!busy)saveProject().catch(error);return;}if(e.target.closest('input,select,textarea')||busy)return;if(visualizer?.active&&e.key==='Escape'){visualizer.exit();return;}if(visualizer?.active&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()!=='f')return;const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}else if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject().catch(error);}else if(e.key.toLowerCase()==='g'&&!mod){e.preventDefault();setGridVisible(!grid.visible);}else if(e.key.toLowerCase()==='f')fit();else if(e.key==='Escape'){if(sketchMode?.editMode==='trimEdge'){stopSketchTrim();return;}if(parameterGizmo?.active&&!parameterGizmo.source.host.hidden){closePanels();return;}closePanels();if(sketchMode?.direct)await $('cancelSketch').onclick();else endDrawing();selection=[];render();}else if(e.key==='Delete'&&selection.length)apply('delete',{},selectedIds()).then(()=>select([])).catch(error);});
document.addEventListener('pointerdown',e=>{if(e.target.closest('#rail,#menu,#toolPanel,#top,dialog'))return;$('menu').hidden=true;});
// Let CSS track the dynamic viewport; never freeze a transient keyboard/browser height.
window.addEventListener('resize',resize);window.addEventListener('pageshow',resize);window.visualViewport?.addEventListener('resize',resize);

const displayButton=document.createElement('button');displayButton.id='displayModeButton';displayButton.type='button';displayButton.dataset.control='display';displayButton.innerHTML=ico('box');displayButton.setAttribute('aria-label','Display style');displayButton.setAttribute('aria-expanded','false');displayButton.title='Display style';$('settingsToggle').before(displayButton);
const displayMenu=document.createElement('div');displayMenu.id='displayPopover';displayMenu.hidden=true;displayMenu.setAttribute('role','menu');displayMenu.setAttribute('aria-label','Display style');$('stage').append(displayMenu);
const displayStyles=[['shaded','Solid'],['shadedEdges','Solid + edges'],['wireframe','Wireframe'],['xray','X-ray']];
for(const [mode,label]of displayStyles){const b=document.createElement('button');b.type='button';b.dataset.displayMode=mode;b.dataset.control='display';b.setAttribute('role','menuitemradio');b.innerHTML=ico(mode==='wireframe'?'wireframe':'box')+'<span>'+label+'</span><span class="displayCheck" aria-hidden="true">✓</span>';b.onclick=()=>{setDisplayMode(mode);closeDisplay();};displayMenu.append(b);}
function syncDisplay(){displayStyles.forEach(([mode])=>displayMenu.querySelector('[data-display-mode="'+mode+'"]').setAttribute('aria-checked',String(preferences.displayMode===mode)));displayButton.title='Display: '+(displayStyles.find(([mode])=>preferences.displayMode===mode)?.[1]||'Solid + edges');}
function closeDisplay(){displayMenu.hidden=true;displayButton.setAttribute('aria-expanded','false');}
function setDisplayMode(mode){if(busy)return;direct.cancel();rotationGizmo?.cancel();moveGizmo?.cancel();alignGizmo?.cancel();preferences.displayMode=mode;showEdges=mode!=='shaded';syncDisplay();updatePreferences();}
displayButton.onclick=()=>{if(visualizer?.active)visualizer.exit();displayMenu.hidden=!displayMenu.hidden;displayButton.setAttribute('aria-expanded',String(!displayMenu.hidden));syncDisplay();};
displayMenu.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){closeDisplay();displayButton.focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...displayMenu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:buttons.length-1)+buttons.length)%buttons.length].focus();}};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#displayModeButton,#displayPopover'))closeDisplay();});
syncDisplay();

function remoteWorkspaceState(){
 return{view:$('viewCube').dataset.orientation||'iso',displayMode:preferences.displayMode,gridVisible:preferences.gridVisible!==false,selection:selection.map(ref=>({id:ref.id,kind:ref.kind,...(Number.isInteger(ref.index)?{index:ref.index}:{})}))};
}
async function remoteWorkspaceControl(command,id){
 if(command.kind==='undo'||command.kind==='redo'){
  const from=command.kind==='undo'?undo:redo,to=command.kind==='undo'?redo:undo;
  if(!from.length)throw Error('No '+command.kind+' history available');
  const next=structuredClone(from.at(-1)),prior=snapshot();
  next.ui||={hidden:[],colors:{}};
  next.ui.bridgeApplied=[...(next.ui.bridgeApplied||[]),id].slice(-100);
  await rebuild(next,{history:false});from.pop();remember(to,prior);updateHistoryButtons();return;
 }
 if(command.kind==='view'){await view(command.view);return;}
 if(command.kind==='fit'){fit();return;}
 if(command.kind==='display'){setDisplayMode(command.mode);return;}
 if(command.kind==='grid'){setGridVisible(command.visible);return;}
 if(command.kind==='clearSelection'){select([]);return;}
 if(command.kind==='select'){
  const refs=command.refs.map(ref=>({id:ref.id,kind:ref.kind,...(Number.isInteger(ref.index)?{index:ref.index}:{})}));
  for(const ref of refs){
   const item=items.find(x=>x.id===ref.id);
   if(!item)throw Error('Selection item not found: '+ref.id);
   if(['body','sketch'].includes(ref.kind)&&item.kind!==ref.kind)throw Error('Selection kind does not match '+ref.id);
   if(ref.kind==='face'&&(item.kind!=='body'||!item.faceInfo?.some(f=>f.index===ref.index)))throw Error('Selected face does not exist');
   if(ref.kind==='edge'&&!item.edges?.some(e=>e.index===ref.index))throw Error('Selected edge does not exist');
  }
  select(refs);return;
 }
 throw Error('Unsupported workspace command');
}
const chatBridge=mountChatBridge({getDocument:()=>doc,getItems:()=>items,getWorkspaceState:remoteWorkspaceState,control:remoteWorkspaceControl,canRun:()=>ready&&!visualizer?.active&&!busy&&!sketchMode&&!planePicker.active&&!moveGizmo.active&&!rotationGizmo.active&&!alignGizmo.active&&!direct.state.preview&&$('toolPanel').hidden&&$('menu').hidden&&(!smartDimensions||$('smartDimensionPanel').hidden)&&!document.querySelector('dialog[open]:not(#chatBridge)'),commit:async(next,id)=>{await rebuild(next,{selectId:id});setWorkspaceMode('solid');fit();},onError:error});
smartDimensions=mountSmartDimensions({onStart:closePanels,onControls:source=>parameterGizmo.begin(source),onPreview:async(next,isCurrent)=>{const result=await rpc('preview',{doc:next});if(isCurrent()){displayItems=result;render(true);}},stage:$('stage'),THREE,camera,basis,getDoc:()=>doc,getSelection:()=>selection,allowSelection:()=>!visualizer?.active&&!sketchMode&&!activeTool&&$('menu').hidden&&$('toolPanel').hidden&&!direct.state.preview&&!moveGizmo?.active&&!rotationGizmo?.active&&!alignGizmo?.active&&!planePicker?.active,rebuild,commitUI:commitDimensionUI,busy:()=>busy,error,units:()=>({factor:unitFactorValue(),label:preferences.units}),precision:()=>preferences.precision});
visualizer=mountVisualization({stage:$('stage'),renderer,scene,camera,lights:{hemisphere,lamp,fill},getDoc:()=>doc,getItems:()=>items,getSelection:()=>selection,getVisibleItems:()=>items.filter(i=>!(doc.ui.hidden||[]).includes(i.id)&&(!isolate||selectedIds().includes(i.id))),commitUI:commitDimensionUI,refresh:()=>render(true),fitView:fit,getSaveState:()=>$('saveState').textContent,busy:()=>busy,getTheme:()=>preferences.theme,onError:error,onEnter:()=>{if(sketchMode)throw Error('Exit sketch before visualizing');setWorkspaceMode('solid');closePanels();smartDimensions?.close();direct.cancel();$('sidebar').hidden=true;},onExit:options=>{if(options?.deselect)select([]);},capture:transparent=>{if(busy)throw Error('Wait for the CAD operation');const renderRatio=renderer.getPixelRatio(),background=scene.background,view=camera.view?{...camera.view}:null;captureMode=true;try{render(true);grid.visible=false;worldReference.group.visible=false;if(transparent)scene.background=null;camera.clearViewOffset();camera.updateProjectionMatrix();renderer.setPixelRatio(Math.max(2,Math.min(3,devicePixelRatio||2)));renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download=(doc.title||'R3ds')+'-visualization.png';a.click();}finally{captureMode=false;renderer.setPixelRatio(renderRatio);scene.background=background;if(view?.enabled)camera.setViewOffset(view.fullWidth,view.fullHeight,view.offsetX,view.offsetY,view.width,view.height);else camera.clearViewOffset();camera.updateProjectionMatrix();render(true);}}});
workspaceChrome=createWorkspaceChrome({stage:$('stage'),icon:ico,getState:()=>({workspaceMode,drawing:!!sketchMode,shape:sketchMode?.params.shape,sketchEdit:sketchMode?.editMode,selectedKind:selection.at(-1)?.kind,rotating:rotationGizmo?.active,moveMode:moveGizmo?.state?.mode,aligning:alignGizmo?.active,directMode:direct.state.preview?direct.state.operation:null}),getGridLabel:()=>Number((gridStep/unitFactorValue()).toFixed(Math.max(3,preferences.precision)))+'\n'+preferences.units,onGridSettings:()=>showSidebar('settings'),onQuickSketch:quickSketch,onSketchSelect:selectSketchProfiles,onSketchEdit:activateSketchEdit,onSketchTrim:activateSketchTrim,onSketchTool:activateSketchOperation,onExitSketch:async()=>{if(sketchMode)await $('finishSketch').onclick();else setWorkspaceMode('solid');},onSelectionTools:()=>{$('stage').dataset.moreTools='false';}});
updatePreferences();setWorkspaceMode('solid');decorateButtons();new MutationObserver(decorateButtons).observe(document.body,{childList:true,subtree:true});
try{await rpc('ready');ready=true;const saved=localStorage.getItem('reqoo-cad-v1');if(saved){try{const parsed=parseProject(saved);await rebuild(parsed,{history:false});await migrateSketchRegions();fit();}catch{requireRecovery(saved);}}if(recoveryRaw===null)status('Ready · create a sketch or add a solid');updateHistoryButtons();}catch(e){error(e);}
if(new URLSearchParams(location.search).has('test'))window.__cad={get sketchPreview(){return preview.children.map(o=>({type:o.type,positions:Array.from(o.geometry?.attributes.position.array||[])}));},get snapCacheStats(){return {...sketchSnapStats};},get gizmo(){return {...direct.state,selection:selection.at(-1),busy,sketchMode:!!sketchMode,sketchPlane:sketchMode?basis(sketchMode.params):null,sketchShape:sketchMode?.params.shape,sketchCreated:sketchMode?.createdId,sketchPointCount:sketchMode?.points.length}},get previewItems(){return displayItems},get immediatePreview(){return immediateSession?{mode:immediateSession.mode||'affine',value:immediateSession.value}:null},direct,get doc(){return doc;},get items(){return items;},get selection(){return selection;},apply,rebuild,select,startTool,saveProject,exportFile,fit,ready:()=>ready,rotationGizmo,moveGizmo,alignGizmo,parameterGizmo,planePicker,grid,patternOverlay,snapGuides,worldOnSketch,worldReference,diameterTarget,view,camera,controls,root,worker:rpc};
