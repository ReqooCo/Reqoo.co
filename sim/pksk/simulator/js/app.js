const LICENSE_KEY='reqoo_pksk_v2_license';
const $=id=>document.getElementById(id);
const state={setNo:1,bank:null,questions:[],writing:[],index:0,answers:{},phase:'ab',timer:5400,wTimer:2700,interval:null,wInterval:null,topic:0};

function license(){return (localStorage.getItem(LICENSE_KEY)||'').trim();}
function groupFor(n){const start=Math.floor((n-1)/10)*10+1;return `SET ${String(start).padStart(2,'0')}-${String(start+9).padStart(2,'0')}`}
function dataUrl(n){return `../simulator/sets/${encodeURIComponent(groupFor(n))}/data/set${String(n).padStart(2,'0')}.json`}
function show(id){['loading','exam','writing','result'].forEach(x=>$(x).classList.toggle('hidden',x!==id))}
function fmt(sec){const m=Math.floor(Math.max(0,sec)/60).toString().padStart(2,'0');const s=(Math.max(0,sec)%60).toString().padStart(2,'0');return `${m}:${s}`}
function normalizeQuestion(q,i){
  const options=Array.isArray(q.options)?q.options.map(String):[];
  let answer=Number.isInteger(q.answer)?q.answer:-1;
  if(answer<0||answer>=options.length){
    const weights=Array.isArray(q.weights)?q.weights.map(Number):[];
    if(weights.length===options.length&&options.length) answer=weights.indexOf(Math.max(...weights));
  }
  return {...q,id:q.id||`Q${i+1}`,options,answer};
}
function visualUrl(q){if(!q.visual)return '';return `../simulator/sets/${encodeURIComponent(groupFor(state.setNo))}/assets/visuals/${encodeURIComponent(q.visual)}`}
function save(){localStorage.setItem(`pksk-v2-set-${state.setNo}`,JSON.stringify({answers:state.answers,index:state.index,timer:state.timer,topic:state.topic,wTimer:state.wTimer,essay:($('essay')?.value||'')}))}
function restore(){try{const x=JSON.parse(localStorage.getItem(`pksk-v2-set-${state.setNo}`)||'null');if(!x)return;state.answers=x.answers||{};state.index=Math.min(state.questions.length-1,Math.max(0,Number(x.index)||0));if(Number.isFinite(x.timer))state.timer=x.timer;if(Number.isFinite(x.wTimer))state.wTimer=x.wTimer;state.topic=Number(x.topic)||0;if($('essay'))$('essay').value=typeof x.essay==='string'?x.essay:''}catch{}}
async function loadSet(n){
  if(!license()){location.href='../access/';return}
  state.setNo=Math.min(50,Math.max(1,Number(n)||1));$('setLabel').textContent=`Set ${String(state.setNo).padStart(2,'0')}`;$('resultSet').textContent=String(state.setNo).padStart(2,'0');
  const res=await fetch(`sets/${encodeURIComponent(groupFor(state.setNo))}/data/set${String(state.setNo).padStart(2,'0')}.json`,{cache:'no-store'});
  if(!res.ok)throw new Error(`Set ${state.setNo} gagal dimuat (${res.status})`);
  const data=await res.json();
  if(!Array.isArray(data.questions)||!data.questions.length)throw new Error('Set tiada soalan.');
  state.bank=data;state.questions=data.questions.map(normalizeQuestion);state.writing=Array.isArray(data.writing)?data.writing:[];state.index=0;state.answers={};state.timer=5400;state.wTimer=2700;state.topic=0;restore();
  $('loading').textContent='';show('exam');startABTimer();renderQuestion();renderGrid();
}
function startABTimer(){clearInterval(state.interval);$('timer').textContent=fmt(state.timer);state.interval=setInterval(()=>{state.timer--;$('timer').textContent=fmt(state.timer);if(state.timer<=0){clearInterval(state.interval);finishAB(true)};save()},1000)}
function renderGrid(){const box=$('questionGrid');box.innerHTML='';state.questions.forEach((q,i)=>{const b=document.createElement('button');b.textContent=i+1;b.className=state.answers[q.id]!==undefined?'done':'';if(i===state.index)b.classList.add('current');b.onclick=()=>{state.index=i;renderQuestion();renderGrid();save()};box.appendChild(b)})}
function renderQuestion(){
  const q=state.questions[state.index];$('qNo').textContent=`Soalan ${state.index+1} / ${state.questions.length}`;$('category').textContent=q.section||q.category||'';$('stem').textContent=q.question||'';
  const v=$('visual');v.innerHTML='';if(q.visual){const img=document.createElement('img');img.src=visualUrl(q);img.alt='Rajah soalan';img.className='question-visual';v.appendChild(img)}
  const opts=$('options');opts.innerHTML='';q.options.forEach((text,i)=>{const label=document.createElement('label');label.className='opt'+(state.answers[q.id]===i?' selected':'');const input=document.createElement('input');input.type='radio';input.name='answer';input.checked=state.answers[q.id]===i;input.onchange=()=>{state.answers[q.id]=i;renderQuestion();renderGrid();save()};const span=document.createElement('span');span.textContent=`${String.fromCharCode(65+i)}. ${text}`;label.append(input,span);opts.appendChild(label)});
  $('prev').disabled=state.index===0;$('next').textContent=state.index===state.questions.length-1?'Hantar A + B →':'Seterusnya →';
}
function next(){if(state.index<state.questions.length-1){state.index++;renderQuestion();renderGrid();save()}else finishAB(false)}
function finishAB(auto){if(state.phase!=='ab')return;state.phase='c';clearInterval(state.interval);$('phase').textContent='BAHAGIAN C';startWriting()}
function startWriting(){
  show('writing');clearInterval(state.wInterval);$('wTimer').textContent=fmt(state.wTimer);const topics=state.writing.length?state.writing:[{title:'Tajuk 1',prompt:'Tulis karangan yang jelas dan tersusun.'},{title:'Tajuk 2',prompt:'Huraikan pandangan anda dengan contoh.'},{title:'Tajuk 3',prompt:'Tulis respons berdasarkan pengalaman atau situasi.'}];
  $('topics').innerHTML='';topics.slice(0,3).forEach((t,i)=>{const label=document.createElement('label');label.className='topic'+(i===state.topic?' selected':'');const input=document.createElement('input');input.type='radio';input.name='topic';input.checked=i===state.topic;input.onchange=()=>{state.topic=i;document.querySelectorAll('.topic').forEach((x,j)=>x.classList.toggle('selected',j===i));save()};const b=document.createElement('b');b.textContent=t.title||`Tajuk ${i+1}`;const s=document.createElement('span');s.textContent=t.prompt||'';label.append(input,b,s);$('topics').appendChild(label)});
  const saved=document.getElementById('essay');saved.oninput=()=>{$('words').textContent=`${wordCount(saved.value)} patah perkataan`;save()};$('words').textContent=`${wordCount(saved.value)} patah perkataan`;
  state.wInterval=setInterval(()=>{state.wTimer--;$('wTimer').textContent=fmt(state.wTimer);save();if(state.wTimer<=0){clearInterval(state.wInterval);finishWriting(true)}},1000)
}
function wordCount(t){const x=t.trim();return x?x.split(/\s+/).length:0}
function finishWriting(auto=false){if(state.phase!=='c')return;state.phase='done';clearInterval(state.wInterval);save();renderResult()}
function scoreQuestion(q,i){const chosen=state.answers[q.id];if(chosen===undefined)return 0;const weights=Array.isArray(q.weights)&&q.weights.length===q.options.length?q.weights.map(Number):null;if(weights)return Number.isFinite(weights[chosen])?weights[chosen]:0;return chosen===q.answer?1:0}
function renderResult(){show('result');let earned=0,max=0;const groups={};state.questions.forEach(q=>{const w=Array.isArray(q.weights)&&q.weights.length===q.options.length?q.weights.map(Number):null;const localMax=w?Math.max(...w):1;earned+=scoreQuestion(q);max+=localMax;const k=q.section||'LAIN-LAIN';groups[k]??={earned:0,max:0,count:0};groups[k].earned+=scoreQuestion(q);groups[k].max+=localMax;groups[k].count++});const pct=max?Math.round(earned/max*100):0;$('score').innerHTML=`<div class="score">${earned} / ${max}</div><p>${pct}% skor objektif • Bahagian C disimpan untuk semakan rubrik.</p>`;$('breakdown').innerHTML='';Object.entries(groups).forEach(([k,v])=>{const d=document.createElement('div');d.innerHTML=`<b>${k}</b><br>${v.earned} / ${v.max}`;$('breakdown').appendChild(d)})}
$('prev').onclick=()=>{if(state.index>0){state.index--;renderQuestion();renderGrid();save()}};$('next').onclick=next;$('finishAB').onclick=()=>{if(confirm('Hantar Bahagian A + B sekarang?'))finishAB(false)};$('finishC').onclick=()=>{if(confirm('Hantar Bahagian C sekarang?'))finishWriting(false)};
const params=new URLSearchParams(location.search);loadSet(Number(params.get('set')||localStorage.getItem('pksk-selected-set')||1)).catch(e=>{show('loading');$('loading').textContent=`Gagal memuatkan simulator: ${e.message}`});
