/* REQOO PKSK V59 LIVE RUNTIME
   Single live exam controller.
   - app.js remains the ONLY live question/timer/session engine.
   - /api/pksk-v56 is the ONLY authoritative scoring/progress backend.
   - This file contains UI policy only: text briefings + cancel/back navigation.
   - v58-core.js is legacy and is NOT injected by the live middleware.
*/
(function(){
'use strict';
const $=id=>document.getElementById(id);

/* No audio, no speech synthesis, no competing countdown. */
try{
  if(window.speechSynthesis){speechSynthesis.cancel();speechSynthesis.speak=()=>{};speechSynthesis.resume=()=>{};speechSynthesis.pause=()=>{};speechSynthesis.cancel=()=>{}};
}catch(_){ }

const BRIEF={
  ab:{title:'Bahagian A + B',text:'Jawab semua 100 soalan dengan teliti. Anda boleh bergerak antara soalan menggunakan navigasi. Masa keseluruhan 90 minit.'},
  c:{title:'Bahagian C — Artikulasi Penulisan',text:'Pilih satu tajuk dan tulis sekurang-kurangnya 100 patah perkataan. Susun isi, huraian, contoh dan kesimpulan dengan jelas. Masa 45 minit.'}
};
let pendingStart=null;

/* app.js calls this for both A+B and C. It is deliberately text-only. */
window.playAnnouncement=function(key,after){
  const b=BRIEF[key]||{title:'Arahan',text:'Sila baca arahan pada skrin sebelum meneruskan.'};
  if(typeof window.show==='function')window.show('briefing');
  const h=$('briefingTitle'),p=$('voiceText'),s=$('voiceStatus'),mic=document.querySelector('.mic');
  if(h)h.textContent=b.title;
  if(p)p.textContent=b.text;
  if(s)s.textContent='Arahan dipaparkan pada skrin. Tiada audio digunakan.';
  if(mic)mic.style.display='none';
  document.querySelectorAll('.voice-status').forEach(x=>x.textContent='Arahan dipaparkan pada skrin.');
  pendingStart=typeof after==='function'?after:null;
};

/* Replaces the old 3-2-1 voice/countdown with one explicit text button. */
window.countdown=function(callback){
  const box=$('count');
  if(!box)return typeof callback==='function'&&callback();
  box.innerHTML='';
  const b=document.createElement('button');
  b.type='button';
  b.className='v59-start-btn';
  b.textContent=(document.getElementById('briefingTitle')?.textContent||'').includes('Bahagian C')?'MULA BAHAGIAN C →':'MULA BAHAGIAN A + B →';
  b.onclick=function(){b.disabled=true;if(typeof callback==='function')callback();};
  box.appendChild(b);
  pendingStart=callback||null;
};

/* Never allow old audio helpers to become active. */
window.playAudioOnly=function(){};
window.audio=function(){return{play:function(){return Promise.resolve()},pause:function(){},currentTime:0}};

/* Cancel/back button: visible only while actively answering A+B or C. */
function goBack(){
  if(typeof window.exitToDashboard==='function')return window.exitToDashboard();
  location.href='../access/';
}
function installBack(){
  if(document.getElementById('v59-back'))return;
  const b=document.createElement('button');
  b.id='v59-back';b.type='button';b.textContent='← DASHBOARD';b.title='Batalkan latihan dan kembali ke dashboard';
  b.onclick=goBack;
  document.body.appendChild(b);
}
function syncBack(){
  const b=document.getElementById('v59-back');if(!b)return;
  const exam=$('exam'),writing=$('writing');
  const active=!!((exam&&!exam.classList.contains('hidden'))||(writing&&!writing.classList.contains('hidden')));
  b.classList.toggle('show',active);
}
function css(){
  if(document.getElementById('v59-style'))return;
  const s=document.createElement('style');s.id='v59-style';s.textContent=`
#v59-back{position:fixed;left:18px;bottom:18px;z-index:9999;display:none;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:11px 15px;background:#10233f;color:#fff;font:800 12px Inter,Segoe UI,Arial,sans-serif;letter-spacing:.02em;box-shadow:0 8px 24px rgba(10,24,42,.22);transition:.18s}#v59-back.show{display:inline-flex}#v59-back:hover{transform:translateY(-1px);background:#17385f}.v59-start-btn{min-width:270px;border:0;border-radius:14px;padding:16px 24px;background:linear-gradient(135deg,#10233f,#178f8a);color:#fff;font:900 15px Inter,Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 10px 24px rgba(16,35,63,.24)}.v59-start-btn:disabled{opacity:.65;cursor:default}.mic{display:none!important}`;document.head.appendChild(s);
}
function boot(){css();installBack();syncBack();
  const observer=new MutationObserver(syncBack);
  ['exam','writing','briefing','result','start'].forEach(id=>{const e=$(id);if(e)observer.observe(e,{attributes:true,attributeFilter:['class','style']})});
  document.addEventListener('click',()=>setTimeout(syncBack,0),true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();