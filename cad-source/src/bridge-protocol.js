// Shared by the browser and Worker. Commands contain CAD data, never executable code.
export const BRIDGE_TYPES=['sketch','sketchOffset','sketchFillet','sketchMirror','box','cylinder','sphere','torus','extrude','hole','revolve','loft','sweep','union','subtract','intersect','fillet','chamfer','thread','shell','offsetFace','draft','move','rotate','scale','mirror','pattern','circularPattern','duplicate','align','split','plane','axis'];
const idOK=v=>typeof v==='string'&&!Object.hasOwn(Object.prototype,v)&&/^[a-zA-Z0-9_-]{1,80}$/.test(v),object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function data(value,depth=0){if(depth>12)throw Error('Command nesting is too deep');if(typeof value==='number'&&!Number.isFinite(value))throw Error('Use finite dimensions');if(typeof value==='string'&&value.length>2000)throw Error('Command text is too long');if(value===null||['string','number','boolean'].includes(typeof value))return;if(Array.isArray(value)){if(value.length>200)throw Error('Command array is too large');value.forEach(v=>data(v,depth+1));return;}if(!object(value))throw Error('Use JSON command data');for(const [k,v]of Object.entries(value)){if(['__proto__','prototype','constructor','step','script','code'].includes(k))throw Error('Unsupported command field');data(v,depth+1);}}
// Document edits share the same revision guard, transactional build and Undo history as geometry.
const actionIds=v=>Array.isArray(v)&&v.length>0&&v.length<=30&&v.every(idOK)&&new Set(v).size===v.length;
function validateAction(a){
 if(!object(a))throw Error('Invalid document action');
 switch(a.kind){
  case 'clear':if(a.confirm!==true)throw Error('Clearing a project requires confirm:true');break;
  case 'delete':if(!actionIds(a.ids)||a.cascade!==undefined&&typeof a.cascade!=='boolean')throw Error('Invalid feature delete action');break;
  case 'deleteBodies':if(!Array.isArray(a.ids)||!a.ids.length||a.ids.length>30||a.ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_:-]{1,100}$/.test(id))||new Set(a.ids).size!==a.ids.length||!idOK(a.featureId)||a.confirm!==true)throw Error('Deleting visible bodies requires IDs, featureId and confirm:true');break;
  case 'renameFeature':if(!idOK(a.id)||typeof a.name!=='string'||!a.name.trim()||a.name.length>80)throw Error('Invalid feature rename action');break;
  case 'setTitle':if(typeof a.title!=='string'||!a.title.trim()||a.title.length>80)throw Error('Invalid project title');break;
  case 'setVisibility':if(!Array.isArray(a.ids)||!a.ids.length||a.ids.length>30||a.ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_:-]{1,100}$/.test(id))||typeof a.visible!=='boolean')throw Error('Invalid visibility action');break;
  default:throw Error('Unsupported document action');
 }
}
function validateWorkspaceControl(c){
 if(!object(c))throw Error('Invalid workspace control');
 switch(c.kind){
  case 'undo':case 'redo':case 'fit':case 'clearSelection':break;
  case 'view':if(!['iso','top','bottom','front','back','left','right'].includes(c.view))throw Error('Invalid camera view');break;
  case 'display':if(!['shaded','shadedEdges','wireframe','xray'].includes(c.mode))throw Error('Invalid display mode');break;
  case 'grid':if(typeof c.visible!=='boolean')throw Error('Invalid grid state');break;
  case 'select':
   if(!Array.isArray(c.refs)||!c.refs.length||c.refs.length>24||c.refs.some(r=>!object(r)||typeof r.id!=='string'||!/^[a-zA-Z0-9_:-]{1,100}$/.test(r.id)||!['body','sketch','face','edge'].includes(r.kind)||(['face','edge'].includes(r.kind)&&(!Number.isInteger(r.index)||r.index<0))))throw Error('Invalid CAD selection');
   break;
  default:throw Error('Unsupported workspace control');
 }
}
function featureReference(value,ids){
 if(typeof value==='string')return ids.has(value.split(':')[0]);
 if(Array.isArray(value))return value.some(v=>featureReference(v,ids));
 if(object(value))return Object.values(value).some(v=>featureReference(v,ids));
 return false;
}
function applyDocumentAction(doc,a){
 const find=id=>{const feature=doc.features.find(f=>f.id===id);if(!feature)throw Error('Feature not found: '+id);return feature;};
 doc.ui||={hidden:[],colors:{}};
 if(a.kind==='clear'){doc.features=[];doc.ui={hidden:[],colors:{},bridgeApplied:[...(doc.ui.bridgeApplied||[])]};return;}
 if(a.kind==='setTitle'){doc.title=a.title.trim();return;}
 if(a.kind==='renameFeature'){find(a.id).name=a.name.trim();return;}
 if(a.kind==='setVisibility'){
  for(const id of a.ids)if(!doc.features.some(f=>f.id===id.split(':')[0]))throw Error('Visibility target not found: '+id);
  const hidden=new Set(doc.ui.hidden||[]);
  for(const id of a.ids)a.visible?hidden.delete(id):hidden.add(id);
  doc.ui.hidden=[...hidden];return;
 }
 if(a.kind==='deleteBodies'){
  if(doc.features.some(f=>f.id===a.featureId))throw Error('Deletion feature ID already exists');
  for(const id of a.ids)if(!doc.features.some(f=>f.id===id.split(':')[0]))throw Error('Body history feature not found: '+id);
  doc.features.push({id:a.featureId,type:'delete',name:'Delete bodies',params:{},inputs:[...a.ids]});return;
 }
 if(a.kind==='delete'){
  const removed=new Set(a.ids);for(const id of removed)find(id);
  let changed=true;while(changed){changed=false;for(const f of doc.features){
   if(removed.has(f.id))continue;
   if(featureReference(f.inputs,removed)||featureReference(f.params,removed)){
    if(!a.cascade)throw Error('Dependent feature '+f.id+' exists. Use cascade:true to delete it as well.');
    removed.add(f.id);changed=true;
   }
  }}
  doc.features=doc.features.filter(f=>!removed.has(f.id));
  doc.ui.hidden=(doc.ui.hidden||[]).filter(id=>!removed.has(id.split(':')[0]));
  if(Array.isArray(doc.ui.smartDimensions))doc.ui.smartDimensions=doc.ui.smartDimensions.filter(pin=>!['id','source','target'].some(key=>typeof pin[key]==='string'&&removed.has(pin[key].split(':')[0])));
  for(const id of Object.keys(doc.ui.colors||{}))if(removed.has(id.split(':')[0]))delete doc.ui.colors[id];
 }
}
export function validateBridgeCommand(c){
 if(!object(c)||!idOK(c.id)||typeof c.title!=='string'||!c.title.trim()||c.title.length>120||!/^[a-f0-9]{64}$/.test(c.expectedRevision||''))throw Error('Command needs id, title and current expectedRevision');
 const features=c.features||[],updates=c.updates||[],actions=c.actions||[],controlCount=c.control===undefined?0:1;if(!Array.isArray(features)||!Array.isArray(updates)||!Array.isArray(actions)||features.length+updates.length+actions.length+controlCount<1||features.length+updates.length+actions.length+controlCount>30)throw Error('Use 1–30 CAD operations per command');if(actions.some(a=>a?.kind==='clear')&&features.length+updates.length+actions.length+controlCount!==1)throw Error('Clear must be a standalone command');if(controlCount){if(features.length||updates.length||actions.length)throw Error('Workspace control must be a standalone command');validateWorkspaceControl(c.control);}actions.forEach(validateAction);
 const ids=new Set();for(const f of features){if(!object(f)||f.name!==undefined&&(typeof f.name!=='string'||f.name.length>80)||!idOK(f.id)||ids.has(f.id)||!BRIDGE_TYPES.includes(f.type)||!object(f.params)||!Array.isArray(f.inputs)||f.inputs.length>32||f.inputs.some(v=>typeof v!=='string'||!/^[a-zA-Z0-9_:-]{1,100}$/.test(v)))throw Error('Invalid CAD feature');ids.add(f.id);}
 for(const f of updates)if(!object(f)||!idOK(f.id)||!object(f.params))throw Error('Invalid feature update');data(c);if(new TextEncoder().encode(JSON.stringify(c)).byteLength>48000)throw Error('Command exceeds 48 KB');return c;
}
export async function bridgeRevision(doc){const bytes=new TextEncoder().encode(JSON.stringify({features:doc.features,title:doc.title||'Untitled'}));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
export async function applyBridgeCommand(doc,command){validateBridgeCommand(command);if(command.control)throw Error('Workspace control must execute in the paired CAD client');if(await bridgeRevision(doc)!==command.expectedRevision)throw Error('Project changed. Read its current state and send a new command.');const next=JSON.parse(JSON.stringify(doc));for(const action of command.actions||[])applyDocumentAction(next,action);for(const change of command.updates||[]){const f=next.features.find(f=>f.id===change.id);if(!f||!BRIDGE_TYPES.includes(f.type))throw Error('Cannot update this feature');f.params={...f.params,...change.params};}for(const f of command.features||[]){if(next.features.some(v=>v.id===f.id))throw Error('Feature id already exists');next.features.push({id:f.id,type:f.type,name:(f.name||f.type).slice(0,80),params:f.params,inputs:f.inputs});}if(next.features.length>150)throw Error('Project feature limit reached');next.ui||={hidden:[],colors:{}};next.ui.bridgeApplied=[...(next.ui.bridgeApplied||[]),command.id].slice(-100);return next;}
export function bridgeSummary(doc,items,workspace){const summary={workspace:workspace||undefined,title:doc.title||'Untitled',units:'mm',hidden:doc.ui?.hidden||[],features:doc.features.map(f=>({id:f.id,type:f.type,name:f.name,params:f.type==='import'?{externalGeometry:true}:f.params,inputs:f.inputs})),bodies:items.filter(i=>i.kind==='body').slice(0,12).map(i=>({id:i.id,name:i.name,volume:i.volume,bounds:i.bounds,edges:(i.edges||[]).slice(0,32).map(e=>({index:e.index,type:e.type,center:e.center,length:e.length,faceIndices:e.faceIndices,reference:e.reference})),faces:i.faceInfo.slice(0,24).map(f=>({index:f.index,type:f.type,center:f.center,normal:f.normal,area:f.area,cylinder:f.cylinder,reference:f.reference}))})),featureLimit:150};if(new TextEncoder().encode(JSON.stringify(summary)).byteLength>48000){summary.truncated=true;summary.features=summary.features.map(f=>({...f,name:f.name?.slice(0,40),inputs:f.inputs.slice(0,8),params:{omitted:true}}));summary.bodies=summary.bodies.slice(0,8).map(b=>({...b,faces:b.faces.slice(0,6),edges:b.edges.slice(0,8)}));}if(new TextEncoder().encode(JSON.stringify(summary)).byteLength>48000){summary.truncated=true;summary.features=doc.features.map(f=>({id:f.id,type:f.type}));summary.bodies=summary.bodies.map(b=>({id:b.id,name:b.name?.slice(0,40),volume:b.volume,bounds:b.bounds}));}return summary;}
