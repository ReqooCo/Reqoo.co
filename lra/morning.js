// Daily 0700 LRA Semenyih 2 reports: five formats, one set of readings.
(function(){
'use strict';
const el=id=>document.getElementById('m_'+id);
const keys=['twFlowHourly','cwt1','cwt2','production','designCapacity','monthlyAverage','rwAbst','pondA','pondB','pondC','pondChange','pondStorage','pondTwlCapacity','pondTwlLevel','criticalLevel','criticalPercent','criticalStorage','intakeB','wt1','sjamB','sjamCActual','intakeCHourly','sjamCHourly','dp1','dp2','dpOutHourly','dpPressure'];
const defaults={designCapacity:'100',pondTwlCapacity:'3984.50',pondTwlLevel:'12.0',criticalLevel:'7.50',criticalPercent:'30.00',criticalStorage:'1226'};

const POND_C_CAL={min:7.50,max:12.00,minML:1226,fullML:3984.50,mlPerM:613};
function storageFromLevel(level){
 if(!Number.isFinite(level)||level<POND_C_CAL.min||level>POND_C_CAL.max)return null;
 return Math.round((POND_C_CAL.minML+(level-POND_C_CAL.min)*POND_C_CAL.mlPerM)*100)/100;
}
function storageReferenceOK(){
 return valid(n('pondTwlLevel'))&&Math.abs(n('pondTwlLevel')-12)<0.0001&&
        valid(n('pondTwlCapacity'))&&Math.abs(n('pondTwlCapacity')-3984.50)<0.011;
}
function calculatePondStorage(){
 const ok=storageReferenceOK();
 const actual=ok?storageFromLevel(n('pondC')):null;
 const critical=ok?storageFromLevel(n('criticalLevel')):null;
 if(el('storageAuto').checked)el('pondStorage').value=valid(actual)?actual.toFixed(2):'';
 if(el('criticalStorageAuto').checked)el('criticalStorage').value=valid(critical)?critical.toFixed(2):'';
 if(!ok){
  el('storageStatus').textContent='Rujukan TWL bukan 12.00m / 3984.50 ML. Pengiraan auto dihentikan; semak tetapan atau guna manual.';
 }else if(!valid(actual)||!valid(critical)){
  el('storageStatus').textContent='Kiraan auto hanya sah untuk level 7.50m hingga 12.00m. Bacaan luar julat perlu disemak secara manual.';
 }else{
  const balance=Math.max(0,actual-critical);
  el('storageStatus').textContent='Model rujukan 613 ML/m: @ '+n('pondC').toFixed(2)+'m = '+actual.toFixed(2)+' ML; @ critical '+n('criticalLevel').toFixed(2)+'m = '+critical.toFixed(2)+' ML; baki = '+balance.toFixed(2)+' ML.';
 }
}
function legacyStorageAuto(values,field,flag,level){
 if(typeof values[flag]==='boolean')return values[flag];
 const existing=String(values[field]??'').trim();
 if(!existing)return true;
 const rawLevel=String(values[level]??'').trim();
 const expected=rawLevel?storageFromLevel(Number(rawLevel)):null;
 return valid(expected)&&Math.abs(Number(existing)-expected)<=0.02;
}

const noteDefault='Bacaan level tidak tepat disebabkan SCADA intake A lost communication';
const sivKeys=['sivTarget','sivStatus','sivChallengeA','sivChallengeB'];

const totalizerKeys=['twTotalizerPrevious','twTotalizerCurrent','twTotalizerUnit','rwTotalizerPrevious','rwTotalizerCurrent','rwTotalizerUnit'];
const criticalFlowKeys=['pondCFlowValue','pondCFlowUnit'];

const opsExtraKeys=['oRwp','oTwp','oRiver','oRiverMax','oExtraNote'];
const opsProblemKeys=["Rw","Tw","River","Cwt1","Cwt2","Dp1","Dp2"];
const opsNoteDefaults={"Rw":"RW Inflow under maintenance / bacaan tidak tepat","Tw":"TW Outflow under maintenance / bacaan tidak tepat","River":"Paras Sg Langat tidak tepat / SCADA Lost Comm","Cwt1":"Paras CWT No.1 under maintenance / level problem","Cwt2":"Paras CWT No.2 under maintenance / sensor level problem","Dp1":"Paras Desa Putra No.1 tidak tepat / level problem","Dp2":"Paras Desa Putra No.2 tidak tepat / level problem"};
function opsProblemOn(key){return el('o'+key+'Problem').checked}
function opsProblemsActive(){return opsProblemKeys.filter(opsProblemOn)}
function opsMarker(key){const n=opsProblemsActive().indexOf(key);return n<0?'':'('+('*'.repeat(n+1))+')'}
function opsReading(value,key,unit=''){
 const val=String(value??'').trim();
 return (val&&val!=='-'?val+unit:'-')+opsMarker(key);
}
function morningOpsData(){
 const rwFlow=criticalFlowMld();
 const obj={
  rwp:get('oRwp'),twp:get('oTwp'),river:get('oRiver'),riverMax:get('oRiverMax'),
  rw:valid(rwFlow)?(rwFlow*1000/24).toFixed(2):'',
  tw:get('twFlowHourly'),tank1:get('cwt1'),tank2:get('cwt2'),
  pond1:get('dp1'),pond2:get('dp2'),pondOut:get('dpOutHourly'),
  dpPressure:get('dpPressure'),note:get('oExtraNote')
 };
 for(const key of opsProblemKeys){
  obj[key==='Cwt1'?'tank1Problem':key==='Cwt2'?'tank2Problem':key==='Dp1'?'pond1Problem':key==='Dp2'?'pond2Problem':key.toLowerCase()+'Problem']=opsProblemOn(key);
  obj[key==='Cwt1'?'tank1Note':key==='Cwt2'?'tank2Note':key==='Dp1'?'pond1Note':key==='Dp2'?'pond2Note':key.toLowerCase()+'Note']=get('o'+key+'Note');
 }
 return obj;
}
function morningOpsIssue(){
 const d=morningOpsData();
 const numberOK=v=>/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(v??'').trim());
 if(!valid(criticalFlowMld()))return 'Isi RW Flowmeter @0700 di bahagian 01.';
 if(!numberOK(d.tw)||Number(d.tw)<=0)return 'Isi TW Flowmeter @0700 di bahagian 01.';
 if(!numberOK(d.pondOut)||Number(d.pondOut)<0)return 'Isi Outflow Desa Putra sebenar di bahagian 05.';
 for(const [field,key,name] of [['river','River','Sungai Langat'],['tank1','Cwt1','CWT No.1'],['tank2','Cwt2','CWT No.2'],['pond1','Dp1','Desa Putra No.1'],['pond2','Dp2','Desa Putra No.2']]){
  if(!numberOK(d[field])&&!opsProblemOn(key))return 'Isi bacaan '+name+' atau tandakan Problem dalam Operasi 0700.';
  if(d[field]&&!numberOK(d[field]))return 'Semak format nombor '+name+' (kosongkan jika Problem).';
 }
 if(d.riverMax&&!numberOK(d.riverMax))return 'Semak paras maksimum Sungai Langat.';
 return '';
}
function morningOpsText(){
 const d=morningOpsData(),rw63=d.rwp==='63',tw50=d.twp==='50';
 const normalRW=rw63?['2200','2300']:['4200','4500'];
 const normalTW=tw50?'2200':'4200',normalPressure=tw50?'7.0':'7.6';
 const mldDP=/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(d.pondOut)?(Number(d.pondOut)*24/1000).toFixed(3):'-';
 const noteParts=opsProblemsActive().map(key=>{
  const note=get('o'+key+'Note').replace(/\*/g,'').trim()||opsNoteDefaults[key];
  return '_'+opsMarker(key)+' '+note+'_';
 });
 const extra=get('oExtraNote').replace(/\*/g,'').trim();
 return [
 '*Status Operasi LRA Semenyih 2*','*'+dmy()+'@0700hrs*','',
 'Paras Sg Langat : '+opsReading(d.river,'River','m')+' (paras maksima : '+(d.riverMax?d.riverMax+'m':'-')+')','',
 'Kadar Pengepaman','RWP : '+d.rwp+'Mld','TWP : '+d.twp+'Mld','',
 'RW Inflow : '+opsReading(d.rw,'Rw','m3/h'),
 'Normal : '+normalRW[0]+'m3/h~'+normalRW[1]+'m3/h',
 'Tangki Air Bersih',
 'No.1 : '+opsReading(d.tank1,'Cwt1','m'),
 'No.2 : '+opsReading(d.tank2,'Cwt2','m'),'',
 'TW Outflow : '+opsReading(d.tw,'Tw','m3/h'),
 'Normal : '+normalTW+'m3/h',
 'Delivery Pressure (rujukan): '+normalPressure+'bar','',
 'Kolam Desa Putra,',
 'No.1 : '+opsReading(d.pond1,'Dp1','m'),
 'No.2 : '+opsReading(d.pond2,'Dp2','m'),
 'Outflow : '+(mldDP==='-'?'-':mldDP+'Mld'),
 ...(d.dpPressure?['Delivery Pressure DP (actual): '+d.dpPressure+'bar']:[]),
 ...(noteParts.length?['',...noteParts]:[]),
 ...(extra?['','*Nota:* '+extra]:[])
 ].join('\n');
}
function updateOpsProblemViews(){
 for(const key of opsProblemKeys)el('o'+key+'NoteWrap').hidden=!opsProblemOn(key);
}

function totalizerDelta(prefix){
 const before=get(prefix+'TotalizerPrevious'),after=get(prefix+'TotalizerCurrent');
 if(!before||!after)return null;
 const numeric=/^(?:\d+(?:\.\d+)?|\.\d+)$/;
 if(!numeric.test(before)||!numeric.test(after))return {error:'Bacaan totalizer '+prefix.toUpperCase()+' perlu nombor sah.'};
 const prior=Number(before),current=Number(after);
 if(current<prior)return {error:'Totalizer '+prefix.toUpperCase()+' semasa lebih rendah daripada sebelumnya. Semak rollover / meter.'};
 const unit=get(prefix+'TotalizerUnit');
 const delta=(current-prior)/(unit==='ML'?1:1000);
 if(!Number.isFinite(delta)||delta>1000)return {error:'Perbezaan totalizer '+prefix.toUpperCase()+' terlalu tinggi. Semak unit dan sela 24 jam.'};
 return {delta};
}
function showTotalizerCalculations(){
 const warnings=[];
 for(const [prefix,out,field] of [['tw','twTotalizerResult','production'],['rw','rwTotalizerResult','rwAbst']]){
  const result=totalizerDelta(prefix);
  el(out).textContent=result?.error?'Semak bacaan':result?' '+result.delta.toFixed(3)+' MLD':'—';
  if(result?.error)warnings.push(result.error);
  if(result&&!result.error&&get(field)&&/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(get(field))&&Math.abs(Number(get(field))-result.delta)>0.011)
   warnings.push((prefix==='tw'?'Total Prod':'RW Abst')+' tidak sama dengan beza totalizer ('+result.delta.toFixed(3)+' MLD). Semak sebelum hantar.');
 }
 el('meterWarning').textContent=warnings.join(' ');
}
function applyTotalizer(prefix,dest){
 const data=totalizerDelta(prefix);
 if(!data)return alert('Isi kedua-dua bacaan '+prefix.toUpperCase()+' Totalizer dahulu.');
 if(data.error)return alert(data.error);
 const next=data.delta.toFixed(3);
 if(get(dest)&&Math.abs(Number(get(dest))-data.delta)>0.011&&!confirm('Ganti '+get(dest)+' MLD kepada '+next+' MLD daripada Totalizer '+prefix.toUpperCase()+'?'))return;
 el(dest).value=next;render();save();
}

const sivDefaultA='Kaedah pengiraan pengeluaran LRA Semenyih 2 :\nPengeluaran LRA Semenyih 2 = Bacaan Totalizer Tw (Semasa) - Bacaan Totalizer Tw (Sebelum)';
const sivDefaultB='Pihak LRA Semenyih 2 Perlu mengawal Paras Kolam Desa Putra pada 3.00m - 7.83m seperti diminta SO bagi memenuhi Demand.';

const listSix=[['ops','Operasi'],['1','Format 1'],['2','Format 2'],['3','Format 3'],['4','Format 4'],['5','Format 5']];
let previousPondC=null,previousDate='',previousLoading=false,pondChangeAutoValue=null;
function sixKey(){return 'rqS2MorningSix-'+get('date')}
function renderChecklist(){
 let done={};try{done=JSON.parse(localStorage.getItem(sixKey())||'{}')}catch{}
 const root=el('sixChecklist');root.textContent='';
 for(const [id,label] of listSix){
  const item=document.createElement('label'),ck=document.createElement('input');
  ck.type='checkbox';ck.checked=done[id]===true;
  ck.addEventListener('change',()=>{
   let flags={};try{flags=JSON.parse(localStorage.getItem(sixKey())||'{}')}catch{}
   flags[id]=ck.checked;localStorage.setItem(sixKey(),JSON.stringify(flags));renderChecklist();
  });
  item.append(ck,document.createTextNode(label));root.appendChild(item);
 }
 el('sixCount').textContent=listSix.filter(([id])=>done[id]).length+'/6 ditanda selesai oleh staf';
}
function syncOpsPreview(){
 const issue=morningOpsIssue();
 el('opsReady').textContent=issue?'Semak Operasi 0700: '+issue:'Operasi 0700 sedia. Bacaan dikongsi terus daripada borang pagi. Semak preview dan pilih WhatsApp.';
 el('preview_ops').textContent=morningOpsText();
 updateOpsProblemViews();
}
function criticalFlowMld(){
 const input=get('pondCFlowValue');
 if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(input))return null;
 const value=Number(input);
 if(!Number.isFinite(value)||value<=0)return null;
 const mld=get('pondCFlowUnit')==='m3h'?value*24/1000:value;
 return mld>0&&mld<=1000?mld:null;
}
function criticalFlowIssue(){
 if(!get('pondCFlowValue'))return 'Masukkan bacaan kadar flowmeter RW @0700 secara manual untuk kira Days to Critical. RW totalizer harian ialah nilai berasingan.';
 if(!valid(criticalFlowMld()))return 'Semak bacaan kadar RW @0700 dan unit m³/jam atau MLD.';
 if(!valid(n('sjamCHourly')))return 'Isi kadar SJAM C @0700. Gunakan 0 jika tiada aliran SJAM C.';
 return '';
}
function updateForecastFields(){
 // Never substitute daily RW abstraction for the instantaneous Pond C critical flow.
 el('forecastAuto').checked=false;
 const flow=criticalFlowMld();
 el('intakeCHourly').value=valid(flow)?(flow*1000/24).toFixed(5):'';
 if(el('sjamForecastAuto').checked){
  const x=n('sjamCActual');
  el('sjamCHourly').value=valid(x)?(x*1000/24).toFixed(2):'';
 }
}
const signedChange=(a,b)=>(a-b>0?'+':'')+(a-b).toFixed(2);
function applyPreviousChange(){
 const current=n('pondC');
 if(!valid(previousPondC)||!valid(current)||previousDate!==get('date'))return false;
 const old=get('pondChange');
 if(old&&old!==pondChangeAutoValue)return false;
 el('pondChange').value=signedChange(current,previousPondC);
 pondChangeAutoValue=get('pondChange');updateChangeSignButtons();return true;
}
async function loadPreviousLevel(force=false){
 const date=get('date');if(previousLoading||(!force&&previousDate===date))return;
 previousDate=date;previousPondC=null;pondChangeAutoValue=null;
 const code=localStorage.getItem('s2_access_key');
 if(!code){el('pondChangeStatus').textContent='Access code diperlukan untuk semak rekod semalam.';return}
 previousLoading=true;
 try{
  const day=new Date(date+'T12:00:00Z');day.setUTCDate(day.getUTCDate()-1);
  const prev=day.toISOString().slice(0,10);
  const res=await fetch('/api/s2-morning?date='+prev,{headers:{'X-S2-Key':code},cache:'no-store'});
  const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'Ralat database');
  if(get('date')!==date)return;
  const raw=String(data.report?.values?.pondC??'').trim();
  previousPondC=raw&&Number.isFinite(Number(raw))?Number(raw):null;
  if(valid(previousPondC)){
   const changed=applyPreviousChange();
   el('pondChangeStatus').textContent='Pond C semalam: '+previousPondC.toFixed(2)+'m'+(changed?' · auto dikira':' · boleh kira semula');
   if(changed){render();save()}
  }else el('pondChangeStatus').textContent='Tiada rekod 0700 semalam. Isi manual.';
 }catch(e){el('pondChangeStatus').textContent='Rekod semalam belum dapat diambil: '+e.message}
 finally{previousLoading=false}
}
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
 const forecastWtp=mldFromHour('intakeCHourly'),forecastSjam=mldFromHour('sjamCHourly');
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
 updateForecastFields();
 calculatePondStorage();
 const r=metrics(),list={
  margin:valueOr(r.margin,3,' MLD'),percent:valueOr(r.percent,2,'%'),
  storageShown:valueOr(n('pondStorage'),2,' ML'),usableStorage:valueOr(r.usable,2,' ML'),forecastMldView:valueOr(r.forecastWtp,3,' MLD'),
  inflow:valueOr(r.inflow,3,' MLD'),outflow:valueOr(r.outflow,3,' MLD'),
  net:valueOr(r.net,3,' ML/day'),days:valueOr(r.days,1,' hari')
 };
 Object.entries(list).forEach(([id,text])=>{if(el(id))el(id).textContent=text});
 const issue=criticalFlowIssue();
 const hint=el('pondCFlowStatus');
 if(issue&&get('pondCFlowValue')){
  hint.textContent=issue;
 }else if(valid(criticalFlowMld())){
  hint.textContent='Kadar meter RW @0700 (diisi manual): '+criticalFlowMld().toFixed(3)+' MLD = '+(criticalFlowMld()*1000/24).toFixed(2)+' m³/jam. '+(valid(r.days)?'Days to Critical: '+r.days.toFixed(1)+' hari.':'Isi SJAM C @0700 untuk kira hari kritikal.');
 }else if(!hint.dataset.imported){
  hint.textContent='Masukkan kadar flowmeter RW @0700 secara manual (contoh Excel 2,485 m³/jam bersamaan 59.640 MLD, 46.1 hari).';
 }

 showTotalizerCalculations();
 for(let i=1;i<=5;i++)el('preview_'+i).textContent=reportText(i);
 const prod=n('production'),target=n('sivTarget'),diff=all(prod,target)?prod-target:null;
 el('sivDiffLabel').textContent=valid(diff)&&diff<0?'Penurunan':'Peningkatan';
 el('sivDiff').textContent=valid(diff)?Math.abs(diff).toFixed(3)+' MLD':'-';
 el('sivPercent').textContent=valid(diff)&&target>0?(Math.abs(diff)/target*100).toFixed(3)+'%':'-';
 el('sivTargetNote').textContent='Sasaran '+(sivMonths[Number(get('date').slice(5,7))-1]||'-')+' '+get('date').slice(0,4)+' — '+(get('sivTarget')||'belum diisi')+' MLD. Total Prod diambil terus daripada Bahagian 01.';
 el('pondANoteWrap').hidden=!problemA();
 el('pondAField').classList.toggle('problemOn',problemA());
 updateChangeSignButtons();
 syncOpsPreview();
}
function storedKey(){return 'rqS2Morning0700-'+get('date')}
function formData(){
 const values={};keys.forEach(k=>values[k]=get(k));
 sivKeys.forEach(k=>values[k]=get(k));
 totalizerKeys.forEach(k=>values[k]=get(k));
 criticalFlowKeys.forEach(k=>values[k]=get(k));
 opsExtraKeys.forEach(k=>values[k]=get(k));
 for(const key of opsProblemKeys){values['o'+key+'Problem']=opsProblemOn(key);values['o'+key+'Note']=get('o'+key+'Note');}
 values.forecastAuto=el('forecastAuto').checked;values.sjamForecastAuto=el('sjamForecastAuto').checked;
 values.pondStorageAuto=el('storageAuto').checked;values.criticalStorageAuto=el('criticalStorageAuto').checked;
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
 el('forecastAuto').checked=false;el('sjamForecastAuto').checked=false;
 el('storageAuto').checked=true;el('criticalStorageAuto').checked=true;
 for(const id of totalizerKeys)el(id).value=id.endsWith('Unit')?'m3':'';
 el('pondCFlowValue').value='';el('pondCFlowUnit').value='m3h';el('pondCFlowStatus').dataset.imported='';
 el('sivTarget').value=sivTargetInitial();
 el('sivStatus').value='auto';
 el('sivChallengeA').value=sivDefaultA;
 el('sivChallengeB').value=sivDefaultB;
 el('pondAProblem').checked=false;
 el('pondANote').value=noteDefault;
 for(const key of opsExtraKeys)el(key).value=key==='oRwp'?'126':key==='oTwp'?'100':key==='oRiverMax'?'10.11':'';
 for(const key of opsProblemKeys){el('o'+key+'Problem').checked=false;el('o'+key+'Note').value=opsNoteDefaults[key]}
}
function apply(data){
 const values=data?.values||data||{};
 keys.forEach(k=>el(k).value=String(values[k]??defaults[k]??''));
 // Preserve a verified legacy manual flow, but do not reuse the obsolete
 // forecastAuto daily-RW calculation (source of 29.3-day errors).
 if(String(values.pondCFlowValue??'').trim()){
  el('pondCFlowValue').value=String(values.pondCFlowValue);
  el('pondCFlowUnit').value=values.pondCFlowUnit==='m3h'?'m3h':'MLD';
 }else if(values.forecastAuto!==true&&String(values.intakeCHourly??'').trim()){
  const old=Number(values.intakeCHourly);
  el('pondCFlowValue').value=Number.isFinite(old)&&old>0?(old*24/1000).toFixed(3):'';
  el('pondCFlowUnit').value='MLD';
 }else{
  el('pondCFlowValue').value='';el('pondCFlowUnit').value='m3h';
 }
 el('pondCFlowStatus').dataset.imported='';

 for(const id of totalizerKeys)el(id).value=id.endsWith('Unit')?(values[id]==='ML'?'ML':'m3'):String(values[id]??'');
 el('storageAuto').checked=legacyStorageAuto(values,'pondStorage','pondStorageAuto','pondC');
 el('criticalStorageAuto').checked=legacyStorageAuto(values,'criticalStorage','criticalStorageAuto','criticalLevel');
 el('forecastAuto').checked=false;
 el('sjamForecastAuto').checked=values.sjamForecastAuto===true;
 el('sivTarget').value=String(values.sivTarget??sivTargetInitial());
 el('sivStatus').value=['auto','not','achieved'].includes(values.sivStatus)?values.sivStatus:'auto';
 el('sivChallengeA').value=String(values.sivChallengeA??sivDefaultA);
 el('sivChallengeB').value=String(values.sivChallengeB??sivDefaultB);
 el('pondAProblem').checked=!!values.pondAProblem;
 el('pondANote').value=values.pondANote||noteDefault;
 for(const key of opsExtraKeys)el(key).value=String(values[key]??(key==='oRwp'?'126':key==='oTwp'?'100':key==='oRiverMax'?'10.11':''));
 for(const key of opsProblemKeys){
  el('o'+key+'Problem').checked=values['o'+key+'Problem']===true;
  el('o'+key+'Note').value=String(values['o'+key+'Note']??opsNoteDefaults[key]);
 }
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
el('date').addEventListener('change',()=>{restore();retrieve(true);renderChecklist();loadPreviousLevel(true)});
keys.forEach(k=>el(k).addEventListener('input',()=>{
 if(k==='intakeCHourly'&&el('forecastAuto').checked)el('forecastAuto').checked=false;
 if(k==='pondStorage'&&el('storageAuto').checked)el('storageAuto').checked=false;
 if(k==='criticalStorage'&&el('criticalStorageAuto').checked)el('criticalStorageAuto').checked=false;
 if(k==='sjamCHourly'&&el('sjamForecastAuto').checked)el('sjamForecastAuto').checked=false;
 if(k==='pondChange'&&get('pondChange')!==pondChangeAutoValue)pondChangeAutoValue=null;
 if(k==='pondC')applyPreviousChange();
 render();save();
}));
for(const id of ['sjamForecastAuto','storageAuto','criticalStorageAuto'])el(id).addEventListener('change',()=>{render();save()});
for(const field of criticalFlowKeys)el(field).addEventListener(field==='pondCFlowUnit'?'change':'input',()=>{
 el('pondCFlowStatus').dataset.imported='';
 render();save();
});
for(const key of opsExtraKeys)el(key).addEventListener(key==='oRwp'||key==='oTwp'?'change':'input',()=>{render();save()});
for(const key of opsProblemKeys){
 el('o'+key+'Problem').addEventListener('change',()=>{render();save()});
 el('o'+key+'Note').addEventListener('input',()=>{render();save()});
}

for(const id of totalizerKeys)el(id).addEventListener(id.endsWith('Unit')?'change':'input',()=>{render();save()});
el('applyTwTotalizer').addEventListener('click',()=>applyTotalizer('tw','production'));
el('applyRwTotalizer').addEventListener('click',()=>applyTotalizer('rw','rwAbst'));
document.querySelectorAll('#m_startGuide [data-jump]').forEach(button=>button.addEventListener('click',()=>{
 const target=document.getElementById(button.dataset.jump);target?.scrollIntoView({behavior:'smooth',block:'center'});
}));
function updateChangeSignButtons(){
 const current=get('pondChange');
 for(const sign of ['-','+']){
  const id=sign==='-'?'changeMinus':'changePlus';
  el(id).setAttribute('aria-pressed',String(current.startsWith(sign)));
 }
}
for(const id of ['changeMinus','changePlus']){
 el(id).addEventListener('click',()=>{
  const sign=el(id).dataset.sign;
  const input=el('pondChange');
  const numericPart=input.value.replace(/^[+-]/,'');
  input.value=sign+numericPart;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus({preventScroll:true});
  input.setSelectionRange(input.value.length,input.value.length);
 });
}
el('pondChange').addEventListener('input',updateChangeSignButtons);

sivKeys.forEach(k=>el(k).addEventListener(k==='sivStatus'?'change':'input',()=>{render();save()}));
el('operator').addEventListener('input',save);
el('pondAProblem').addEventListener('change',()=>{render();save()});
el('pondANote').addEventListener('input',()=>{render();save()});
el('load').addEventListener('click',()=>retrieve(false));

el('calcPondChange').addEventListener('click',async()=>{
 if(previousDate!==get('date')||!valid(previousPondC))await loadPreviousLevel(true);
 if(!valid(previousPondC))return alert('Tiada bacaan Pond C 0700 semalam dalam database.');
 const level=n('pondC');if(!valid(level))return alert('Isi paras Pond C hari ini dahulu.');
 if(get('pondChange')&&get('pondChange')!==pondChangeAutoValue&&!confirm('Ganti perubahan yang telah diisi dengan beza level semalam?'))return;
 el('pondChange').value=signedChange(level,previousPondC);pondChangeAutoValue=get('pondChange');render();save();
});

el('copyOps').addEventListener('click',async()=>{
 const issue=morningOpsIssue();
 if(issue)return alert(issue);
 try{await navigator.clipboard.writeText(morningOpsText());alert('Report Operasi 0700 disalin.')}
 catch{el('card_ops').open=true;alert('Sila salin teks dari Preview Operasi.')}
});
document.getElementById('m_opsShare').addEventListener('submit',event=>{
 const issue=morningOpsIssue();
 if(issue){event.preventDefault();el('card_ops').open=true;alert(issue);return}
 const code=localStorage.getItem('s2_access_key');
 if(!code){event.preventDefault();if(typeof showLiveAccess==='function')showLiveAccess(true);alert('Masukkan access code S2 dahulu.');return}
 el('opsAccess').value=code;
 el('opsDate').value=get('date');
 el('opsOperator').value=get('operator')||'-';
 el('opsShift').value='MALAM (0700)';
 el('opsData').value=JSON.stringify(morningOpsData());
 el('opsText').value=morningOpsText();
 save();
});

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
 if([2,3,4].includes(no)&&criticalFlowIssue()){
  event.preventDefault();alert(criticalFlowIssue());el('pondCFlowValue').scrollIntoView({behavior:'smooth',block:'center'});return;
 }
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
 if(tab==='morning'){render();renderChecklist();loadPreviousLevel(false)}
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
renderChecklist();
loadPreviousLevel(false);
// Operasi 0700 preview kini hanya mengikuti bacaan tab 0700, bukan tab Operasi syif.
retrieve(true);
})();