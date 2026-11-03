import './web-platform.js';
import './combined-studio.css';
import {exportManufacturingSTL} from './export-mesh.js';
import {installAbout} from './about-updates.js';
import {installCreative} from './creative-studio.js';
import {installManufacturing} from './manufacturing.js';
import {installWorkspaceUI} from './workspace-ui.js';
import {stageProject,replaceProject} from './project-loader.js';
import {MAX_PROJECT_BYTES} from './project-format.js';
import {installLamps} from './lamp-studio.js';
import {installProduction} from './production-upgrade.js';
import {validateProject} from './project-format.js';
import {installLaceBookmarks} from './lace-bookmarks.js';
import {installAssemblyPreview} from './assembly-preview.js';
import {installShapePalette} from './shape-palette.js';
import {installWorkflow} from './workflow.js';
import {installTransformGizmo} from './transform-gizmo.js';
import {installImageShapes} from './image-shapes.js';
import {installTopTools} from './top-tools.js';
import {installTaper} from './taper.js';
import {installLEDLetters} from './led-letters.js';
import {installToolIcons} from './tool-icons.js';
import {installHangingSign} from './hanging-sign.js';
import {installLanguage} from './i18n.js';
import {installCustomShapes} from './custom-shapes.js';
import {installHelpHints} from './help-hints.js';
import {installFontBrowser} from './font-browser.js';
import {installDecorationLibrary} from './decoration-library.js';
import {installStudioTheme} from './studio-theme.js';
import {installAttachments} from './attachments.js';
import {installResinFrame} from './resin-frame.js';
import {installBoothProducts} from './booth-products.js';
import {installAdvancedTools} from './advanced-tools.js';
import {MESH_QUALITY} from './mesh-quality.js';
import {installEditor} from './editor.js';
import {productStudio} from './products.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
const letterFont=new FontLoader().parse(fontData);
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import './style.css';
import './readability.css';
import './top-tools.css';
const app=document.getElementById('app');
app.innerHTML=`<aside><h2>Reqoo <span>3D Studio</span></h2><small>Windows Edition · v0.9.3</small><section><h3>Tambah objek</h3><button id="box">▣ Kotak</button><button id="cyl">◉ Silinder</button><button id="sphere">● Sfera</button><label>Teks / Nama</label><input id="text" value="CONTOH" maxlength="24"/><button id="addText">+ Teks 3D</button><label>Gambar / SVG / STL</label><input id="file" type="file" accept=".png,.jpg,.jpeg,.svg,.stl"/><small>PNG/JPG menghasilkan relief 2.5D, bukan patung AI.</small></section><section><h3>Letter Editor / Senarai objek</h3><select id="objects" size="6" aria-label="Pilih huruf atau objek"></select><small>Pilih setiap huruf untuk ubah saiz, ketinggian dan kedudukannya.</small><button id="stagger">Susun huruf beralun</button><button id="align">Ratakan huruf</button></section><section><h3>Objek dipilih</h3><div id="selected">Tiada objek dipilih</div><label>Lebar X (mm)</label><input id="sx" type="number" min="0.5" step="0.5"/><label>Ketinggian huruf / Y (mm)</label><input id="sy" type="number" min="0.5" step="0.5"/><label>Ketebalan Z (mm)</label><input id="sz" type="number" min="0.5" step="0.5"/><label>Kedudukan X (mm)</label><input id="px" type="number" step="1"/><label>Kedudukan Y / naik turun (mm)</label><input id="py" type="number" step="1"/><label>Kedudukan Z (mm)</label><input id="pz" type="number" step="1"/><label>Putaran huruf (°)</label><input id="rotation" type="number" step="5"/><label>Warna</label><input id="color" type="color" value="#36a3ff"/><button id="delete" class="danger">Buang objek</button></section><section><h3>Projek</h3><button id="save">Simpan projek JSON</button><button id="load">Buka projek JSON</button><input id="project" type="file" accept=".json" hidden/><button id="export" class="primary">Eksport STL</button><p id="status">Sedia untuk mereka bentuk.</p></section></aside><main><header><strong>Ruang Kerja 3D</strong><span>Unit: mm · Putar: drag · Zoom: scroll · Pan: right-drag</span></header><div id="viewport"></div><footer><span id="count">0 objek</span><span>STL eksport dalam unit milimeter · Semak mesh di Bambu Studio</span></footer></main>`;
const $=id=>document.getElementById(id);const scene=new THREE.Scene();scene.background=new THREE.Color('#121b2b');const camera=new THREE.PerspectiveCamera(45,1,.1,10000);camera.up.set(0,0,1);camera.position.set(100,-120,125);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));$('viewport').appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,0);scene.add(new THREE.HemisphereLight(0xffffff,0x445566,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(70,120,80);scene.add(light);const grid=new THREE.GridHelper(200,20,0x516174,0x2a3749);grid.rotation.x=Math.PI/2;scene.add(grid);const axes=new THREE.AxesHelper(35);scene.add(axes);const group=new THREE.Group();scene.add(group);let selected=null,editor=null,theme=null,addBatchDepth=0;const status=t=>$('status').textContent=t;function refresh(){
 $('count').textContent=`${group.children.length} objek`;
 $('selected').textContent=selected?.userData?.name||'Tiada objek dipilih';
 const list=$('objects');list.replaceChildren();
 group.children.forEach((m,i)=>{const option=document.createElement('option');option.value=i;option.textContent=m.userData.name;option.selected=editor?editor.getSelectedMeshes().includes(m):m===selected;list.appendChild(option)});
 for(const [id,i] of [['sx',0],['sy',1],['sz',2]]) {$(id).value=selected?Number((selected.userData.dim[i]*selected.scale.getComponent(i)).toFixed(3)):'';$(id).disabled=!selected;}
 for(const [id,i] of [['px',0],['py',1],['pz',2]]) {$(id).value=selected?Number(selected.position.getComponent(i).toFixed(3)):'';$(id).disabled=!selected;}
 $('rotation').value=selected?Number(THREE.MathUtils.radToDeg(selected.rotation.z).toFixed(2)):'';
 if(selected)$('color').value='#'+selected.material.color.getHexString();editor?.selection(selected);theme?.refresh();
}
function choose(m,open=false,extend=false){if(m?.userData.locked)return;selected=editor?editor.setSelection(m,extend):m;refresh();editor?.selection(selected,open);}function add(geo,name,color='#36a3ff'){geo.computeBoundingBox();const size=new THREE.Vector3();geo.boundingBox.getSize(size);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.65,vertexColors:!!geo.getAttribute('color'),side:THREE.DoubleSide}));m.userData={name,dim:[size.x,size.y,size.z].map(x=>Math.max(x,.01))};m.position.z=Math.max(0,-geo.boundingBox.min.z);group.add(m);if(!addBatchDepth)choose(m);return m;}
add.batch=fn=>{addBatchDepth++;try{return fn()}finally{addBatchDepth--}};
$('box').onclick=()=>add(new THREE.BoxGeometry(35,25,5),'Kotak');$('cyl').onclick=()=>add(new THREE.CylinderGeometry(15,15,5,MESH_QUALITY.cylinderRadialSegments).rotateX(Math.PI/2),'Silinder');$('sphere').onclick=()=>add(new THREE.SphereGeometry(15,MESH_QUALITY.sphereWidthSegments,MESH_QUALITY.sphereHeightSegments),'Sfera');
function reliefFromCanvas(canvas,depth=3,base=1){const max=100;const w=Math.max(2,Math.round(canvas.width*Math.min(1,max/canvas.width,max/canvas.height)));const h=Math.max(2,Math.round(canvas.height*w/canvas.width));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;const heights=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;const lum=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;heights.push(base+depth*(1-lum)*data[i+3]/255)}const v=[],indices=[];const push=(x,y,z)=>v.push(x-w/2,h/2-y,z);for(let y=0;y<h;y++)for(let x=0;x<w;x++)push(x,y,heights[y*w+x]);const back=w*h;for(let y=0;y<h;y++)for(let x=0;x<w;x++)push(x,y,0);for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){let a=y*w+x,b=a+1,d=a+w,c=d+1;indices.push(a,b,c,a,c,d);indices.push(back+a,back+c,back+b,back+a,back+d,back+c)}function side(a,b){indices.push(a,b,back+b,a,back+b,back+a)}for(let x=0;x<w-1;x++){side(x,x+1);side((h-1)*w+x+1,(h-1)*w+x)}for(let y=0;y<h-1;y++){side((y+1)*w,y*w);side(y*w+w-1,(y+1)*w+w-1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();return g;}
$('objects').onchange=e=>{const meshes=[...e.target.selectedOptions].map(o=>group.children[Number(o.value)]);selected=meshes.at(-1)||null;editor?.replaceSelection(meshes);refresh();editor?.selection(selected,true)};
let textSequence=0;
$('addText').onclick=()=>{
 const text=$('text').value.trim();if(!text)return status('Masukkan teks dahulu.');
 const batch=`text-${Date.now()}-${++textSequence}`;let cursor=0;const letters=[];
 for(const [index,char] of Array.from(text).entries()){
  if(/\s/.test(char)){continue;}
  if(!fontData.glyphs[char]){status(`Huruf ${char} tidak disokong font ini. Gunakan A–Z, nombor atau tanda biasa.`);return;}
 }
 for(const [index,char] of Array.from(text).entries()){
  if(/\s/.test(char)){cursor+=9;continue;}
  const geo=new TextGeometry(char,{font:letterFont,size:22,depth:4,curveSegments:MESH_QUALITY.fontCurveSegments,bevelEnabled:false});
  geo.computeBoundingBox();const box=geo.boundingBox;const width=box.max.x-box.min.x;
  geo.translate(-box.min.x,-box.min.y,-box.min.z);
  const m=add(geo,`Huruf ${index+1}: ${char}`);m.position.set(cursor,0,0);Object.assign(m.userData,{letter:char,batch,index});letters.push(m);cursor+=width+2;
 }
 for(const m of letters)m.position.x-=cursor/2;
 refresh();status(`${letters.length} huruf berasingan siap. Pilih huruf dalam Letter Editor.`);
};
function arrange(wave){if(!selected?.userData.batch)return status('Pilih satu huruf dahulu.');const letters=group.children.filter(m=>m.userData.batch===selected.userData.batch);let cursor=0;letters.forEach((m,i)=>{m.position.set(cursor,wave?Math.sin(i*1.2)*5:0,0);m.rotation.z=wave?THREE.MathUtils.degToRad(Math.sin(i)*7):0;cursor+=m.userData.dim[0]*m.scale.x+2});letters.forEach(m=>m.position.x-=cursor/2);refresh();}
$('stagger').onclick=()=>arrange(true);$('align').onclick=()=>arrange(false);
for(const [id,i] of [['px',0],['py',1],['pz',2]])$(id).onchange=e=>{const v=Number(e.target.value);if(selected&&Number.isFinite(v))selected.position.setComponent(i,v);refresh()};
$('rotation').onchange=e=>{const v=Number(e.target.value);if(selected&&Number.isFinite(v))selected.rotation.z=THREE.MathUtils.degToRad(v);refresh()};
$('file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const ext=file.name.split('.').pop().toLowerCase();if(['png','jpg','jpeg'].includes(ext)){const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);add(reliefFromCanvas(c),`Relief: ${file.name}`);URL.revokeObjectURL(img.src);status('Relief 2.5D dijana.');};img.src=URL.createObjectURL(file);}else if(ext==='stl'){const buffer=await file.arrayBuffer();add(new STLLoader().parse(buffer),`STL: ${file.name}`);}else if(ext==='svg'){const parsed=new SVGLoader().parse(await file.text());let n=0;for(const path of parsed.paths){for(const shape of SVGLoader.createShapes(path)){const g=new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false,curveSegments:MESH_QUALITY.svgCurveSegments});g.scale(.3,-.3,1);add(g,`SVG: ${file.name} ${++n}`)}}if(!n)throw Error('Tiada bentuk SVG yang boleh diekstrud.');}else throw Error('Format tidak disokong.');}catch(err){status('Ralat: '+err.message)}e.target.value='';};
for(const [id,i] of [['sx',0],['sy',1],['sz',2]])$(id).onchange=e=>{if(!selected)return;const target=Number(e.target.value);if(!Number.isFinite(target)||target<=0)return refresh();selected.scale.setComponent(i,target/selected.userData.dim[i]);refresh();};$('color').oninput=e=>{if(selected)selected.material.color.set(e.target.value)};$('delete').onclick=()=>{if(!selected)return;group.remove(selected);selected.geometry.dispose();selected.material.dispose();selected=null;refresh();};
async function download(data,name,type){const blob=new Blob([data],{type});if(window.desktop)return window.desktop.save(name,new Uint8Array(await blob.arrayBuffer()));const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);return true}$('export').onclick=async()=>{if(!group.children.length)return status('Tambah objek dahulu.');const clone=group.clone(true);clone.updateMatrixWorld(true);const stl=new STLExporter().parse(clone,{binary:true});try{if(!await download(stl,'reqoo-design.stl','model/stl'))return status('Eksport dibatalkan.')}catch(err){return status('Gagal eksport: '+err.message)}status('STL dieksport. Semak saiz dan kesatuan mesh dalam Bambu Studio.');};$('save').onclick=async()=>{status('Menyimpan projek…');const data=group.children.map(m=>({name:m.userData.name,color:'#'+m.material.color.getHexString(),position:m.position.toArray(),scale:m.scale.toArray(),rotation:m.rotation.toArray(),metadata:m.userData,geometry:compactGeometry(m.geometry)}));try{const ok=await download(JSON.stringify({version:4,product:products.get(),objects:data}), 'reqoo-project.json','application/json');status(ok?'Projek berjaya disimpan.':'Simpan dibatalkan.')}catch(err){status('Gagal simpan: '+err.message)}};$('load').onclick=()=>$('project').click();let projectLoading=false;
$('project').onchange=async e=>{const file=e.target.files?.[0];if(!file||projectLoading)return false;projectLoading=true;let staged=null,transaction=false;const stamp=()=>JSON.stringify(group.children.map(m=>[m.uuid,m.geometry.uuid,m.position.toArray(),m.rotation.toArray(),m.scale.toArray(),m.material.color.getHex()]))+JSON.stringify(products.get()),initial=stamp();
try{if(file.size>MAX_PROJECT_BYTES)throw Error('Projek terlalu besar.');const text=await file.text(),raw=JSON.parse(text);staged=stageProject(raw);if(raw.version<4){if(!window.desktop?.backupMigration)throw Error('Gunakan aplikasi Windows untuk sandaran migrasi.');await window.desktop.backupMigration(text)}if(initial!==stamp())throw Error('Reka bentuk berubah semasa fail dibuka. Cuba semula.');
const previous=selected,picked=editor?.getSelectedMeshes()||[],position=camera.position.clone(),target=controls.target.clone(),bodyClass=document.body.className,ui=[...document.querySelectorAll('input:not([type=file]),select')].map(el=>({el,value:el.value,checked:el.checked}));transaction=true;
await replaceProject({group,staged,products,afterCommit:()=>{selected=null;choose(null);refresh()},beforeRollback:()=>{for(const r of ui){r.el.value=r.value;if(r.el.type==='checkbox')r.el.checked=r.checked}},rollback:()=>{document.body.className=bodyClass;selected=previous;choose(previous);editor?.replaceSelection(picked);camera.position.copy(position);controls.target.copy(target);controls.update();refresh()}});staged=null;
status(raw.version<4?'Projek berjaya dibuka. Sandaran fail lama disimpan.':'Projek berjaya dibuka.');return true;
}catch(err){if(staged&&!transaction)staged.dispose();status('Gagal buka projek: '+err.message);return false}finally{projectLoading=false;e.target.value=''}};

function resize(){const rect=$('viewport').getBoundingClientRect();camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height)}new ResizeObserver(resize).observe($('viewport'));resize();function loop(){requestAnimationFrame(loop);controls.update();theme?.updateView();renderer.render(scene,camera)}loop();refresh();

if(new URLSearchParams(location.search).has('test'))window.__reqoo={group,scene,camera,renderer,choose,refresh};

const products=productStudio({group,add,choose,refresh,status,camera,controls,grid,fallbackFont:letterFont,download,getSelected:()=>selected,getSelectedMeshes:()=>editor?.getSelectedMeshes()||[selected].filter(Boolean),exportSTL:exportManufacturingSTL});

function compactGeometry(geometry){const data=new THREE.BufferGeometry().copy(geometry).toJSON();for(const attr of Object.values(data.data.attributes))attr.array=attr.array.map(v=>Math.round(v*100000)/100000);return data;}
function serializeProject(){return {version:4,product:products.get(),objects:group.children.map(m=>({name:m.userData.name,color:'#'+m.material.color.getHexString(),position:m.position.toArray(),scale:m.scale.toArray(),rotation:m.rotation.toArray(),metadata:m.userData,geometry:compactGeometry(m.geometry)}))}}

editor=installEditor({group,scene,camera,renderer,controls,getSelected:()=>selected,choose,refresh,status,products,resize});
installAttachments({group,add,choose,getSelected:()=>selected,refresh,status,editor,products});
installResinFrame({group,add,choose,getSelected:()=>selected,refresh,status,editor});
installBoothProducts({products,group,add,choose,refresh,status,editor});
installHangingSign({products,group,add,choose,refresh,status,editor});
installAdvancedTools({group,add,choose,getSelected:()=>selected,refresh,status,editor,products,serializeProject});

installFontBrowser({products,editor,refresh,status});
installDecorationLibrary({products,group,add,choose,refresh,status,editor});

theme=installStudioTheme({scene,grid,group,choose,camera});
installCustomShapes({group,add,choose,refresh,status,editor});
installImageShapes({group,products,add,choose,refresh,status,editor});
installLaceBookmarks({products,group,add,choose,refresh,status,editor});
installTopTools();
installTaper({editor,refresh,status});
installLEDLetters({group,products,add,choose,refresh,status,editor});
installTransformGizmo({scene,group,camera,renderer,controls,editor,refresh});
installShapePalette();
installToolIcons();
installWorkflow({group,products,editor,choose,refresh,status,camera,controls});
installAssemblyPreview({scene,group,products,editor,choose,camera,controls,status,onViewChanged:()=>theme?.updateView()});
installProduction({group,products,editor,add,choose,refresh,status,serializeProject});
installLamps({group,products,editor,add,choose,refresh,status,scene});
installHelpHints();
installLanguage();
installManufacturing({group,products,editor,add,choose,refresh,status,serializeProject,renderer,scene,camera});
installCreative({group,products,editor,add,choose,refresh,status});
installAbout();
installWorkspaceUI({products,group,editor,status});

if(new URLSearchParams(location.search).has('test'))window.__reqoo.inspect3mf=async bytes=>{
 const {ThreeMFLoader}=await import('three/addons/loaders/3MFLoader.js');
 const model=new ThreeMFLoader().parse(new Uint8Array(bytes).buffer),colors=new Set();let meshes=0;
 model.traverse(m=>{if(m.isMesh){meshes++;for(const material of Array.isArray(m.material)?m.material:[m.material])colors.add('#'+material.color.getHexString().toUpperCase())}});
 const bounds=new THREE.Box3().setFromObject(model);return {colors:[...colors].sort(),meshes,size:bounds.getSize(new THREE.Vector3()).toArray()};
};


if(new URLSearchParams(location.search).get('generator')==='lamp')products.selectGenerator('lamp','lantern');
