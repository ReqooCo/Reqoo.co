// 0700 collection workspace. Five existing ISO reports + Status Dosing.
(function(){
'use strict';
const el=id=>document.getElementById('m_'+id);
const keys=['twFlowHourly','cwt1','cwt2','production','designCapacity','monthlyAverage','rwAbst','pondA','pondB','pondC','pondChange','pondStorage','pondTwlCapacity','pondTwlLevel','criticalLevel','criticalPercent','criticalStorage','intakeB','wt1','sjamB','sjamCActual','intakeCHourly','sjamCHourly','dp1','dp2','dpOutHourly','dpPressure'];
const extraKeys=['sivTarget','sivStatus','sivChallengeA','sivChallengeB','rwTotalizerPrevious','rwTotalizerCurrent','rwTotalizerUnit','twTotalizerPrevious','twTotalizerCurrent','twTotalizerUnit','pondCFlowValue','pondCFlowUnit','pondANote','oRwp','oTwp'];
const defaults={designCapacity:'100',pondTwlCapacity:'3984.50',pondTwlLevel:'12.0',criticalLevel:'7.50',criticalPercent:'30.00',criticalStorage:'1226'};
const settingKeys=Object.keys(defaults).concat(['pondANote','sivChallengeA','sivChallengeB']);
const noteDefault='Bacaan level tidak tepat disebabkan SCADA intake A lost communication';
const sivDefaultA='Kaedah pengiraan pengeluaran LRA Semenyih 2 :\nPengeluaran LRA Semenyih 2 = Bacaan Totalizer Tw (Semasa) - Bacaan Totalizer Tw (Sebelum)';
const sivDefaultB='Pihak LRA Semenyih 2 Perlu mengawal Paras Kolam Desa Putra pada 3.00m - 7.83m seperti diminta SO bagi memenuhi Demand.';
let expectedUpdatedAt=null,step='readings',dosing={},previous=null,previousDate='',editVersion=0,dirty=false,dateToken=0;
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
function putJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
const localDate=()=>{const d=new Date();return new Date(d.valueOf()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const storedKey=()=> 'rqS2Morning0700-'+get('date');
const previousDay=date=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)};
const sivMonths=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
const sivTargetKey=()=> 'rqS2MorningSivTarget-'+get('date').slice(0,7);
const sivTargetInitial=()=>localStorage.getItem(sivTargetKey())||(get('date').slice(0,7)==='2026-10'?'84.300':'');

const get=id=>String(el(id)?.value??'').trim();
const n=id=>{const x=get(id);if(!x||x==='-')return null;const z=Number(x);return Number.isFinite(z)?z:null};
const valid=x=>x!==null&&Number.isFinite(x);
const all=(...x)=>x.every(valid);
const number=(x,dp=3)=>valid(x)?x.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}):'-';
const unit=(id,dp,suffix)=>valid(n(id))?number(n(id),dp)+suffix:'-';
const mld=id=>valid(n(id))&&n(id)===0?'0 Mld':unit(id,3,'Mld');
const metres=id=>unit(id,2,'m');
const hours=id=>unit(id,0,'m³/hr');
const valueOr=(x,dp,suffix)=>valid(x)?number(x,dp)+suffix:'-';
const sum=(...x)=>all(...x)?x.reduce((a,b)=>a+b,0):null;
const sub=(x,y)=>all(x,y)?x-y:null;
const mldFromHour=id=>valid(n(id))?n(id)*24/1000:null;
const dmy=()=>{const p=get('date').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'-'};
const month=()=>{const dt=new Date(get('date')+'T12:00:00Z');return Number.isFinite(dt.valueOf())?new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(dt):'Monthly'};
const head=(plant=true)=>[].concat(plant?['*LRA Semenyih 2*']:[],[plant?'*_'+dmy()+'_*':'*'+dmy()+'*',plant?'*_0700a.m_*':'*0700a.m*','']);
const problemA=()=>el('pondAProblem').checked;
const pondA=()=>metres('pondA')+(problemA()?'*':'');
const change=(includeUnit=true)=>{const raw=get('pondChange'),x=n('pondChange');return metres('pondC')+' ('+(valid(x)?(raw.startsWith('+')?'+':'')+number(x,2)+(includeUnit?'m':''):'-')+')'};
const storage=()=>unit('pondStorage',2,'ML');
function metrics(){
 const prod=n('production'),design=n('designCapacity'),st=n('pondStorage'),
  cap=n('pondTwlCapacity'),critical=n('criticalStorage');
 const inflow=sum(n('intakeB'),n('wt1'),n('sjamB'));
 const outflow=sum(n('rwAbst'),n('sjamCActual'));
 const forecastWtp=mldFromHour('intakeCHourly'),forecastSjam=valid(n('sjamCHourly'))&&n('sjamCHourly')>=0?mldFromHour('sjamCHourly'):null;
 const forecastTotal=sum(forecastWtp,forecastSjam);
 const margin=sub(prod,design);
 return {
 margin,marginPct:all(margin,design)&&design>0?margin/design*100:null,
 percent:all(st,cap)&&cap>0?st/cap*100:null,
 inflow,outflow,net:sub(inflow,outflow),
 usable:all(st,critical)?Math.max(0,st-critical):null,
 days:all(st,critical,forecastTotal)&&forecastTotal>0?Math.max(0,(st-critical)/forecastTotal):null,
 forecastWtp,forecastSjam,dpMld:mldFromHour('dpOutHourly')
 };
}
function sivReport(){
 const prod=n('production'),target=n('sivTarget'),diff=all(prod,target)?prod-target:null;
 const percent=valid(diff)&&target>0?Math.abs(diff)/target*100:null;
 const status=get('sivStatus')==='not'?'Not achieved':get('sivStatus')==='achieved'?'Achieved':valid(diff)&&diff>0?'Not achieved':'Achieved';
 const monthNum=Number(get('date').slice(5,7))-1;
 const monthly=(sivMonths[monthNum]||'')+' '+get('date').slice(0,4);
 const formattedProd=valid(prod)?prod.toFixed(3):'-';
 const formattedTarget=valid(target)?target.toFixed(3):'-';
 const differenceText=valid(diff)?Math.abs(diff).toFixed(3):'-';
 const percentText=valid(percent)?percent.toFixed(3):'-';
 const increase=valid(diff)&&diff<0?'Penurunan':'Peningkatan';
 return [
  '*SIV '+status+' today*',
  '*LRA SEMENYIH 2*',
  '*Date : '+dmy()+'*','',
  '*1.Current Performance :*',
  'Pengeluaran - '+formattedProd+'MLD',
  'Sasaran '+monthly+' - '+formattedTarget+'MLD',
  increase+' - '+differenceText+'MLD ('+percentText+'%)','',
  '*2. Challenges :*',
  'a) '+(get('sivChallengeA')||sivDefaultA),'',
  'b. '+(get('sivChallengeB')||sivDefaultB),'',
  'Note:',
  'Jumlah Demand LRA Semenyih 2 : *'+formattedProd+'Mld* (Sasaran '+monthly+': '+formattedTarget+'Mld)'
 ].join('\n');
}
function sivValid(){
 const prod=n('production'),target=n('sivTarget');
 if(!valid(prod))return 'Format 5 memerlukan Total Prod di bahagian 01.';
 if(!valid(target)||target<=0)return 'Format 5 memerlukan Sasaran SIV yang sah.';
 return '';
}
function reportText(format){
 if(format===6)return dosingReport();
 if(format===5)return sivReport();
 const r=metrics(),h=head(format===1||format===2);
 const percentage='*'+valueOr(r.percent,2,'%')+'*';
 const days=valid(r.days)?'*'+number(r.days,1)+'*':'-';
 const critLevel=unit('criticalLevel',2,'m'),critPct=unit('criticalPercent',2,'%');
 const critLine='Storage to critical level ('+critLevel+', '+critPct+'): '+unit('criticalStorage',0,' ML')+',';
 const sources=['Abstraction (from pond B) :','Intake B : '+mld('intakeB')+',','WT1 : '+mld('wt1'),'SJAM B : '+mld('sjamB')];
 let l=[];
 if(format===1){
  l=h.concat([
   'Total Prod : '+mld('production'),'Design Capacity : '+mld('designCapacity'),
   'Margin : '+valueOr(r.margin,3,'Mld')+' ('+valueOr(r.marginPct,3,'%')+')',
   'Ave '+month()+' Prod : '+mld('monthlyAverage'),'RW Abst : '+mld('rwAbst'),'',
   '*Pond A*','Level : '+pondA(),'','*Pond B*','Level : '+metres('pondB'),'',
   '*Pond C (ORS)*','Level: '+change()+',','Storage: '+storage()+',',
   'Percentage: '+percentage+','
  ],sources,[
   'Pumped (to WTP) : '+mld('rwAbst'),'',
   '*Kolam Desa Putra*',
   'No.1 : '+metres('dp1'),'No.2 : '+metres('dp2'),
   'Outflow : '+unit('dpOutHourly',0,'m3/h')+' @ '+valueOr(r.dpMld,3,'Mld'),
   'Delivery Pressure : '+unit('dpPressure',2,'bar')
  ]);
  if(problemA()){
   const note=(get('pondANote')||noteDefault).replace(/\*/g,'').trim();
   l.push('','*_'+note+'_*');
  }
 }else if(format===2){
  l=h.concat([
   'Total Prod : '+mld('production'),
   'Ave '+month()+' Prod : '+mld('monthlyAverage'),'RW Abst : '+mld('rwAbst'),'',
   'Kolam Desa Putra','No.1 : '+metres('dp1'),'No.2 : '+metres('dp2'),'',
   '*ORS Semenyih 2 (Pond C):*','Level: '+change(false)+',',
   'Storage: '+storage()+',','Percentage: '+percentage,
   critLine,'Days to critical storage (without Pond B abstraction) : '+days+' days.',
   '(Intake C : '+valueOr(r.forecastWtp,3,'Mld')+')',
   '(SJAM C to SS Intake : '+valueOr(r.forecastSjam,0,'Mld')+')'
  ],sources,[
   'Pumped (to WTP) : '+mld('rwAbst'),
   'Pumped (to SS Intake) : '+mld('sjamCActual')
  ]);
 }else if(format===3){
  const inflow=valueOr(r.inflow,3,'Mld'),outflow=valueOr(r.outflow,3,'Mld');
  l=h.concat([
   '*_Pond C_*','','Level        : '+metres('pondC'),
   'Capacity  : '+(valid(n('pondStorage'))?number(n('pondStorage'),2)+'ML ('+number(n('pondStorage')/1000,2)+'MCM)':'-'),'',
   'Inflow from Pond B',
   '_i) Intake B : '+mld('intakeB')+'_',
   '_ii) WT1       : '+mld('wt1')+'_',
   '_iii) SJAM B : '+mld('sjamB')+'_',
   '_Total : '+inflow+'_','',
   'Outflow from Pond C',
   '_i) Intake C to WTP           : '+mld('rwAbst')+'_',
   '_ii) SJAM C to SS Intake  : '+mld('sjamCActual')+'_',
   '_Total : '+outflow+'_','',
   '*Total volume pumped to Pond C : '+inflow+' - '+outflow+' = '+valueOr(r.net,3,'ML/day')+'*','',
   'Critical WL : '+critLevel+'('+critPct+')',
   '_i) Outflow to WTP : '+hours('intakeCHourly')+' ('+valueOr(r.forecastWtp,3,'Mld')+')_',
   '_ii) Outflow SJAM C to SS Intake : '+hours('sjamCHourly')+' ('+valueOr(r.forecastSjam,0,'Mld')+')_',
   '_iii) Day to critical level : '+days+' days_'
  ]);
 }else if(format===4){
  l=h.concat([
   '*ORS Semenyih 2 (Pond C):*',
   'Level: '+metres('pondC')+' (TWL '+unit('pondTwlLevel',1,'m')+'),',
   'Storage: '+storage()+',','Percentage: '+percentage,
   critLine,'Days to critical storage (without Pond B abstraction) : '+days+' days.'
  ]);
 }
 return l.join('\n').replace(/\n{3,}/g,'\n\n');
}
const groupSpecs=[
 {key:'pac',title:'PAC',header:'*PAC (current/max)*',mode:'Auto',rows:[['pac1a','Dosing Pump 1A','232','liquid'],['pac1b','Dosing Pump 1B','320','liquid'],['pac2a','Dosing Pump 2A','320','liquid'],['pac2b','Dosing Pump 2B','320','liquid']]},
 {key:'lime',title:'Lime',header:'*Lime (current/max)*',mode:'Auto',rows:[['lime1pre','Pre Feeder','29','solid','*Silo 1*'],['lime1inter','Inter Feeder','19','solid'],['lime1post','Post Feeder','29','solid'],['lime2pre','Pre Feeder','29','solid','*Silo 2*'],['lime2inter','Inter Feeder','19','solid'],['lime2post','Post Feeder','29','solid']]},
 {key:'fluoride',title:'Fluoride',header:'*Fluoride (current/max)*',mode:'Manual',rows:[['fl1','Metering Pump no.1','2.54','fluoride'],['fl2','Metering Pump no.2','2.40','fluoride']]},
 {key:'chlorine',title:'Chlorine',header:'*Chlorine (current/max)*',mode:'Auto',rows:[['clPre1','Pre Chlorinator 1','12','solid'],['clPre2','Pre Chlorinator 2','12','solid'],['clInter1','Inter Chlorinator 1','12','solid'],['clInter2','Inter Chlorinator 2','12','solid'],['clPost1','Post Chlorinator 1','18','post'],['clPost2','Post Chlorinator 2','18','post']]},
 {key:'carbon',title:'Activated Carbon',header:'*Activated Carbon*',rows:[['carbon1','Feeder 1','21','other'],['carbon2','Feeder 2','21','other']]},
 {key:'polymer',title:'Polymer RTF',header:'*Polymer RTF (current/max)*',rows:[['poly1','Polymer Pump No. 1 (to STT)','17','other'],['poly2','Polymer Pump No. 2 (to STT)','17','other'],['poly3','Polymer Pump No. 3 (to Decanter)','280','other'],['poly4','Polymer Pump No. 4 (to Decanter)','280','other']]}
];
const pumpSpecs=groupSpecs.flatMap(g=>g.rows);
const dosingMeta={scd:['SCD','ICu',true],scdRange:['Julat SCD','','text'],calibration:['Service & calibrate','DD/MM/YYYY','text'],ph:['PH (TPO)','','number'],limeNote:['Nota Lime Silo 2 Inter','','text'],batching:['Fluoride preparation','','text'],fluorideResidual:['Residual Fluoride (TPO)','mg/L','number'],chlorineResidual:['Residual Chlorine (TPO)','mg/L','number'],postMode:['Post Chlorine Dosing Mode','','mode']};
function freshDosing(){
 const config=readJSON('rqS2MorningDosingConfig',{}),out={rows:{},groups:{},meta:{scd:'',scdRange:'-0.40 ~ -1.80',calibration:'10/09/2026',ph:'',limeNote:'#Dose to Post',batching:'Preparation Batching',fluorideResidual:'',chlorineResidual:'',postMode:'Manual',...config.meta}};
 for(const [id,,max] of pumpSpecs)out.rows[id]={status:config.rows?.[id]?.status==='Run'?'Run':'Standby',max:config.rows?.[id]?.max??max,rate:'',dose:'',hz:'',percent:'',other:''};
 for(const g of groupSpecs)out.groups[g.key]={mode:config.groups?.[g.key]?.mode||g.mode||'',reviewed:false};
 return out;
}
function dosingConfiguration(){
 return {rows:Object.fromEntries(pumpSpecs.map(([id])=>[id,{status:dosing.rows[id].status,max:dosing.rows[id].max}])),groups:Object.fromEntries(groupSpecs.map(g=>[g.key,{mode:dosing.groups[g.key].mode}])),meta:Object.fromEntries(['scdRange','calibration','limeNote','batching','postMode'].map(k=>[k,dosing.meta[k]]))};
}
function escapeText(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function numericInput(id,label,value='',signed=false){return '<div class="field"><label for="m_'+id+'">'+escapeText(label)+'</label><input id="m_'+id+'" inputmode="'+(signed?'text':'decimal')+'" autocomplete="off" enterkeyhint="next" value="'+escapeText(value)+'" placeholder="—"></div>'}
function modeSelect(id,label,value){return '<div class="field"><label for="m_'+id+'">'+label+'</label><select id="m_'+id+'"><option'+(value==='Auto'?' selected':'')+'>Auto</option><option'+(value==='Manual'?' selected':'')+'>Manual</option></select></div>'}
function renderDosingUI(){
 const host=el('dosingGroups');host.replaceChildren();
 for(const g of groupSpecs){
  const card=document.createElement('section');card.className='card';card.id='m_dg_'+g.key;
  const title=document.createElement('h3');title.textContent=g.title;card.append(title);host.append(card);
  for(const [id,label,,kind,sub] of g.rows){
   const row=dosing.rows[id];
   const wrap=document.createElement('div');wrap.className='dosingRow';
   let fields='';
   if(kind==='fluoride')fields+=numericInput(id+'_hz','Hz',row.hz)+numericInput(id+'_percent','%',row.percent);
   if(kind==='other')fields+= '<div class="field full"><label for="m_'+id+'_other">Bacaan semasa (ikut format asal)</label><input id="m_'+id+'_other" value="'+escapeText(row.other)+'" placeholder="Kadar@dos"></div>';
   else fields+=numericInput(id+'_rate',kind==='liquid'?'L/hr':kind==='fluoride'?'l/hr':kind==='post'?'Kg/hr':'kg/hr',row.rate)+numericInput(id+'_dose','mg/L',row.dose);
   wrap.innerHTML=(sub?'<p><b>'+escapeText(sub.replace(/\*/g,''))+'</b></p>':'')+'<div class="dosingHeading"><label for="m_'+id+'_status">'+escapeText(label)+'</label><select id="m_'+id+'_status"><option'+(row.status==='Standby'?' selected':'')+'>Standby</option><option'+(row.status==='Run'?' selected':'')+'>Run</option></select></div><div class="dosingValues grid" id="m_'+id+'_values"'+(row.status==='Standby'?' hidden':'')+'>'+fields+'</div><details class="dosingMax"><summary>Max '+escapeText(row.max)+'mg/L · tetapan</summary>'+numericInput(id+'_max','Max (mg/L)',row.max)+'</details>';
   card.append(wrap);
   for(const prop of ['status','rate','dose','hz','percent','other','max']){
    const input=el(id+'_'+prop);if(!input)continue;
    input.addEventListener(prop==='status'?'change':'input',()=>{
     row[prop]=input.value.trim();dosing.groups[g.key].reviewed=false;el('review_'+g.key).checked=false;
     el(id+'_values').hidden=row.status!=='Run';changed();
    });
   }
  }
  const metaKeys=g.key==='pac'?['scd','scdRange','calibration']:g.key==='lime'?['ph','limeNote']:g.key==='fluoride'?['batching','fluorideResidual']:g.key==='chlorine'?['chlorineResidual','postMode']:[];
  const meta=document.createElement('div');meta.className='grid';
  meta.innerHTML=(g.mode?modeSelect('mode_'+g.key,'Dosing Mode',dosing.groups[g.key].mode):'')+metaKeys.map(k=>{
   const [label,unit,type]=dosingMeta[k];return type==='mode'?modeSelect('meta_'+k,label,dosing.meta[k]):type==='text'?'<div class="field full"><label for="m_meta_'+k+'">'+label+'</label><input id="m_meta_'+k+'" value="'+escapeText(dosing.meta[k])+'"></div>':numericInput('meta_'+k,label+(unit?' ('+unit+')':''),dosing.meta[k],type===true);
  }).join('');card.append(meta);
  if(g.mode)el('mode_'+g.key).addEventListener('change',()=>{dosing.groups[g.key].mode=el('mode_'+g.key).value;dosing.groups[g.key].reviewed=false;el('review_'+g.key).checked=false;changed()});
  for(const k of metaKeys)el('meta_'+k).addEventListener(dosingMeta[k][2]==='mode'?'change':'input',()=>{dosing.meta[k]=el('meta_'+k).value.trim();dosing.groups[g.key].reviewed=false;el('review_'+g.key).checked=false;changed()});
  const review=document.createElement('label');review.className='collectCheck';
  const check=document.createElement('input');check.id='m_review_'+g.key;check.type='checkbox';check.checked=dosing.groups[g.key].reviewed===true;
  check.addEventListener('change',()=>{dosing.groups[g.key].reviewed=check.checked;changed()});
  review.append(check,document.createTextNode('Saya sudah semak status dan bacaan '+g.title+' hari ini'));card.append(review);host.append(card);
 }
}
function dosingLine(spec){
 const [id,label,,kind]=spec,r=dosing.rows[id];
 const val=r.status==='Standby'?(id.startsWith('poly')?'standby':'Standby'):kind==='other'?(r.other||'-'):kind==='fluoride'?(r.hz||'-')+'Hz/'+(r.percent||'-')+'%/'+(r.rate||'-')+'l/hr@'+(r.dose||'-')+'mg/L':(r.rate||'-')+(kind==='liquid'?'L/hr':kind==='post'?'Kg/hr':'kg/hr')+'@'+(r.dose||'-')+'mg/L';
 return label+' : '+val+'/'+(r.max||'-')+'mg/L';
}
function dosingReport(){
 const L=['*Status Dosing WTP Semenyih 2*',dmy()+'@0700hrs','','Pengepaman Semasa : ','RW : '+get('oRwp')+' Mld','TW : '+get('oTwp')+' Mld','','RW Inflow : '+valueOr(criticalFlowMld(),3,'Mld'),'TW Outflow : '+valueOr(mldFromHour('twFlowHourly'),3,'Mld'),''];
 for(const g of groupSpecs){
  L.push(g.header);
  if(g.key==='fluoride')L.push(dosing.meta.batching);
  g.rows.forEach((spec,i)=>{
   if(spec[4]){if(i)L.push('');L.push(spec[4])}
   if(g.key==='chlorine'&&(i===2||i===4))L.push('');
   if(g.key==='polymer'&&i===2)L.push('');
   L.push(dosingLine(spec));
   if(spec[0]==='lime2inter'&&dosing.meta.limeNote)L.push('_'+dosing.meta.limeNote+'_');
   if(g.key==='chlorine'&&i===1)L.push('Dosing Mode : '+dosing.groups.chlorine.mode);
  });
  if(g.key==='pac')L.push('Dosing Mode : '+dosing.groups.pac.mode,'','SCD : '+(dosing.meta.scd||'-')+'ICu (range '+dosing.meta.scdRange+')(service & calibrate @ '+dosing.meta.calibration+')');
  if(g.key==='lime')L.push('PH (TPO) : '+(dosing.meta.ph||'-'),'Dosing Mode : '+dosing.groups.lime.mode);
  if(g.key==='fluoride')L.push('Residual Fluoride (TPO) : '+(dosing.meta.fluorideResidual||'-')+'mg/L','Dosing Mode : '+dosing.groups.fluoride.mode);
  if(g.key==='chlorine')L.push('Residual Chlorine (TPO) : '+(dosing.meta.chlorineResidual||'-')+'mg/L','Dosing Mode : '+dosing.meta.postMode);
  L.push('');
 }
 return L.join('\n').trimEnd();
}
function criticalFlowMld(){const value=n('pondCFlowValue');return valid(value)&&value>0&&value<=41666.6667?value*24/1000:null}
function storageFromLevel(level){return valid(level)&&level>=7.5&&level<=12?Math.round((1226+(level-7.5)*613)*100)/100:null}
function calculate(){
 el('intakeCHourly').value=get('pondCFlowValue');
 const compatible=n('pondTwlLevel')===12&&n('pondTwlCapacity')===3984.5;
 if(el('storageAuto').checked)el('pondStorage').value=compatible&&valid(storageFromLevel(n('pondC')))?storageFromLevel(n('pondC')).toFixed(2):'';
 if(el('criticalStorageAuto').checked)el('criticalStorage').value=compatible&&valid(storageFromLevel(n('criticalLevel')))?storageFromLevel(n('criticalLevel')).toFixed(2):'';
 el('criticalPercent').value=all(n('criticalStorage'),n('pondTwlCapacity'))&&n('pondTwlCapacity')>0?(n('criticalStorage')/n('pondTwlCapacity')*100).toFixed(2):'';
 el('criticalPercent').readOnly=true;
 el('storageStatus').textContent='Auto storage guna'+' model rujukan 613 ML/m dalam julat 7.50–12.00m. Semak atau gunakan storage manual jika rujukan berbeza.';
 el('pondStorage').readOnly=el('storageAuto').checked;el('criticalStorage').readOnly=el('criticalStorageAuto').checked;
 const r=metrics();
 const values={rwMld:valueOr(criticalFlowMld(),3,' MLD'),twMld:valueOr(mldFromHour('twFlowHourly'),3,' MLD'),margin:valueOr(r.margin,3,' MLD'),storageShown:valueOr(n('pondStorage'),2,' ML'),percent:valueOr(r.percent,2,'%'),dpMld:valueOr(r.dpMld,3,' MLD'),net:valueOr(r.net,3,' ML/day'),days:valueOr(r.days,1,' hari')};
 for(const [id,text] of Object.entries(values))el(id).textContent=text;
 el('pondANoteWrap').hidden=!problemA();el('firstDayAverage').hidden=!get('date').endsWith('-01');
}
const reportNames=['Pengeluaran & Status Kolam','Pengeluaran & ORS Pond C','Kiraan Aliran Pond C','Ringkasan ORS Pond C','SIV','Status Dosing'];
const reportFields={1:['production','designCapacity','monthlyAverage','rwAbst','pondA','pondB','pondC','pondChange','pondStorage','pondTwlCapacity','intakeB','wt1','sjamB','dp1','dp2','dpOutHourly','dpPressure'],2:['production','monthlyAverage','rwAbst','dp1','dp2','pondC','pondChange','pondStorage','pondTwlCapacity','criticalLevel','criticalPercent','criticalStorage','pondCFlowValue','sjamCHourly','intakeB','wt1','sjamB','sjamCActual'],3:['pondC','pondStorage','intakeB','wt1','sjamB','rwAbst','sjamCActual','criticalLevel','criticalPercent','criticalStorage','pondCFlowValue','sjamCHourly'],4:['pondC','pondStorage','pondTwlLevel','pondTwlCapacity','criticalLevel','criticalPercent','criticalStorage','pondCFlowValue','sjamCHourly'],5:['production','sivTarget'],6:['pondCFlowValue','twFlowHourly','oRwp','oTwp']};
function reportIssues(no){
 const out=[];
 const date=get('date'),parsedDate=new Date(date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsedDate.valueOf())||parsedDate.toISOString().slice(0,10)!==date)out.push('date');
 for(const k of reportFields[no]){
  const raw=get(k);if(k==='pondA'&&problemA()&&!raw)continue;
  const regex=k==='pondChange'?/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/:/^(?:\d+(?:\.\d+)?|\.\d+)$/;
  if(!raw||!regex.test(raw)||!Number.isFinite(Number(raw))||(['designCapacity','pondTwlCapacity','sivTarget','pondCFlowValue'].includes(k)&&Number(raw)<=0))out.push(k);
 }
 if(reportFields[no].includes('pondCFlowValue')&&!valid(criticalFlowMld())&&!out.includes('pondCFlowValue'))out.push('pondCFlowValue');
 if(no<=4){
  if(n('pondC')<7.5||n('pondC')>12)out.push('pondC');
  if(n('pondStorage')>n('pondTwlCapacity'))out.push('pondStorage');
  if(no>=2&&(n('criticalLevel')<7.5||n('criticalLevel')>12||n('criticalStorage')>n('pondTwlCapacity')))out.push('criticalLevel');
 }
 if(no===6){
  if(!['63','126'].includes(get('oRwp')))out.push('oRwp');
  if(!['50','100'].includes(get('oTwp')))out.push('oTwp');
  for(const g of groupSpecs){
   for(const [id,,,kind] of g.rows){
    const r=dosing.rows[id];
    if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(r.max)||!Number.isFinite(Number(r.max))||Number(r.max)<=0)out.push(id+'_max');
    if(r.status==='Run')for(const prop of kind==='other'?['other']:kind==='fluoride'?['hz','percent','rate','dose']:['rate','dose']){
     if(prop==='other'?!r.other||/[\r\n]/.test(r.other):! /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(r[prop])||!Number.isFinite(Number(r[prop])))out.push(id+'_'+prop);
     else if(prop==='percent'&&Number(r[prop])>100)out.push(id+'_'+prop);
    }
   }
   if(!dosing.groups[g.key].reviewed)out.push('review_'+g.key);
  }
  for(const key of ['scd','ph','fluorideResidual','chlorineResidual']){
   if(!(key==='scd'?/^-?(?:\d+(?:\.\d+)?|\.\d+)$/:/^(?:\d+(?:\.\d+)?|\.\d+)$/).test(dosing.meta[key])||!Number.isFinite(Number(dosing.meta[key])))out.push('meta_'+key);
  }
 }
 return out;
}
function fieldLabel(id){return document.querySelector('label[for="m_'+id+'"]')?.textContent.trim()||el(id)?.closest('label')?.textContent.trim()||id}
function focusIssue(id){
 setStep(id.startsWith('review_')||id.startsWith('meta_')||pumpSpecs.some(([p])=>id.startsWith(p+'_'))?'dosing':'readings',false);
 const target=el(id);if(!target)return;
 for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 target.setAttribute('aria-invalid','true');target.scrollIntoView({block:'center',behavior:'smooth'});target.focus({preventScroll:true});
}
function renderReports(){
 const checks=readJSON('rqS2MorningSix-'+get('date'),{});let ready=0;
 for(let no=1;no<=6;no++){
  const issues=reportIssues(no);if(!issues.length)ready++;
  el('preview_'+no).textContent=reportText(no);const link=el('reportLink_'+no);link.dataset.ready=String(!issues.length);
  link.querySelector('small').textContent=checks[String(no)]===true?'✓ Ditanda sudah dihantar':issues.length?issues.length+' perkara perlu disemak':'Lengkap · semak preview';
  el('done_'+no).checked=checks[String(no)]===true;
 }
 el('reportStatus').textContent=ready+'/6 laporan lengkap · '+Object.keys(checks).filter(k=>/^[1-6]$/.test(k)&&checks[k]===true).length+'/6 ditanda sudah dihantar';
}
function render(){calculate();renderReports()}
function formData(){
 const values={};for(const k of [...keys,...extraKeys])values[k]=get(k);
 values.storageOverrideDate=el('storageAuto').checked?'':get('date');
 values.forecastAuto=false;values.sjamForecastAuto=false;values.pondStorageAuto=el('storageAuto').checked;values.criticalStorageAuto=el('criticalStorageAuto').checked;
 values.pondAProblem=problemA();values.dosingJson=JSON.stringify(dosing);
 return {values,operator:get('operator'),expectedUpdatedAt};
}
function save(){
 if(!get('date'))return;
 try{
  putJSON(storedKey(),formData());localStorage.setItem('rqS2MorningOperator',get('operator'));
  putJSON('rqS2MorningSettings',Object.fromEntries(settingKeys.map(k=>[k,get(k)])));
  putJSON('rqS2MorningDosingConfig',dosingConfiguration());
  if(n('sivTarget')>0)localStorage.setItem(sivTargetKey(),get('sivTarget'));
  el('draft').textContent='Draf '+dmy()+' disimpan di telefon';
 }catch{el('draft').textContent='Draf belum dapat disimpan. Semak ruang storan telefon; salin laporan sebelum tutup.'}
}
function changed(){editVersion++;dirty=true;render();save()}
function apply(data){
 dosing=freshDosing();
 const values=data?.values||data||{};
 for(const k of [...keys,...extraKeys])if(el(k)&&values[k]!==undefined)el(k).value=String(values[k]);
 // Older drafts may store the dedicated rate in MLD. Convert only that field.
 if(values.pondCFlowUnit==='MLD'&&String(values.pondCFlowValue||'').trim())el('pondCFlowValue').value=String(Number(values.pondCFlowValue)*1000/24);
 el('pondCFlowUnit').value='m3h';
 // Only an explicit override saved by this version for this reporting date is reusable.
 el('storageAuto').checked=!(values.pondStorageAuto===false&&values.storageOverrideDate===get('date'));
 el('criticalStorageAuto').checked=values.criticalStorageAuto!==false;
 el('pondAProblem').checked=values.pondAProblem===true;
 if(data?.operator)el('operator').value=data.operator;
 if(values.dosingJson){
  try{
   const parsed=JSON.parse(values.dosingJson);
   for(const [id] of pumpSpecs)if(parsed.rows?.[id])Object.assign(dosing.rows[id],parsed.rows[id]);
   for(const g of groupSpecs)if(parsed.groups?.[g.key])Object.assign(dosing.groups[g.key],parsed.groups[g.key]);
   Object.assign(dosing.meta,parsed.meta||{});
  }catch{}
 }
 renderDosingUI();render();
}
function restore(){
 expectedUpdatedAt=null;dirty=false;editVersion++;previous=null;previousDate='';changeWasAuto=false;
 const config=readJSON('rqS2MorningSettings',{});
 for(const k of [...keys,...extraKeys])el(k).value=String(config[k]??defaults[k]??'');
 el('pondCFlowUnit').value='m3h';el('rwTotalizerUnit').value='m3';el('twTotalizerUnit').value='m3';
 el('pondANote').value=config.pondANote||noteDefault;el('sivTarget').value=sivTargetInitial();el('sivStatus').value='auto';
 el('sivChallengeA').value=config.sivChallengeA||sivDefaultA;el('sivChallengeB').value=config.sivChallengeB||sivDefaultB;
 el('oRwp').value='';el('oTwp').value='';
 el('storageAuto').checked=true;el('criticalStorageAuto').checked=true;el('pondAProblem').checked=false;
 document.querySelectorAll('#panel-morning [aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
 dosing=freshDosing();const draft=readJSON(storedKey(),null);
 if(draft){apply(draft);expectedUpdatedAt=typeof draft.expectedUpdatedAt==='string'?draft.expectedUpdatedAt:null}
 else{renderDosingUI();render()}
 el('draft').textContent=draft?'Draf '+dmy()+' dipulihkan':'Catatan baharu · '+dmy();el('onlineStatus').textContent='';
 return !!draft;
}
async function retrieve(manual=false,hasDraft=true){
 const code=localStorage.getItem('s2_access_key'),date=get('date'),version=editVersion;
 if(!code){el('onlineStatus').textContent='Draf boleh diisi offline. Access code S2 diperlukan untuk simpan online dan buka WhatsApp.';return}
 el('onlineStatus').textContent='Menyemak rekod online…';
 try{
  const res=await fetch('/api/s2-morning?date='+date,{headers:{'X-S2-Key':code},cache:'no-store'}),j=await res.json();
  if(get('date')!==date||version!==editVersion)return;
  if(!res.ok||!j.ok)throw Error(j.error||'Ralat database');
  if(!j.report){expectedUpdatedAt='';el('onlineStatus').textContent='Belum ada rekod online '+dmy()+'. Draf di telefon dikekalkan.';save();return}
  if(manual){
   if(version!==editVersion){el('onlineStatus').textContent='Bacaan sedang disunting. Tekan Rekod online semula selepas selesai.';return}
   if((dirty||keys.some(k=>!Object.prototype.hasOwnProperty.call(defaults,k)&&get(k)))&&!confirm('Gantikan draf tarikh ini dengan rekod online?'))return;
   apply(j.report);expectedUpdatedAt=j.report.updatedAt;dirty=false;save();
  }else if(!hasDraft&&version===editVersion){apply(j.report);expectedUpdatedAt=j.report.updatedAt;save()}
  el('onlineStatus').textContent='Rekod online tersedia · '+(j.report.operator||'-')+(expectedUpdatedAt!==j.report.updatedAt?' · Draf berbeza: tekan Rekod online untuk semak.':'');
 }catch(e){if(get('date')===date)el('onlineStatus').textContent='Online belum tersedia: '+e.message+'. Draf telefon dikekalkan.'}
}
async function loadPrevious(){
 const date=get('date'),version=editVersion,token=++dateToken,prior=previousDay(date),cached=readJSON('rqS2Morning0700-'+prior,null);
 previous=cached?.values||null;previousDate=date;
 const code=localStorage.getItem('s2_access_key');
 if(code)try{
  const res=await fetch('/api/s2-morning?date='+prior,{headers:{'X-S2-Key':code},cache:'no-store'}),j=await res.json();
  if(token!==dateToken||get('date')!==date)return;
  if(res.ok&&j.ok&&j.report)previous=j.report.values;
 }catch{}
 if(token!==dateToken||get('date')!==date)return;
 el('pondChangeStatus').textContent=previous?.pondC?'Pond C semalam: '+previous.pondC+'m':'Tiada rekod paras semalam. Isi perubahan secara manual.';
 if(previous){
  // These are yesterday's counters, not today's readings or daily totals.
  for(const prefix of ['rw','tw'])if(version===editVersion&&!get(prefix+'TotalizerPrevious')&&previous[prefix+'TotalizerCurrent']){
   el(prefix+'TotalizerPrevious').value=previous[prefix+'TotalizerCurrent'];el(prefix+'TotalizerUnit').value=previous[prefix+'TotalizerUnit']==='ML'?'ML':'m3';
  }
  autoChange();render();save();
 }
}
let changeWasAuto=false;
function autoChange(force=false){
 if(previousDate!==get('date')||!previous||!String(previous.pondC||'').trim()||!valid(n('pondC')))return;
 const p=Number(previous.pondC);if(!Number.isFinite(p))return;
 if(get('pondChange')&&!changeWasAuto&&!force)return;
 const delta=n('pondC')-p;el('pondChange').value=(delta>0?'+':'')+delta.toFixed(2);changeWasAuto=true;
}
function totalizer(prefix,dest){
 const before=get(prefix+'TotalizerPrevious'),after=get(prefix+'TotalizerCurrent'),regex=/^(?:\d+(?:\.\d+)?|\.\d+)$/;
 if(!regex.test(before)||!regex.test(after)||Number(after)<Number(before))return alert('Semak kedua-dua totalizer. Bacaan semasa mesti sekurang-kurangnya bacaan sebelumnya.');
 const delta=(Number(after)-Number(before))/(get(prefix+'TotalizerUnit')==='ML'?1:1000);
 if(delta>1000)return alert('Beza totalizer terlalu tinggi. Semak unit dan tempoh 24 jam.');
 if(get(dest)&&!confirm('Ganti '+fieldLabel(dest)+' dengan '+delta.toFixed(3)+'?'))return;
 el(dest).value=delta.toFixed(3);changed();
}
function setStep(next,scroll=true){
 step=next;
 for(const id of ['readings','dosing','reports'])el(id).hidden=id!==step;
 document.querySelectorAll('[data-m-step]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mStep===step)));
 el('previous').textContent=step==='readings'?'Bacaan':step==='dosing'?'← Bacaan':'← Dosing';
 el('next').textContent=step==='readings'?'Dosing →':step==='dosing'?'Laporan →':'Semak bacaan';
 renderReports();if(scroll)document.querySelector('.collectTabs').scrollIntoView({behavior:'smooth',block:'start'});
}
for(let no=1;no<=6;no++){
 const link=document.createElement('button');link.type='button';link.id='m_reportLink_'+no;
 const title=document.createElement('span');title.textContent=no+' · '+reportNames[no-1];link.append(title,document.createElement('small'));
 link.addEventListener('click',()=>{el('card_'+no).open=true;el('card_'+no).scrollIntoView({behavior:'smooth',block:'start'})});el('reportLinks').append(link);
 const card=document.createElement('details');card.id='m_card_'+no;card.className='more';
 card.innerHTML='<summary>'+no+' · '+reportNames[no-1]+'</summary><div class="moreBody"><button type="button" class="mSmallBtn" id="m_check_'+no+'">Semak bacaan laporan ini</button><div class="preview" id="m_preview_'+no+'" tabindex="0"></div><div class="btns"><button type="button" class="btn light" id="m_copy_'+no+'">Salin</button><button type="submit" class="btn wa" form="m_share" name="formatNumber" value="'+no+'">WhatsApp</button></div><label class="collectCheck"><input id="m_done_'+no+'" type="checkbox">Saya sudah tekan Send dalam WhatsApp</label></div>';
 el('reportCards').append(card);
 el('done_'+no).addEventListener('change',()=>{const key='rqS2MorningSix-'+get('date'),done=readJSON(key,{});done[String(no)]=el('done_'+no).checked;putJSON(key,done);renderReports()});
 el('check_'+no).addEventListener('click',()=>{const issues=reportIssues(no);if(issues.length)focusIssue(issues[0]);else alert('Bacaan laporan ini lengkap. Semak preview sebelum hantar.')});
 el('copy_'+no).addEventListener('click',async()=>{
  const issues=reportIssues(no);if(issues.length){focusIssue(issues[0]);alert('Semak '+fieldLabel(issues[0]));return}
  try{await navigator.clipboard.writeText(reportText(no));el('draft').textContent='Laporan '+no+' disalin.'}catch{alert('Salin teks daripada preview laporan ini.')}
 });
}
el('share').addEventListener('submit',event=>{
 const no=Number(event.submitter?.value);if(!reportFields[no]){event.preventDefault();return}
 const issues=reportIssues(no);if(issues.length){event.preventDefault();focusIssue(issues[0]);alert('Semak '+fieldLabel(issues[0]));return}
 if(!get('operator')){event.preventDefault();el('operator').focus();alert('Isi nama penyedia laporan.');return}
 const code=localStorage.getItem('s2_access_key');
 if(!code){event.preventDefault();if(typeof showLiveAccess==='function')showLiveAccess(true);document.getElementById('liveBoard')?.scrollIntoView({behavior:'smooth'});alert('Masukkan access code S2 dahulu.');return}
 if(expectedUpdatedAt===null){event.preventDefault();retrieve(false,true);alert('Semak rekod online dahulu. Jika draf berbeza, tekan Rekod online dan semak bacaan sebelum cuba semula.');return}
 el('waRevision').value=expectedUpdatedAt;el('waKey').value=code;el('waDate').value=get('date');el('waOperator').value=get('operator');el('waValues').value=JSON.stringify(formData().values);el('waText').value=reportText(no);save();
});
document.querySelectorAll('[data-m-step]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.mStep)));
el('previous').addEventListener('click',()=>setStep(step==='reports'?'dosing':'readings'));
el('next').addEventListener('click',()=>{
 if(step==='reports'){
  const issues=[1,2,3,4,5,6].flatMap(reportIssues);if(issues.length)focusIssue(issues[0]);else alert('Enam laporan lengkap. Semak preview dan hantar satu per satu.');
 }else setStep(step==='readings'?'dosing':'reports');
});
for(const id of [...keys,...extraKeys])if(el(id).type!=='hidden')el(id).addEventListener(el(id).tagName==='SELECT'?'change':'input',()=>{
 if(id==='pondStorage')el('storageAuto').checked=false;
 if(id==='criticalStorage')el('criticalStorageAuto').checked=false;
 if(id==='pondChange')changeWasAuto=false;
 if(id==='pondC')autoChange();el(id).removeAttribute('aria-invalid');changed();
});
for(const id of ['storageAuto','criticalStorageAuto','pondAProblem'])el(id).addEventListener('change',changed);
el('operator').addEventListener('input',save);
el('firstDayAverage').addEventListener('click',()=>{if(!get('date').endsWith('-01')||!valid(n('production')))return alert('Isi Total Prod pada hari pertama bulan dahulu.');el('monthlyAverage').value=get('production');changed()});
for(const [id,sign] of [['changeMinus','-'],['changePlus','+']])el(id).addEventListener('click',()=>{el('pondChange').value=sign+get('pondChange').replace(/^[+-]/,'');changeWasAuto=false;changed();el('pondChange').focus({preventScroll:true})});
// Explicitly mark individual inactive sources; never turn unknown readings into zero.
for(const id of ['intakeB','wt1','sjamB','sjamCActual','sjamCHourly']){
 const button=document.createElement('button');button.type='button';button.className='mSmallBtn';
 button.textContent='Tidak beroperasi → 0';button.setAttribute('aria-label',fieldLabel(id)+' tidak beroperasi, isi 0');
 button.addEventListener('click',()=>{
  if(n(id)>0&&!confirm('Ganti '+fieldLabel(id)+' dengan 0 kerana tidak beroperasi?'))return;
  el(id).value='0';el(id).removeAttribute('aria-invalid');changed();
 });
 el(id).insertAdjacentElement('afterend',button);
}
el('noAux').addEventListener('click',()=>{if(['wt1','sjamB','sjamCActual','sjamCHourly'].some(k=>n(k)>0)&&!confirm('Ganti bacaan WT1, SJAM B dan SJAM C dengan 0 kerana tidak beroperasi?'))return;for(const k of ['wt1','sjamB','sjamCActual','sjamCHourly'])el(k).value='0';changed()});
el('calcPondChange').addEventListener('click',async()=>{if(!previous)await loadPrevious();if(!previous?.pondC||!valid(n('pondC')))return alert('Isi Pond C hari ini dan pastikan rekod semalam tersedia.');if(get('pondChange')&&!confirm('Kira semula perubahan berdasarkan paras semalam?'))return;autoChange(true);changed()});
el('applyRwTotalizer').addEventListener('click',()=>totalizer('rw','rwAbst'));el('applyTwTotalizer').addEventListener('click',()=>totalizer('tw','production'));
el('load').addEventListener('click',()=>retrieve(true));
el('date').addEventListener('change',()=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(get('date')))return;changeWasAuto=false;const hasDraft=restore();setStep('readings',false);retrieve(false,hasDraft);loadPrevious()});
// Numeric keyboard Next moves between visible fields without changing any value.
el('readings').addEventListener('keydown',event=>{
 if(event.key!=='Enter'||event.target.tagName!=='INPUT')return;
 event.preventDefault();const inputs=[...el('readings').querySelectorAll('input:not([type=checkbox]),select')].filter(x=>x.getClientRects().length),index=inputs.indexOf(event.target);inputs[index+1]?.focus();
});
el('date').value=localDate();el('operator').value=localStorage.getItem('rqS2MorningOperator')||localStorage.getItem('s2_leader')||'';
const initialDraft=restore();setStep('readings',false);retrieve(false,initialDraft);loadPrevious();
let observedToday=localDate();
function checkDate(){const today=localDate();if(today!==observedToday&&get('date')===observedToday){save();el('date').value=today;el('date').dispatchEvent(new Event('change'))}observedToday=today}
window.addEventListener('focus',checkDate);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate()});
window.morningTabChanged=tab=>document.querySelector('.bottom')?.classList.toggle('morningHide',tab==='morning');
window.morningTabChanged(localStorage.getItem('rqLraActiveTab')||'ops');
if(new URLSearchParams(location.search).get('tab')==='morning'&&typeof switchTab==='function')switchTab('morning');
})();
