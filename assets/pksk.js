const SETS={};
for(let i=1;i<=50;i++){const group=i<=10?'01-10':i<=20?'11-20':i<=30?'21-30':i<=40?'31-40':'41-50';SETS[i]=`../sim/pksk/simulator/sets/SET ${group}/data/set${String(i).padStart(2,'0')}.json`}
const $=s=>document.querySelector(s);
const state={data:null,items:[],index:0,answers:{},score:0,started:false};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadSet(n){
  $('#status').textContent='Memuat Set '+String(n).padStart(2,'0')+'…';
  try{const r=await fetch(SETS[n]);if(!r.ok)throw new Error('HTTP '+r.status);state.data=await r.json();state.items=state.data.questions||[];state.index=0;state.answers={};state.score=0;state.started=true;render();$('#status').textContent='Set '+String(n).padStart(2,'0')+' sedia.'}
  catch(e){$('#status').textContent='Gagal memuat set: '+e.message;state.started=false;}
}
function render(){
  if(!state.started)return;
  const q=state.items[state.index];
  const pct=Math.round((state.index/state.items.length)*100);
  $('#progress').style.width=pct+'%';$('#count').textContent=`${state.index+1} / ${state.items.length}`;
  $('#section').textContent=q.section||'';$('#category').textContent=q.category||'';$('#qid').textContent=q.id||'';
  $('#question').textContent=q.question||'';
  const chosen=state.answers[state.index];
  $('#options').innerHTML=(q.options||[]).map((o,i)=>`<button class="option ${chosen===i?'selected':''}" data-i="${i}">${esc(o)}</button>`).join('');
  $('#back').disabled=state.index===0;$('#next').textContent=state.index===state.items.length-1?'Tamat & Semak':'Seterusnya';
  $('#quiz').classList.remove('hidden');$('#result').classList.add('hidden');$('#writing').classList.add('hidden');
}
function finish(){
  let total=0,max=0;state.items.forEach((q,i)=>{const w=q.weights||[];max+=Math.max(...w,0);if(state.answers[i]!==undefined)total+=Number(w[state.answers[i]]||0)});
  state.score=total;$('#score').textContent=`${total} / ${max}`;$('#resultText').textContent=`Set ${state.data.set} selesai. Jawapan kamu telah dikira berdasarkan skor item.`;$('#quiz').classList.add('hidden');$('#result').classList.remove('hidden');$('#writing').classList.add('hidden');
  $('#writingList').innerHTML=(state.data.writing||[]).map((w,i)=>`<button class="option" data-writing="${i}"><strong>${esc(w.title)}</strong><br><span class="muted">Minimum ${w.min_words||0} perkataan</span></button>`).join('');
}
$('#set').addEventListener('change',e=>loadSet(Number(e.target.value)));
$('#options').addEventListener('click',e=>{const b=e.target.closest('.option');if(!b)return;state.answers[state.index]=Number(b.dataset.i);render()});
$('#back').addEventListener('click',()=>{if(state.index>0){state.index--;render()}});
$('#next').addEventListener('click',()=>{if(state.answers[state.index]===undefined){alert('Pilih satu jawapan dahulu.');return}if(state.index<state.items.length-1){state.index++;render()}else finish()});
$('#restart').addEventListener('click',()=>loadSet(Number($('#set').value)));
$('#writingList').addEventListener('click',e=>{const b=e.target.closest('[data-writing]');if(!b)return;const w=state.data.writing[Number(b.dataset.writing)];$('#writingTitle').textContent=w.title;$('#writingPrompt').textContent=w.prompt;$('#writing').classList.remove('hidden');$('#result').classList.add('hidden');$('#quiz').classList.add('hidden');$('#answer').value='';$('#wordCount').textContent='0 perkataan'});
$('#answer').addEventListener('input',()=>{$('#wordCount').textContent=(($('#answer').value.trim().match(/\S+/g)||[]).length)+' perkataan'});
$('#closeWriting').addEventListener('click',()=>{$('#writing').classList.add('hidden');$('#result').classList.remove('hidden')});
const select=$('#set');for(let i=1;i<=50;i++){const o=document.createElement('option');o.value=i;o.textContent='Set '+String(i).padStart(2,'0');select.appendChild(o)}
select.value=1;loadSet(1);
