/* REQOO PKSK SIMULATOR — CANONICAL RUNTIME
   Single runtime for Set 01–50. No legacy runtime/overlay patches.
*/
(() => {
'use strict';

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const SET_KEY = n => `reqoo:pksk:set:${pad(n)}`;
const OLD_KEY = n => `pksk-set${pad(n)}`;
const license = () => String(localStorage.getItem('reqoo_pksk_license') || '').trim().toUpperCase();

let bank = null;
let qs = [];
let writing = [];
let setNo = clamp(Number(localStorage.getItem('pksk-selected-set') || 1),1,50);
let phase = 'idle';
let qidx = 0;
let answers = {};
let times = {};
let qStarted = 0;
let timer = 5400;
let wTimer = 2700;
let interval = null;
let winterval = null;
let selectedTopic = 0;
let abStartedAt = null;
let cStartedAt = null;
let saving = false;

function deviceId(){
  let id = localStorage.getItem('reqoo_pksk_device_id');
  if(!id){
    const seed = [navigator.userAgent,navigator.language,screen.width,screen.height,screen.colorDepth].join('|');
    let h = 2166136261;
    for(let i=0;i<seed.length;i++){h ^= seed.charCodeAt(i);h = Math.imul(h,16777619)}
    id = 'FAM-' + (h>>>0).toString(16);
    try{localStorage.setItem('reqoo_pksk_device_id',id)}catch(_){ }
  }
  return id;
}

function api(action,data,done,retries=1){
  const code = license();
  const cb = 'pk_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const sc = document.createElement('script');
  let ended = false, attempt = 0;
  const finish = result => {
    if(ended)return;
    ended = true;
    clearTimeout(timerId);
    delete window[cb];
    sc.remove();
    if(result && result.ok !== false){done?.(result);return}
    if(attempt++ < retries){setTimeout(run,500);return}
    done?.(result || {ok:false,error:'Sambungan server gagal.'});
  };
  const run = () => {
    ended = false;
    const timerId = setTimeout(() => finish({ok:false,error:'Server mengambil masa terlalu lama.'}),9000);
    window[cb] = finish;
    sc.onerror = () => finish({ok:false,error:'Sambungan server gagal.'});
    sc.src = '/api/pksk?'+new URLSearchParams({action,callback:cb,...(data||{})});
    document.body.appendChild(sc);
  };
  if(!code){done?.({ok:false,error:'Tiada lesen PKSK.'});return}
  run();
}

function requireAccess(next){
  const code = license();
  if(!code){location.href='../access/';return}
  api('registerDevice',{code,deviceId:deviceId(),userAgent:navigator.userAgent,setNo},r=>{
    if(r?.ok){next?.();return}
    alert(r?.error || 'Akses tidak sah.');
    location.href='../access/';
  },1);
}

function localState(n=setNo){
  try{return JSON.parse(localStorage.getItem(SET_KEY(n)) || 'null')}catch(_){return null}
}
function saveLocal(n=setNo){
  try{localStorage.setItem(SET_KEY(n),JSON.stringify({answers,times,timer,qidx,wTimer,selectedTopic,essay:$('essay')?.value||'',updatedAt:Date.now()}))}catch(_){ }
}
function restoreLocal(n=setNo){
  const s = localState(n);
  if(!s)return;
  answers = s.answers || {};
  times = s.times || {};
  timer = Number.isFinite(Number(s.timer)) ? Number(s.timer) : 5400;
  wTimer = Number.isFinite(Number(s.wTimer)) ? Number(s.wTimer) : 2700;
  qidx = clamp(Number(s.qidx||0),0,Math.max(0,qs.length-1));
  selectedTopic = clamp(Number(s.selectedTopic||0),0,Math.max(0,writing.length-1));
  if($('essay'))$('essay').value = String(s.essay||'');
}
function clearAttempt(n=setNo){try{localStorage.removeItem(SET_KEY(n));localStorage.removeItem(OLD_KEY(n)+'-session');localStorage.removeItem(OLD_KEY(n)+'-writing')}catch(_){ }}

function saveServer(section='OVERALL',completed=false){
  if(!license() || saving)return;
  saving = true;
  const payload = {
    code:license(),deviceId:deviceId(),setNo,section,completed,
    score:scoreAB().total,answered:Object.keys(answers).length,
    timeUsed:Math.max(0,Math.round((5400-timer)/60)),
    answers:JSON.stringify(answers),essayText:String($('essay')?.value||''),startedAt:abStartedAt||cStartedAt||null
  };
  api('saveProgress',payload,()=>{saving=false},0);
  setTimeout(()=>{saving=false},4000);
}
function saveProgress(){saveLocal();saveServer(phase==='c'?'C':'AB',false)}

function show(id){
  ['start','briefing','exam','writing','result'].forEach(x=>$(x)?.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
  window.scrollTo?.(0,0);
}
function updateSetUI(){
  document.querySelectorAll('.set-label').forEach(e=>e.textContent='SET '+pad(setNo));
  const sel=$('setSelect'); if(sel)sel.value=String(setNo);
  const next=$('nextSetLabel'); if(next)next.textContent=setNo<50?'SET '+pad(setNo+1)+' →':'KEMBALI KE SENARAI SET';
}
function groupPath(n=setNo){const start=Math.floor((n-1)/10)*10+1;return `SET ${pad(start)}-${pad(start+9)}`}

async function load(n=setNo){
  n=clamp(Number(n)||1,1,50);
  const r=await fetch(`sets/${encodeURIComponent(groupPath(n))}/data/set${pad(n)}.json`,{cache:'no-store'});
  if(!r.ok)throw new Error('Set '+pad(n)+' tidak dapat dimuat.');
  const data=await r.json();
  if(!Array.isArray(data.questions))throw new Error('Format bank soalan tidak sah.');
  setNo=n;bank=data;qs=data.questions;writing=Array.isArray(data.writing)?data.writing:[];
  updateSetUI();
  return true;
}
async function selectSet(n){
  if(!license()){location.href='../access/';return false}
  clearInterval(interval);clearInterval(winterval);
  phase='idle';qidx=0;answers={};times={};timer=5400;wTimer=2700;selectedTopic=0;
  try{await load(n);localStorage.setItem('pksk-selected-set',String(setNo));show('start');return true}
  catch(e){alert(e.message||'Set tidak dapat dimuat.');return false}
}
function goHome(){clearInterval(interval);clearInterval(winterval);phase='idle';show('start')}
function nextSet(){if(setNo<50)selectSet(setNo+1);else goHome()}

function beginABBriefing(){
  requireAccess(()=>{
    phase='abBrief';show('briefing');
    $('briefingTitle').textContent='Bahagian A + B';
    $('voiceText').textContent='Calon diminta memberikan perhatian. Baca arahan pada skrin sebelum memulakan ujian.';
    $('voiceStatus').textContent='Arahan selesai. Tekan butang MULA di bawah.';
    countdown(startAB);
  });
}
function countdown(callback){
  const box=$('count');if(!box){callback();return}
  box.innerHTML='';
  const b=document.createElement('button');
  b.type='button';b.className='start-btn';b.textContent='MULA →';
  b.addEventListener('click',()=>{b.disabled=true;callback()},{once:true});
  box.appendChild(b);
}

function startAB(){
  restoreLocal();
  phase='ab';qStarted=Date.now();abStartedAt=Date.now();show('exam');renderQ();renderTimer();
  clearInterval(interval);
  interval=setInterval(()=>{
    timer=Math.max(0,timer-1);renderTimer();
    if(timer<=0){clearInterval(interval);finishAB(true)}
    else if(timer%30===0)saveProgress();
  },1000);
}
function renderTimer(){const m=Math.floor(timer/60),s=timer%60;if($('timer'))$('timer').textContent=pad(m)+':'+pad(s)}
function saveTime(){if(qStarted){times[qidx]=(times[qidx]||0)+(Date.now()-qStarted);qStarted=Date.now();saveLocal()}}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function answer(i){if(phase!=='ab')return;answers[qs[qidx].id]=i;saveTime();renderQ();}
function gotoQ(i){if(!qs[i])return;saveTime();qidx=i;renderQ()}
function prevQ(){if(qidx>0){saveTime();qidx--;renderQ()}}
function nextQ(){saveTime();if(qidx<qs.length-1){qidx++;renderQ()}else confirmFinish()}
function confirmFinish(){if(confirm('Hantar Bahagian A + B sekarang?'))finishAB(false)}
function renderQ(){
  const q=qs[qidx];if(!q)return;
  $('sectionPill').textContent=q.section||'';$('cat').textContent=q.category||'';$('qnum').textContent=`Soalan ${qidx+1} daripada ${qs.length}`;
  const visual=$('qvisual');
  visual.innerHTML=q.visual?`<div class="question-visual"><img src="sets/${encodeURIComponent(groupPath())}/assets/visuals/${encodeURIComponent(q.visual)}" alt="Rajah soalan"></div>`:'';
  $('qtext').textContent=q.question||'';
  $('answeredCount').textContent=`${Object.keys(answers).length} / ${qs.length}`;
  $('opts').innerHTML=(q.options||[]).map((o,i)=>`<label class="opt ${answers[q.id]===i?'selected':''}"><input type="radio" name="opt" ${answers[q.id]===i?'checked':''} aria-label="Pilihan ${String.fromCharCode(65+i)}"><span><b>${String.fromCharCode(65+i)}.</b> ${escapeHtml(o)}</span></label>`).join('');
  $('opts').querySelectorAll('input').forEach((el,i)=>el.addEventListener('change',()=>answer(i)));
  $('prevBtn').disabled=qidx===0;$('nextBtn').textContent=qidx===qs.length-1?'HANTAR A + B →':'SETERUSNYA →';
  $('grid').innerHTML=qs.map((x,i)=>`<button type="button" class="${answers[x.id]!==undefined?'done ':''}${i===qidx?'current':''}">${i+1}</button>`).join('');
  $('grid').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>gotoQ(i)));
}
function toggleMobileNav(force){
  const nav=$('navCard');if(!nav)return;
  const open=typeof force==='boolean'?force:!nav.classList.contains('mobile-open');
  nav.classList.toggle('mobile-open',open);document.body.classList.toggle('nav-open',open);
}

function finishAB(auto=false){
  if(phase!=='ab')return;
  saveTime();clearInterval(interval);phase='cBrief';show('briefing');
  $('briefingTitle').textContent='Bahagian C — Artikulasi Penulisan';
  $('voiceText').textContent=auto?'Masa Bahagian A dan B telah tamat.':'Bahagian A dan B telah selesai.';
  $('voiceStatus').textContent='Pilih tajuk dan tekan MULA BAHAGIAN C.';
  const box=$('count');box.innerHTML='';
  const b=document.createElement('button');b.type='button';b.className='start-btn';b.textContent='MULA BAHAGIAN C →';b.addEventListener('click',startWriting,{once:true});box.appendChild(b);
}
function startWriting(){
  restoreLocal();
  phase='c';cStartedAt=Date.now();show('writing');renderWriting();renderWTimer();
  clearInterval(winterval);
  winterval=setInterval(()=>{
    wTimer=Math.max(0,wTimer-1);renderWTimer();
    if(wTimer<=0){clearInterval(winterval);finishWriting(true)}
    else if(wTimer%30===0)saveProgress();
  },1000);
}
function renderWriting(){
  $('topics').innerHTML=writing.map((t,i)=>`<label class="topic ${i===selectedTopic?'selected':''}"><input type="radio" name="topic" ${i===selectedTopic?'checked':''}><b>${escapeHtml(t.title||'Tajuk '+(i+1))}</b><span>${escapeHtml(t.prompt||'')}</span></label>`).join('');
  $('topics').querySelectorAll('.topic').forEach((el,i)=>{el.addEventListener('click',()=>selectTopic(i))});
  const w=localState();if(w&&typeof w.essay==='string')$('essay').value=w.essay;
  $('essay').oninput=()=>{updateWords();saveLocal()};
  updateWords();
}
function selectTopic(i){selectedTopic=clamp(Number(i),0,Math.max(0,writing.length-1));renderWriting()}
function updateWords(){const text=String($('essay')?.value||'').trim();const n=text?text.split(/\s+/).filter(Boolean).length:0;if($('wordCount'))$('wordCount').textContent=n+' patah perkataan';if($('minStatus')){$('minStatus').textContent=n>=100?'✓ Minimum dicapai':'Minimum 100 patah perkataan';$('minStatus').className=n>=100?'good':'warn'}}
function renderWTimer(){const m=Math.floor(wTimer/60),s=wTimer%60;if($('wTimer'))$('wTimer').textContent=pad(m)+':'+pad(s)}
function finishWriting(auto=false){if(phase!=='c')return;clearInterval(winterval);saveLocal();phase='done';buildResult({auto})}

function weightOf(q,i){
  if(Array.isArray(q.weights)&&Number.isFinite(Number(q.weights[i])))return Number(q.weights[i]);
  return null;
}
function correctIndex(q){
  if(Number.isInteger(Number(q.answerIndex)))return Number(q.answerIndex);
  if(Number.isInteger(Number(q.answer)))return Number(q.answer);
  if(Array.isArray(q.weights)&&q.weights.length)return q.weights.reduce((best,v,i)=>Number(v)>Number(q.weights[best]??-Infinity)?i:best,0);
  return null;
}
function scoreAB(){
  let aMax=0,aScore=0,bTotal=0,bCorrect=0;
  qs.filter(q=>q.section==='BAHAGIAN A').forEach(q=>{const max=Array.isArray(q.weights)?Math.max(...q.weights.map(Number).filter(Number.isFinite),0):0;aMax+=max;const a=answers[q.id];if(a!==undefined){const w=weightOf(q,a);if(w!==null)aScore+=w}});
  qs.filter(q=>q.section==='BAHAGIAN B').forEach(q=>{bTotal++;const c=correctIndex(q);if(c!==null&&Number(answers[q.id])===c)bCorrect++});
  return {aScore,aMax,bCorrect,bTotal,total:aScore+bCorrect};
}
function cScore(){
  const text=String($('essay')?.value||'').trim();const words=text?text.split(/\s+/).filter(Boolean).length:0;const paragraphs=text?text.split(/\n\s*\n/).filter(Boolean).length:0;
  let score=0;if(words>=100)score+=40;if(words>=150)score+=20;if(paragraphs>=2)score+=15;if(paragraphs>=3)score+=10;if(/[.!?]/.test(text))score+=5;if(/[A-Za-zÀ-ÿ]/.test(text))score+=10;return {score:Math.min(100,score),words};
}
function bar(p){return `<div class="meter"><i style="width:${clamp(Math.round(p),0,100)}%"></i></div>`}
function tableA(){
  const groups={};qs.filter(q=>q.section==='BAHAGIAN A').forEach(q=>{const k=q.category||'Lain-lain';groups[k]??={score:0,max:0,n:0};const g=groups[k];g.n++;const max=Array.isArray(q.weights)?Math.max(...q.weights.map(Number).filter(Number.isFinite),0):0;g.max+=max;const a=answers[q.id];if(a!==undefined){const w=weightOf(q,a);if(w!==null)g.score+=w}});
  return `<div class="table"><div class="row head"><div>Kategori</div><div>Skor</div><div>Maks.</div><div>%</div><div></div></div>${Object.entries(groups).map(([k,g])=>{const p=g.max?g.score/g.max*100:0;return `<div class="row"><div>${escapeHtml(k)}</div><div>${g.score}</div><div>${g.max}</div><div>${Math.round(p)}%</div><div>${bar(p)}</div></div>`}).join('')}</div>`;
}
function reviewB(){
  const items=qs.filter(q=>q.section==='BAHAGIAN B');
  return `<div class="review-list">${items.map((q,i)=>{const a=answers[q.id],c=correctIndex(q),st=a===undefined?'skip':c!==null&&Number(a)===c?'good':'bad';const your=a===undefined?'—':`${String.fromCharCode(65+Number(a))}. ${escapeHtml(q.options?.[Number(a)]||'')}`;const right=c===null?'—':`${String.fromCharCode(65+c)}. ${escapeHtml(q.options?.[c]||'')}`;return `<article class="review-item ${st}"><div class="review-top"><b>${i+1}. ${escapeHtml(q.question||'')}</b><strong>${st==='good'?'✓ BETUL':st==='bad'?'✕ SALAH':'○ TIDAK DIJAWAB'}</strong></div><div class="review-answer"><div><b>Jawapan anda:</b> ${your}</div><div><b>Jawapan betul:</b> ${right}</div></div><div class="review-explain"><b>Penerangan:</b> ${escapeHtml(q.explanation||q.scoringNote||'Semak sebab jawapan yang paling tepat.')}</div></article>`}).join('')}</div>`;
}
function buildResult(){
  const s=scoreAB(),c=cScore();show('result');
  $('summary').innerHTML=[['A',s.aMax?Math.round(s.aScore/s.aMax*100)+'%':s.aScore],['B',s.bTotal?Math.round(s.bCorrect/s.bTotal*100)+'%':'0%'],['C',c.score+'%'],['A+B',s.aScore+s.bCorrect],['Dijawab',Object.keys(answers).length+'/'+qs.length],['Perkataan',c.words]].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  $('aAnalysis').innerHTML=tableA();
  const bp=s.bTotal?s.bCorrect/s.bTotal*100:0;$('bAnalysis').innerHTML=`<p><b>${s.bCorrect}/${s.bTotal}</b> soalan Bahagian B dijawab betul.</p>${bar(bp)}`;
  const topic=writing[selectedTopic]?.title||'—';$('cAnalysis').innerHTML=`<div class="essay-grid"><div class="essay-item"><b>Tajuk</b><p>${escapeHtml(topic)}</p></div><div class="essay-item"><b>Jumlah perkataan</b><p>${c.words}</p></div><div class="essay-item"><b>Skor simulasi</b><p>${c.score}%</p></div><div class="essay-item"><b>Status minimum</b><p>${c.words>=100?'Dicapai':'Belum dicapai'}</p></div></div>`;
  $('timeAnalysis').innerHTML=`<p>Bahagian A + B: <b>${Math.round((5400-timer)/60)} minit digunakan</b>.</p><p>Bahagian C: <b>${Math.round((2700-wTimer)/60)} minit digunakan</b>.</p>`;
  $('reviewB').innerHTML=reviewB();
  $('progress').innerHTML=`<div class="progress-wrap"><b>Set ${pad(setNo)}</b><p>Teruskan ke set berikutnya untuk membandingkan prestasi.</p></div>`;
  const overall=Math.round((s.aMax?s.aScore/s.aMax*40:0)+(s.bTotal?s.bCorrect/s.bTotal*40:0)+c.score*0.2);$('conclusionTitle').textContent=overall>=80?'Prestasi sangat baik':overall>=60?'Prestasi baik':'Masih perlu latihan';$('conclusion').textContent=`Skor indikator simulasi ${overall}%. Gunakan semakan Bahagian B dan latihan penulisan untuk memperbaiki kelemahan sebelum set seterusnya.`;
  saveServer('OVERALL',true);saveLocal();
}

function exitToDashboard(){
  if(phase==='ab')saveTime();if(phase==='c')saveLocal();clearInterval(interval);clearInterval(winterval);saveServer(phase==='c'?'C':'AB',false);location.href='../access/';
}

function bindStatic(){
  $('setSelect')?.addEventListener('change',e=>selectSet(e.target.value));
  $('prevBtn')?.addEventListener('click',prevQ);$('nextBtn')?.addEventListener('click',nextQ);
  document.querySelectorAll('.exam-dash').forEach(b=>b.addEventListener('click',exitToDashboard));
  document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.addEventListener('click',()=>toggleMobileNav()));
  document.querySelectorAll('.nav-close').forEach(b=>b.addEventListener('click',()=>toggleMobileNav(false)));
  document.querySelectorAll('.finish-btn').forEach(b=>b.addEventListener('click',confirmFinish));
  $('essay')?.addEventListener('input',()=>{updateWords();saveLocal()});
  document.querySelector('.editor-foot .primary')?.addEventListener('click',()=>finishWriting(false));
  document.querySelector('.result-actions .start-btn')?.addEventListener('click',()=>{clearAttempt();selectSet(setNo)});
  document.querySelector('.result-actions .primary')?.addEventListener('click',nextSet);
  document.querySelectorAll('.result-actions .ghost').forEach((b,i)=>{if(i===0)b.addEventListener('click',exitToDashboard);else b.addEventListener('click',goHome)});
}

async function boot(){
  bindStatic();updateSetUI();
  try{await load(setNo)}catch(e){console.error(e);alert(e.message||'Simulator gagal memuatkan set.')}
}

window.pkskLicense=license;window.pkskDeviceId=deviceId;window.pkskApi=api;
window.beginABBriefing=beginABBriefing;window.startAB=startAB;window.startWriting=startWriting;window.selectSet=selectSet;window.answer=answer;window.gotoQ=gotoQ;window.nextQ=nextQ;window.prevQ=prevQ;window.confirmFinish=confirmFinish;window.finishAB=finishAB;window.finishWriting=finishWriting;window.exitToDashboard=exitToDashboard;window.goHome=goHome;window.nextSet=nextSet;window.toggleMobileNav=toggleMobileNav;window.updateWords=updateWords;window.renderTimer=renderTimer;window.renderWTimer=renderWTimer;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
