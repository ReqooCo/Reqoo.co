(()=>{
'use strict';
const API='/api/pksk-v56';
const L=()=>String(localStorage.getItem('reqoo_pksk_license')||'').trim().toUpperCase();
const pad=n=>String(n).padStart(2,'0');
const dev=()=>localStorage.getItem('reqoo_pksk_device_id')||'';
const setNo=()=>{const q=new URLSearchParams(location.search).get('set');return Math.max(1,Math.min(50,Number(q||localStorage.getItem('pksk-selected-set')||1)))};
const oldKey=n=>`reqoo:pksk:set:${pad(n)}`;
const newKey=n=>`reqoo:pksk:${L()}:set:${pad(n)}`;
function migrateAndReset(){const n=setNo();try{localStorage.removeItem(newKey(n));localStorage.removeItem(oldKey(n));}catch(_) {}}
function jsonp(action,data,done,retries=4){let attempt=0;const run=()=>{const cb='pkskfix_'+Date.now()+'_'+Math.random().toString(36).slice(2),s=document.createElement('script');let end=false,t=setTimeout(()=>finish({ok:false}),10000);function finish(r){if(end)return;end=true;clearTimeout(t);delete window[cb];s.remove();if(r?.ok!==false){done(r);return}if(attempt++<retries)setTimeout(run,700);else done(r||{ok:false})}window[cb]=finish;s.onerror=()=>finish({ok:false});s.src=API+'?'+new URLSearchParams({action,callback:cb,_:Date.now(),...data});document.body.appendChild(s)};run()}
function go(){location.href='/access/?code='+encodeURIComponent(L())}
function finishSyncAndGo(btn){const code=L(),n=setNo();let st=null;try{st=JSON.parse(localStorage.getItem(oldKey(n))||'null')}catch(_) {}const answers=st?.answers||{},essay=String(st?.essay||'');const done=()=>go();if(!code||!dev()){setTimeout(done,1800);return}btn.disabled=true;btn.textContent='MENYIMPAN…';jsonp('saveProgress',{code,deviceId:dev(),setNo:n,section:'OVERALL',completed:true,score:0,answered:Object.keys(answers).length,timeUsed:Math.max(0,Math.round((5400-Number(st?.timer||5400)+2700-Number(st?.wTimer||2700))/60)),answers:JSON.stringify(answers),essayText:essay,essayWords:essay.trim().split(/\s+/).filter(Boolean).length,completedAt:new Date().toISOString()},()=>setTimeout(done,500))}
function bind(){const start=document.querySelector('#startABBtn');start?.addEventListener('click',migrateAndReset,true);document.querySelectorAll('.result-actions button').forEach((b,i)=>{if(i===0)b.addEventListener('click',()=>finishSyncAndGo(b),true)})}
window.addEventListener('load',bind);bind();
})();
