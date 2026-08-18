/* V63 CANONICAL SCORE BRIDGE: server is authoritative for completed results. */
(function(){
'use strict';
window.syncProgressServer=function(_score,extra){
 const code=typeof pkskLicense==='function'?pkskLicense():'';if(!code)return;
 const payload={action:'scoreAndSave',code,deviceId:typeof pkskDeviceId==='function'?pkskDeviceId():'',setNo:window.setNo||1,answers:window.answers||{},essayText:extra&&extra.essayText||'',timeUsed:extra&&extra.timeUsed||0,startedAt:window.abStartedAt||null};
 fetch('/api/pksk-score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'}).then(r=>r.json()).then(r=>{
   if(!r||!r.ok){if(typeof pkskReportError==='function')pkskReportError('CANONICAL_SCORE_FAILED',r&&r.error||'Skor server gagal');return;}
   window.__canonicalResult=r;
   const summary=document.getElementById('summary');
   if(summary){summary.querySelectorAll('.stat').forEach(el=>{const label=el.querySelector('span')?.textContent||'',b=el.querySelector('b');if(!b)return;if(label==='A indeks keseluruhan')b.textContent=r.scoreA+'%';if(label==='B betul')b.textContent=r.bCorrect+'/70';if(label==='B ketepatan')b.textContent=r.scoreB+'%'})}
   try{localStorage.setItem('pksk-last-server-sync',new Date().toISOString())}catch(_){ }
 }).catch(e=>{if(typeof pkskReportError==='function')pkskReportError('CANONICAL_SCORE_FAILED',e.message||e)})
};
})();