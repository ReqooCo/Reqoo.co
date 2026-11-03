export function installTopTools(){
 const $=id=>document.getElementById(id),bar=$('editToolbar');$('app').append(bar);
 const floating=[];
 function popup(panel,button){if(!panel||!button)return;panel.id||='toolPanel-'+floating.length;button.dataset.toolPanel=panel.id;panel.classList.add('floatingToolPanel');panel.style.top='150px';panel.style.left=panel.id==='advancedPanel'?Math.max(360,innerWidth-370)+'px':'370px';panel.open=false;document.body.append(panel);floating.push(panel);const close=document.createElement('button');close.className='closeToolPanel';close.textContent='×';close.title='Tutup';panel.prepend(close);close.onclick=()=>panel.open=false;
  button.onclick=()=>{const open=!panel.open;document.querySelectorAll('.floatingToolPanel').forEach(p=>p.open=false);panel.open=open;if(open){const r=button.getBoundingClientRect();panel.style.left=Math.min(innerWidth-360,Math.max(12,r.left))+'px';panel.style.top=(bar.getBoundingClientRect().bottom+6)+'px'}};
 }
 function group(){const g=document.createElement('div');g.className='toolGroup';bar.append(g);return g}
 const cad=group();for(const [id,label] of [['mirrorX','Mirror X'],['mirrorY','Mirror Y'],['alignSelected','Align'],['centerSelected','Center'],['groupSelected','Group'],['ungroupSelected','Ungroup'],['splitSelected','Split'],['embossSelected','Emboss'],['engraveSelected','Engrave'],['addBacking','Backing']]){const b=$(id);b.title=b.textContent;b.textContent=label;cad.append(b)}
 popup($('advancedPanel'),$('arrangeTools'));$('arrangeTools').textContent='⚙';$('arrangeTools').title='Tetapan alat';
 const view=group();for(const id of ['fitProduct','frontProduct','stagger','align'])view.append($(id));
 const creation=group();creation.id='creationTools';for(const [id,label] of [['openCustomShape','Bentuk Custom'],['openImageShape','Import logo'],['decorTab','Hiasan'],['attachmentTab','Gelung']]){const b=$(id);if(b){b.textContent=label;creation.append(b)}}
 popup($('attachmentPanel'),$('attachmentTab'));popup($('decorationPanel'),$('decorTab'));
 const resin=document.createElement('button');resin.id='resinTools';resin.textContent='Resin';creation.append(resin);popup($('resinPanel'),resin);
 const extra=$('box').closest('details');if(extra){const b=document.createElement('button');b.textContent='Tambah';creation.append(b);popup(extra,b)}
 const storage=$('storagePanel');if(storage){const b=document.createElement('button');b.textContent='Templat';creation.append(b);popup(storage,b)}
 // Adding a connector should leave the canvas free for immediate mouse dragging.
 for(const id of ['addAttachment','addBridge']){const b=$(id),handler=b.onclick;b.onclick=function(e){const result=handler.call(this,e);$('attachmentPanel').open=false;return result}}
 document.addEventListener('pointerdown',e=>{if(e.target.closest('#editToolbar,.floatingToolPanel,dialog'))return;document.querySelectorAll('.floatingToolPanel').forEach(p=>p.open=false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.floatingToolPanel').forEach(p=>p.open=false)});
}
