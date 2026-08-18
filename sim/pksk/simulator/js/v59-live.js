/* REQOO PKSK V59 LIVE RUNTIME
   Single live exam controller.
   - app.js remains the ONLY live question/timer/session engine.
   - /api/pksk-v56 is the ONLY authoritative scoring/progress backend.
   - V59 is the compatibility/UI layer: canonical answer normalisation,
     text briefings, cancel/back navigation and result presentation.
   - v58-core.js is legacy and is NOT injected by the live middleware.
*/
(function(){
'use strict';
const $=id=>document.getElementById(id);

/* Canonical answer adapter. Set banks use answerIndex in some newer files
   and weights in older files. The runtime exposes ONE field: q.answer. */
function canonicalAnswer(q){
  if(!q||!Array.isArray(q.options))return null;
  if(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.options.length)return q.answerIndex;
  if(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length)return q.answer;
  if(Array.isArray(q.weights)&&q.weights.length===q.options.length){
    let best=-Infinity,index=-1,tie=false;
    q.weights.forEach((w,i)=>{const n=Number(w);if(!Number.isFinite(n))return;if(n>best){best=n;index=i;tie=false}else if(n===best){tie=true}});
    if(index>=0&&!tie)return index;
  }
  return null;
}
function normaliseBank(data){
  if(!data||!Array.isArray(data.questions))return data;
  data.questions.forEach(q=>{
    const idx=canonicalAnswer(q);
    if(idx!==null){q.answer=idx;q.answerIndex=idx}
    if(q.explanation==null&&q.scoringNote)q.explanation=q.scoringNote;
  });
  return data;
}
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  return nativeFetch(input,init).then(async response=>{
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(/\/sets\/SET%20\d{2}-\d{2}\/data\/set\d{2}\.json(?:\?|$)/.test(url)||/\/sets\/SET\s+\d{2}-\d{2}\/data\/set\d{2}\.json(?:\?|$)/.test(url)){
        const data=await response.clone().json();
        const fixed=normaliseBank(data);
        return new Response(JSON.stringify(fixed),{status:response.status,statusText:response.statusText,headers:response.headers});
      }
    }catch(_){ }
    return response;
  });
};

try{if(window.speechSynthesis){speechSynthesis.cancel();speechSynthesis.speak=()=>{};speechSynthesis.resume=()=>{};speechSynthesis.pause=()=>{};speechSynthesis.cancel=()=>{}}}catch(_){ }
const BRIEF={ab:{title:'Bahagian A + B',text:'Jawab semua 100 soalan dengan teliti. Anda boleh bergerak antara soalan menggunakan navigasi. Masa keseluruhan 90 minit.'},c:{title:'Bahagian C — Artikulasi Penulisan',text:'Pilih satu tajuk dan tulis sekurang-kurangnya 100 patah perkataan. Susun isi, huraian, contoh dan kesimpulan dengan jelas. Masa 45 minit.'}};
window.playAnnouncement=function(key,after){const b=BRIEF[key]||{title:'Arahan',text:'Sila baca arahan pada skrin sebelum meneruskan.'};if(typeof window.show==='function')window.show('briefing');const h=$('briefingTitle'),p=$('voiceText'),s=$('voiceStatus'),mic=document.querySelector('.mic');if(h)h.textContent=b.title;if(p)p.textContent=b.text;if(s)s.textContent='Arahan dipaparkan pada skrin. Tiada audio digunakan.';if(mic)mic.style.display='none';document.querySelectorAll('.voice-status').forEach(x=>x.textContent='Arahan dipaparkan pada skrin.');if(typeof after==='function')after()};
window.countdown=function(callback){const box=$('count');if(!box)return typeof callback==='function'&&callback();box.innerHTML='';const b=document.createElement('button');b.type='button';b.className='v59-start-btn';b.textContent=(document.getElementById('briefingTitle')?.textContent||'').includes('Bahagian C')?'MULA BAHAGIAN C →':'MULA BAHAGIAN A + B →';b.onclick=function(){b.disabled=true;if(typeof callback==='function')callback()};box.appendChild(b)};
window.playAudioOnly=function(){};
function goBack(){if(typeof window.exitToDashboard==='function')return window.exitToDashboard();location.href='../access/'}
function installBack(){if(document.getElementById('v59-back'))return;const b=document.createElement('button');b.id='v59-back';b.type='button';b.textContent='← DASHBOARD';b.title='Batalkan latihan dan kembali ke dashboard';b.onclick=goBack;document.body.appendChild(b)}
function syncBack(){const b=document.getElementById('v59-back');if(!b)return;const exam=$('exam'),writing=$('writing');const active=!!((exam&&!exam.classList.contains('hidden'))||(writing&&!writing.classList.contains('hidden')));b.classList.toggle('show',active)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderReviewB(){const host=$('reviewB');if(!host||!Array.isArray(window.qs)&&typeof qs==='undefined')return;const list=(typeof qs!=='undefined'?qs:window.qs)||[];const b=list.filter(q=>q.section==='BAHAGIAN B');if(!b.length)return;host.innerHTML=`<div class="v59-review-intro"><b>Semak semula jawapan anda</b><span>Jawapan yang betul ditanda dengan <strong>✓ BETUL</strong>. Baca penerangan selepas setiap soalan untuk memahami sebab jawapan tersebut tepat.</span></div><div class="v59-review-list">`+b.map((q,i)=>{const a=answers[q.id],answered=a!==undefined&&a!==null,correct=canonicalAnswer(q),isCorrect=answered&&correct!==null&&Number(a)===Number(correct),status=!answered?'skip':isCorrect?'good':'bad',statusText=!answered?'TIDAK DIJAWAB':isCorrect?'BETUL':'SALAH',options=Array.isArray(q.options)?q.options:[],choices=options.map((o,j)=>{const mine=answered&&Number(a)===j,right=correct!==null&&Number(correct)===j;return `<div class="v59-choice ${right?'right ':''}${mine?'mine ':''}"><span class="v59-choice-key">${String.fromCharCode(65+j)}</span><span class="v59-choice-text">${esc(o)}</span><span class="v59-choice-mark">${right?'✓ Jawapan betul':mine?'Jawapan anda':''}</span></div>`}).join(''),explanation=esc(q.explanation||q.explain||q.scoringNote||'Penerangan jawapan tidak disediakan dalam bank soalan.');return `<article class="v59-review-card ${status}"><div class="v59-review-head"><div><span class="v59-qno">Soalan ${i+1}</span><h3>${esc(q.question)}</h3></div><span class="v59-status">${status==='good'?'✓ ':status==='bad'?'✕ ':'○ '}${statusText}</span></div><div class="v59-choices">${choices}</div><div class="v59-explain"><b>Penerangan</b><p>${explanation}</p></div></article>`}).join('')+'</div>'}
function moveReviewBelowB(){const review=document.querySelector('#reviewB')?.closest('.section-result'),b=document.getElementById('bAnalysis')?.closest('.section-result');if(review&&b&&b.nextElementSibling!==review)b.parentNode.insertBefore(review,b.nextElementSibling);if(review){const h=review.querySelector('h2'),s=review.querySelector('small');if(h)h.textContent='Semakan Jawapan Bahagian B';if(s)s.textContent='Jawapan anda • jawapan betul • penerangan'}}
function refreshResult(){const result=$('result');if(!result||result.classList.contains('hidden'))return;moveReviewBelowB();renderReviewB()}
function css(){if(document.getElementById('v59-style'))return;const s=document.createElement('style');s.id='v59-style';s.textContent=`#v59-back{position:fixed;left:18px;bottom:18px;z-index:9999;display:none;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:11px 15px;background:#10233f;color:#fff;font:800 12px Inter,Segoe UI,Arial,sans-serif;letter-spacing:.02em;box-shadow:0 8px 24px rgba(10,24,42,.22);transition:.18s}#v59-back.show{display:inline-flex}#v59-back:hover{transform:translateY(-1px);background:#17385f}.v59-start-btn{min-width:270px;border:0;border-radius:14px;padding:16px 24px;background:linear-gradient(135deg,#10233f,#178f8a);color:#fff;font:900 15px Inter,Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(16,35,63,.24)}.v59-start-btn:disabled{opacity:.65;cursor:default}.mic{display:none!important}.v59-review-intro{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;margin-bottom:14px;border:1px solid #dbe7e7;border-radius:12px;background:#f4faf9;color:#526476}.v59-review-intro b{color:#17385f;font-size:13px;white-space:nowrap}.v59-review-intro span{font-size:11px;line-height:1.55}.v59-review-intro strong{color:#208a70}.v59-review-list{display:grid;gap:12px}.v59-review-card{border:1px solid #dbe3ed;border-radius:14px;background:#fff;padding:17px 17px 15px;box-shadow:0 5px 16px rgba(16,35,63,.04)}.v59-review-card.good{border-left:5px solid #208a70}.v59-review-card.bad{border-left:5px solid #bd4b4b}.v59-review-card.skip{border-left:5px solid #9aa9bb}.v59-review-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.v59-qno{display:inline-block;font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#6b7b8e;margin-bottom:5px}.v59-review-head h3{margin:0;color:#17243a;font-size:14px;line-height:1.6;font-weight:750}.v59-status{flex:0 0 auto;padding:6px 9px;border-radius:8px;background:#eef3f7;color:#627286;font-size:9px;font-weight:900;letter-spacing:.05em}.v59-review-card.good .v59-status{background:#edf8f4;color:#208a70}.v59-review-card.bad .v59-status{background:#fff1f1;color:#bd4b4b}.v59-choices{display:grid;gap:7px;margin-top:13px}.v59-choice{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:center;border:1px solid #e0e6ed;border-radius:9px;padding:9px 10px;background:#fafbfd}.v59-choice-key{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:#eef2f6;color:#506176;font-size:10px;font-weight:900}.v59-choice-text{font-size:11px;line-height:1.5;color:#35445a}.v59-choice-mark{font-size:9px;font-weight:850;color:#7b8999;text-align:right}.v59-choice.right{border-color:#a9d8ca;background:#f1faf7}.v59-choice.right .v59-choice-key{background:#208a70;color:#fff}.v59-choice.right .v59-choice-mark{color:#208a70}.v59-choice.mine:not(.right){border-color:#e4b5b5;background:#fff6f6}.v59-choice.mine:not(.right) .v59-choice-key{background:#bd4b4b;color:#fff}.v59-choice.mine:not(.right) .v59-choice-mark{color:#bd4b4b}.v59-explain{margin-top:12px;padding:11px 13px;border-radius:10px;background:#f6f8fb;border:1px solid #e7ecf1}.v59-explain b{font-size:10px;color:#526276;text-transform:uppercase;letter-spacing:.07em}.v59-explain p{margin:5px 0 0;font-size:11px;line-height:1.6;color:#536276}@media(max-width:680px){.v59-review-intro{display:block}.v59-review-intro b{display:block;margin-bottom:5px}.v59-review-head{display:block}.v59-status{display:inline-block;margin-top:8px}.v59-choice{grid-template-columns:26px 1fr}.v59-choice-mark{grid-column:2;text-align:left}.v59-review-head h3{font-size:13px}}`;document.head.appendChild(s)}
function boot(){css();installBack();syncBack();const observer=new MutationObserver(()=>{syncBack();refreshResult()});['exam','writing','briefing','result','start'].forEach(id=>{const e=$(id);if(e)observer.observe(e,{attributes:true,attributeFilter:['class','style']})});document.addEventListener('click',()=>setTimeout(()=>{syncBack();refreshResult()},0),true);setTimeout(refreshResult,300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();