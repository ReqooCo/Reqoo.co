import * as THREE from 'three';
import undoIcon from '@tabler/icons/outline/arrow-back-up.svg?url';
import redoIcon from '@tabler/icons/outline/arrow-forward-up.svg?url';
import cutIcon from '@tabler/icons/outline/scissors.svg?url';
import copyIcon from '@tabler/icons/outline/copy.svg?url';
import pasteIcon from '@tabler/icons/outline/clipboard.svg?url';
import duplicateIcon from '@tabler/icons/outline/squares.svg?url';
import moveIcon from '@tabler/icons/outline/arrows-move.svg?url';
import orbitIcon from '@tabler/icons/outline/rotate-3d.svg?url';
import folderIcon from '@tabler/icons/outline/folder-open.svg?url';
import saveIcon from '@tabler/icons/outline/device-floppy.svg?url';
import exportIcon from '@tabler/icons/outline/download.svg?url';
import printerIcon from '@tabler/icons/outline/printer.svg?url';
import focusIcon from '@tabler/icons/outline/focus-2.svg?url';
import topIcon from '@tabler/icons/outline/layout-grid.svg?url';
import cubeIcon from '@tabler/icons/outline/cube.svg?url';
import paletteIcon from '@tabler/icons/outline/palette.svg?url';

export function installStudioTheme({scene,grid,group,choose,camera}){
 const $=id=>document.getElementById(id),app=$('app');
 for(const [id,src,label]of [['undo',undoIcon,'Undo'],['redo',redoIcon,'Redo'],['cut',cutIcon,'Cut'],['copy',copyIcon,'Copy'],['paste',pasteIcon,'Paste'],['duplicate',duplicateIcon,'Duplicate'],['moveMode',moveIcon,'Gerak'],['orbitMode',orbitIcon,'Kamera'],['load',folderIcon,'Buka'],['save',saveIcon,'Simpan'],['export',exportIcon,'STL'],['export3mf',exportIcon,'3MF warna'],['openBambu',printerIcon,'Buka di Bambu'],['fitProduct',focusIcon,'Fokus model'],['frontProduct',topIcon,'Atas']]){
  const b=$(id);b.replaceChildren();const icon=document.createElement('img');icon.src=src;icon.alt='';b.append(icon);const text=document.createElement('span');text.textContent=label;b.append(text);b.setAttribute('aria-label',label);
 }
 const nav=document.createElement('nav');nav.id='workspaceNav';nav.innerHTML='<button id="designTab" class="active">Reka</button><button id="colorTab">Warna & bahagian</button><button id="exportTab">Eksport / Bambu Studio</button><span>Reqoo Product Studio · Mesh cetakan berkualiti tinggi</span>';app.append(nav);
 const decorTab=document.createElement('button');decorTab.id='decorTab';decorTab.textContent='Hiasan & bentuk';$('exportTab').before(decorTab);decorTab.onclick=()=>{$('decorationPanel').open=true;$('decorationPanel').scrollIntoView({block:'start',behavior:'smooth'})};
 const activate=id=>{nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.id===id))};
 $('designTab').onclick=()=>{activate('designTab');$('productKind').scrollIntoView({block:'start',behavior:'smooth'})};
 $('colorTab').onclick=()=>{activate('colorTab');$('materialPanel').scrollIntoView({block:'start',behavior:'smooth'})};
 const toolsTab=document.createElement('button');toolsTab.id='attachmentTab';toolsTab.textContent='Gelung / Union / Resin';$('exportTab').before(toolsTab);toolsTab.onclick=()=>{activate('attachmentTab');$('attachmentPanel').open=true;$('resinPanel').open=true;$('attachmentPanel').scrollIntoView({block:'start',behavior:'smooth'})};
 $('exportTab').onclick=()=>{activate('exportTab');$('export3mf').focus();$('status').textContent='Gunakan 3MF warna atau Buka di Bambu. Padankan warna dengan filament sebenar sebelum Slice plate.'};
 const panel=document.createElement('section');panel.id='materialPanel';panel.innerHTML='<h3>Warna reka bentuk <span>3MF</span></h3><div id="materialList"></div><small>Padankan warna kepada filament di Bambu Studio.</small>';$('productPanel').before(panel);
 scene.background=new THREE.Color('#e6e7e8');grid.material.color?.set('#929797');grid.material.vertexColors=false;
 grid.geometry.dispose();const replacement=new THREE.GridHelper(256,32,0xa4a9a8,0x747c7a);replacement.rotation.x=Math.PI/2;replacement.position.z=-.01;grid.copy(replacement);grid.name='Print grid';
 const bed=new THREE.Mesh(new THREE.PlaneGeometry(258,258),new THREE.MeshStandardMaterial({color:'#737d78',roughness:.85,side:THREE.FrontSide}));bed.position.z=-.05;bed.name='Reference build surface';scene.add(bed);
 let showPlate=true;const plateButton=document.createElement('button');plateButton.id='toggleBuildPlate';plateButton.textContent='Papar / sembunyi plate';plateButton.setAttribute('aria-label','Papar / sembunyi plate');const plateIcon=document.createElement('img');plateIcon.src=topIcon;plateIcon.alt='';plateButton.prepend(plateIcon);$('editToolbar').append(plateButton);plateButton.onclick=()=>{showPlate=!showPlate;plateButton.classList.toggle('active',showPlate);updateView()};function updateView(){const above=camera.position.z>-.02;bed.visible=showPlate&&above;grid.visible=showPlate&&above}const fill=new THREE.DirectionalLight(0xffffff,1.8);scene.add(fill);function updateLighting(){fill.position.copy(camera.position);fill.target.position.copy(group.position);fill.target.updateMatrixWorld();updateView()}
 const oldPosition=grid.position.clone(),colorCache=new WeakMap();let last='';
 function refresh(){const colors=new Map();for(const m of group.children){const local=new Set(),attr=m.geometry.attributes.color;if(attr){const signature=attr.version+':'+m.material.color.getHex(),cached=colorCache.get(m.geometry);if(cached?.signature===signature)cached.colors.forEach(c=>local.add(c));else{const color=new THREE.Color();for(let i=0;i<attr.count;i++){color.fromBufferAttribute(attr,i).multiply(m.material.color);local.add('#'+color.getHexString())}colorCache.set(m.geometry,{signature,colors:[...local]})}}else local.add('#'+m.material.color.getHexString());for(const color of local){if(!colors.has(color))colors.set(color,{mesh:m,count:0});colors.get(color).count++}}const key=JSON.stringify([...colors].map(([hex,v])=>[hex,v.count,v.mesh.uuid]));if(key===last)return;last=key;const list=$('materialList');list.replaceChildren();if(!colors.size){const p=document.createElement('p');p.textContent='Warna akan muncul selepas produk dijana.';list.append(p)}for(const [index,[hex,value]]of [...colors].entries()){const b=document.createElement('button');b.className='materialChip';const swatch=document.createElement('i');swatch.style.backgroundColor=hex;const label=document.createElement('span');label.textContent=`${index+1}  ${hex.toUpperCase()}`;const count=document.createElement('small');count.textContent=value.count+' bahagian';b.append(swatch,label,count);b.onclick=()=>choose(value.mesh,true);list.append(b)}}
 refresh();return {refresh,updateView:updateLighting};
}

