// Daily 0700 LRA Semenyih 2 reports: five formats, one set of readings.
(function(){
'use strict';
const el=id=>document.getElementById('m_'+id);
const keys=['production','designCapacity','monthlyAverage','rwAbst','pondA','pondB','pondC','pondChange','pondStorage','pondTwlCapacity','pondTwlLevel','criticalLevel','criticalPercent','criticalStorage','intakeB','wt1','sjamB','sjamCActual','intakeCHourly','sjamCHourly','dp1','dp2','dpOutHourly','dpPressure'];
const defaults={designCapacity:'100',pondTwlCapacity:'3984.50',pondTwlLevel:'12.0',criticalLevel:'7.50',criticalPercent:'30.00',criticalStorage:'1226'};
const noteDefault='Bacaan level tidak tepat disebabkan SCADA intake A lost communication';
const sivKeys=['sivTarget','sivStatus','sivChallengeA','sivChallengeB'];
const sivDefaultA='Kaedah pengiraan pengeluaran LRA Semenyih 2 :\nPengeluaran LRA Semenyih 2 = Bacaan Totalizer Tw (Semasa) - Bacaan Totalizer Tw (Sebelum)';
const sivDefaultB='Pihak LRA Semenyih 2 Perlu mengawal Paras Kolam Desa Putra pada 3.00m - 7.83m seperti diminta SO bagi memenuhi Demand.';
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
const change=(includeUnit=true)=>metres('pondC')+' ('+(valid(n('pondChange'))?number(n('pondChange'),2)+(includeUnit?'m':''):'-')+')';
const storage=()=>unit('pondStorage',2,'ML');
function metrics(){
 const prod=n('production'),design=n('designCapacity'),st=n('pondStorage'),
  cap=n('pondTwlCapacity'),critical=n('criticalStorage');
 const inflow=sum(n('intakeB'),n('wt1'),n('sjamB'));
 const outflow=sum(n('rwAbst'),n('sjamCActual'));
 const forecastWtp=mldFromHour('intakeCHourly'),forecastSjam=mldFromHour('sjamCHourly');
 const forecastTotal=sum(forecastWtp,forecastSjam);
 const margin=sub(prod,design);
 return {
 margin,marginPct:all(margin,design)&&design>0?margin/design*100:null,
 percent:all(st,cap)&&cap>0?st/cap*100:null,
 inflow,outflow,net:sub(inflow,outflow),
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
   '*Total volume pumped to Pond C : '+inflow+' - '+outflow+' = '+valueOr(r.net,3,'ML')+'*','',
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
function render(){
 const r=metrics(),list={
  margin:valueOr(r.margin,3,' MLD'),percent:valueOr(r.percent,2,'%'),
  inflow:valueOr(r.inflow,3,' MLD'),outflow:valueOr(r.outflow,3,' MLD'),
  net:valueOr(r.net,3,' ML/day'),days:valueOr(r.days,1,' hari')
 };
 Object.entries(list).forEach(([id,text])=>{if(el(id))el(id).textContent=text});
 for(let i=1;i<=5;i++)el('preview_'+i).textContent=reportText(i);
 const prod=n('production'),target=n('sivTarget'),diff=all(prod,target)?prod-target:null;
 el('sivDiffLabel').textContent=valid(diff)&&diff<0?'Penurunan':'Peningkatan';
 el('sivDiff').textContent=valid(diff)?Math.abs(diff).toFixed(3)+' MLD':'-';
 el('sivPercent').textContent=valid(diff)&&target>0?(Math.abs(diff)/target*100).toFixed(3)+'%':'-';
 el('sivTargetNote').textContent='Sasaran '+(sivMonths[Number(get('date').slice(5,7))-1]||'-')+' '+get('date').slice(0,4)+' — '+(get('sivTarget')||'belum diisi')+' MLD. Total Prod diambil terus daripada Bahagian 01.';
 el('pondANoteWrap').hidden=!problemA();
 el('pondAField').classList.toggle('problemOn',problemA());
}
function storedKey(){return 'rqS2Morning0700-'+get('date')}
function formData(){
 const values={};keys.forEach(k=>values[k]=get(k));
 sivKeys.forEach(k=>values[k]=get(k));
 values.pondAProblem=problemA();values.pondANote=get('pondANote');
 return{values,operator:get('operator')};
}
function save(){
 if(!get('date'))return;
 localStorage.setItem(storedKey(),JSON.stringify(formData()));
 localStorage.setItem('rqS2MorningOperator',get('operator'));
 if(get('sivTarget')&&Number(get('sivTarget'))>0)localStorage.setItem(sivTargetKey(),get('sivTarget'));
 el('draft').textContent='Draf '+dmy()+' disimpan di telefon';
}
function reset(){
 keys.forEach(k=>el(k).value=defaults[k]||'');
 el('sivTarget').value=sivTargetInitial();
 el('sivStatus').value='auto';
 el('sivChallengeA').value=sivDefaultA;
 el('sivChallengeB').value=sivDefaultB;
 el('pondAProblem').checked=false;
 el('pondANote').value=noteDefault;
}
function apply(data){
 const values=data?.values||data||{};
 keys.forEach(k=>el(k).value=String(values[k]??defaults[k]??''));
 el('sivTarget').value=String(values.sivTarget??sivTargetInitial());
 el('sivStatus').value=['auto','not','achieved'].includes(values.sivStatus)?values.sivStatus:'auto';
 el('sivChallengeA').value=String(values.sivChallengeA??sivDefaultA);
 el('sivChallengeB').value=String(values.sivChallengeB??sivDefaultB);
 el('pondAProblem').checked=!!values.pondAProblem;
 el('pondANote').value=values.pondANote||noteDefault;
 if(data?.operator)el('operator').value=data.operator;
 render();
}
function restore(){
 reset();
 try{
  const draft=JSON.parse(localStorage.getItem(storedKey())||'null');
  if(draft)apply(draft);
  el('draft').textContent=draft?'Draf '+dmy()+' dipulihkan':'Draf baharu · '+dmy();
 }catch(e){el('draft').textContent='Draf baharu'}
 render();
}
async function retrieve(silent=false){
 const code=localStorage.getItem('s2_access_key');
 if(!code){el('onlineStatus').textContent='Masukkan access code S2 pada panel Status Semasa Loji dahulu.';return}
 try{
  const response=await fetch('/api/s2-morning?date='+encodeURIComponent(get('date')),{headers:{'X-S2-Key':code},cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'Ralat database');
  if(!data.report){el('onlineStatus').textContent='Belum ada rekod online bagi '+dmy();return}
  const date=new Date(data.report.updatedAt);
  el('onlineStatus').textContent='Rekod online: '+(Number.isFinite(date.valueOf())?date.toLocaleString('ms-MY'):'-')+' · '+data.report.operator;
  if(silent)return;
  if(!confirm('Gantikan bacaan semasa dengan rekod online '+dmy()+'?'))return;
  apply(data.report);save();
 }catch(e){el('onlineStatus').textContent='Tidak dapat akses database: '+e.message}
}
const localDate=()=>{const d=new Date();return new Date(d.valueOf()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
let lastDate=localDate();
el('date').value=lastDate;
el('operator').value=localStorage.getItem('rqS2MorningOperator')||localStorage.getItem('s2_leader')||'';
restore();
el('date').addEventListener('change',()=>{restore();retrieve(true)});
keys.forEach(k=>el(k).addEventListener('input',()=>{render();save()}));
sivKeys.forEach(k=>el(k).addEventListener(k==='sivStatus'?'change':'input',()=>{render();save()}));
el('operator').addEventListener('input',save);
el('pondAProblem').addEventListener('change',()=>{render();save()});
el('pondANote').addEventListener('input',()=>{render();save()});
el('load').addEventListener('click',()=>retrieve(false));
document.querySelectorAll('.m_copy').forEach(b=>b.addEventListener('click',async()=>{
 const n=Number(b.dataset.number),txt=reportText(n);
 if(n===5&&sivValid())return alert(sivValid());
 try{await navigator.clipboard.writeText(txt);alert('Format '+n+' sudah disalin.')}
 catch{el('card_'+n).open=true;alert('Sila salin teks melalui Preview WhatsApp.')}
}));
document.getElementById('m_share').addEventListener('submit',event=>{
 const no=Number(event.submitter?.value||0);
 if(![1,2,3,4,5].includes(no)){event.preventDefault();return}
 if(no===5&&sivValid()){event.preventDefault();alert(sivValid());return}
 const code=localStorage.getItem('s2_access_key');
 if(!code){
  event.preventDefault();
  if(typeof showLiveAccess==='function')showLiveAccess(true);
  document.getElementById('liveBoard')?.scrollIntoView({behavior:'smooth'});
  alert('Masukkan access code S2 pada Status Semasa Loji dahulu.');return
 }
 const missing=keys.filter(k=>!defaults[k]&&!get(k));
 if(no!==5&&missing.length&&!confirm('Masih ada '+missing.length+' bacaan kosong. Teruskan report dengan tanda - ?')){event.preventDefault();return}
 el('waKey').value=code;el('waDate').value=get('date');el('waOperator').value=get('operator')||'-';
 el('waValues').value=JSON.stringify(formData().values);el('waText').value=reportText(no);
 save();
});
window.morningTabChanged=tab=>{
 document.querySelector('.bottom')?.classList.toggle('morningHide',tab==='morning');
 if(tab==='morning')render();
};
window.morningTabChanged(localStorage.getItem('rqLraActiveTab')||'ops');
const params=new URLSearchParams(location.search);
if(params.get('tab')==='morning'){
 if(typeof switchTab==='function')switchTab('morning');
 if(params.get('format')==='5')el('card_5').open=true;
}
const checkDate=()=>{
 const next=localDate();
 if(next!==lastDate&&el('date').value===lastDate){el('date').value=next;restore();retrieve(true)}
 lastDate=next;
};
window.addEventListener('focus',checkDate);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDate()});
retrieve(true);
})();