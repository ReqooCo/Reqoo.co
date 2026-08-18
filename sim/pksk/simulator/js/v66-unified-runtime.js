/* REQOO PKSK V66 — SINGLE CANONICAL RUNTIME BRIDGE
   Loaded after app.js. No new parallel state engine. This layer only replaces conflicting legacy hooks.
*/
(function(){
'use strict';
const P='reqoo:pksk:';
const pad=n=>String(n).padStart(2,'0');
const lic=()=>String(localStorage.getItem('reqoo_pksk_license')||'').trim().toUpperCase();
const sn=()=>Math.max(1,Math.min(50,Number(window.setNo||localStorage.getItem('pksk-selected-set')||1)));
const key=(name,n=sn())=>`${P}${lic()}:set:${pad(n)}:${name}`;
const old=(name,n=sn())=>`pksk-set${pad(n)}-${name}`;
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_) {}};
const removeOld=n=>['session','writing','result'].forEach(x=>localStorage.removeItem(old(x,n)));

/* Same physical-device family across Safari/Chrome where browser fingerprint inputs match. */
window.pkskDeviceId=function(){
 const n=navigator,s=screen;
 const raw=[n.platform,n.language,(n.languages||[]).join(','),Intl.DateTimeFormat().resolvedOptions().timeZone,s.width,s.height,s.colorDepth,n.hardwareConcurrency,n.maxTouchPoints,n.deviceMemory||0].join('|');
 let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}
 const id='FAM-'+(h>>>0).toString(16);
 try{localStorage.setItem('reqoo_pksk_device_id',id)}catch(_){}
 return id;
};

function clearOverlays(){
 document.body.classList.remove('nav-open');document.documentElement.classList.remove('nav-open');
 const nav=document.getElementById('navCard');if(nav)nav.classList.remove('mobile-open');
 document.querySelectorAll('.nav-backdrop,.mobile-backdrop,.backdrop').forEach(el=>{if(!el.closest('#writing')){el.classList.remove('active','open','show');el.setAttribute('aria-hidden','true');el.style.pointerEvents='none';el.style.display='none'}});
}
function writingButton(){return [...document.querySelectorAll('button')].find(b=>/MULA BAHAGIAN C/i.test((b.textContent||'').trim()))}
function submitButton(){return [...document.querySelectorAll('button')].find(b=>/HANTAR BAHAGIAN C/i.test((b.textContent||'').trim()))}
function activateButton(b,fn){if(!b||b.dataset.v66==='1')return;if(b.disabled)b.disabled=false;b.removeAttribute('disabled');b.removeAttribute('onclick');b.style.pointerEvents='auto';b.style.position='relative';b.style.zIndex='9999';b.style.touchAction='manipulation';b.dataset.v66='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();fn();},true)}

/* Text-only instructions: voice/audio is legacy and must never block the flow. */
window.playAnnouncement=function(_key,after){
 const status=document.getElementById('voiceStatus');if(status)status.textContent='Arahan dipaparkan dalam teks. Tekan terus untuk meneruskan.';
 setTimeout(()=>typeof after==='function'&&after(),50);
};
window.playAudioOnly=function(){};

window.beginABBriefing=function(){
 if(!lic()){location.href='../access/';return}
 window.phase='abBrief';if(typeof show==='function')show('briefing');
 const t=document.getElementById('briefingTitle');if(t)t.textContent='Bahagian A + B';
 const v=document.getElementById('voiceText');if(v)v.textContent='Baca arahan pada skrin. Apabila bersedia, tekan MULA.';
 const c=document.getElementById('count');if(c)c.textContent='MULA';
};
window.finishAB=function(){
 if(window.phase!=='ab')return;
 try{saveTime()}catch(_){} clearInterval(window.interval);window.phase='cBrief';
 if(typeof show==='function')show('briefing');
 const t=document.getElementById('briefingTitle');if(t)t.textContent='Bahagian C — Artikulasi Penulisan';
 const v=document.getElementById('voiceText');if(v)v.textContent='Pilih satu tajuk, tulis jawapan anda dan tekan HANTAR BAHAGIAN C. Minimum 100 patah perkataan ialah panduan; jawapan tetap boleh dihantar walaupun kurang.';
 const c=document.getElementById('count');if(c)c.textContent='';
 setTimeout(()=>{const b=writingButton();if(b){b.disabled=false;b.style.pointerEvents='auto'}},50);
};

window.startAB=function(){
 window.phase='ab';window.qidx=0;window.answers={};window.times={};window.timer=5400;
 const s=get(key('session'));
 if(s){window.answers=s.answers||{};window.times=s.times||{};window.timer=typeof s.timer==='number'?s.timer:5400;window.qidx=Math.max(0,Math.min(window.qs.length-1,Number(s.qidx||0)))}
 window.qStarted=Date.now();window.abStartedAt=Date.now();show('exam');renderTimer();renderQ();clearInterval(window.interval);window.interval=setInterval(()=>{window.timer--;renderTimer();if(window.timer<=0){clearInterval(window.interval);finishAB(true)}},1000);
};
window.persistSession=function(){
 const n=sn();put(key('session',n),{answers:window.answers||{},times:window.times||{},timer:Number(window.timer||0),qidx:Number(window.qidx||0)});removeOld(n);
};
window.startWriting=function(){
 clearOverlays();window.phase='c';show('writing');window.wTimer=2700;window.cStartedAt=Date.now();window.selectedTopic=0;
 const ws=get(key('writing'))||{};if(typeof ws.wTimer==='number')window.wTimer=ws.wTimer;if(Number.isInteger(Number(ws.selectedTopic)))window.selectedTopic=Number(ws.selectedTopic);
 const topics=document.getElementById('topics');if(topics)topics.innerHTML=(window.writing||[]).map((t,i)=>`<label class="topic ${i===window.selectedTopic?'selected':''}" data-topic="${i}"><input type="radio" name="topic" ${i===window.selectedTopic?'checked':''}><b>${t.title}</b><span>${t.prompt}</span></label>`).join('');
 const essay=document.getElementById('essay');if(essay)essay.value=typeof ws.text==='string'?ws.text:'';
 if(typeof updateWords==='function')updateWords();
 document.querySelectorAll('#topics .topic').forEach(el=>el.addEventListener('click',()=>{const i=Number(el.dataset.topic);window.selectedTopic=i;document.querySelectorAll('#topics .topic').forEach((x,j)=>x.classList.toggle('selected',j===i));const r=document.querySelectorAll('#topics input[name="topic"]')[i];if(r)r.checked=true;persistWriting()}));
 if(essay)essay.oninput=()=>{if(typeof updateWords==='function')updateWords();persistWriting()};
 renderWTimer();clearInterval(window.winterval);window.winterval=setInterval(()=>{window.wTimer--;renderWTimer();if(window.wTimer<=0){clearInterval(window.winterval);finishWriting(true)}},1000);
};
function persistWriting(){put(key('writing'),{wTimer:Number(window.wTimer||0),selectedTopic:Number(window.selectedTopic||0),text:String(document.getElementById('essay')?.value||'')});removeOld(sn())}
window.finishWriting=function(auto){
 if(window.phase!=='c')return;clearInterval(window.winterval);window.phase='done';const text=String(document.getElementById('essay')?.value||'').trim(),words=text?text.split(/\s+/).length:0;window.__pkskEssayText=text;const topic=(window.writing||[])[Number(window.selectedTopic||0)]||{};if(typeof buildResult==='function')buildResult({topic,text,words,auto});
};
window.progressHistory=function(score){const h=get(`reqoo:pksk:${lic()}:history`)||[];const i=h.findIndex(x=>Number(x.set)===sn());if(i>=0)h[i].score=score;else h.push({set:sn(),score});h.sort((a,b)=>a.set-b.set);put(`reqoo:pksk:${lic()}:history`,h);return h.map(x=>`<div class="progress-row"><b>Set ${pad(x.set)}</b><div class="progress-bar"><i style="width:${Math.min(100,Number(x.score)||0)}%"></i></div><span>${x.score}%</span></div>`).join('')||'<p>Belum ada rekod.</p>';};
window.syncProgressServer=function(score,extra){
 const code=lic();if(!code)return;const e=extra||{};const payload=Object.assign({code,deviceId:window.pkskDeviceId(),setNo:sn(),completed:true,score:Number(score||0),answers:JSON.stringify(window.answers||{}),essayText:String(window.__pkskEssayText||'')},e);if(typeof pkskDashApi==='function')pkskDashApi('saveProgress',payload,r=>{if(!r?.ok&&typeof queueProgress==='function')queueProgress(payload)},2);
};

function install(){
 clearOverlays();
 const intro=writingButton();if(intro)activateButton(intro,()=>{clearOverlays();window.startWriting()});
 const submit=submitButton();if(submit)activateButton(submit,()=>window.finishWriting(false));
 const observer=new MutationObserver(()=>{clearOverlays();const a=writingButton();if(a)activateButton(a,()=>{clearOverlays();window.startWriting()});const b=submitButton();if(b)activateButton(b,()=>window.finishWriting(false));});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','disabled','hidden','aria-hidden']});
 setTimeout(()=>observer.disconnect(),180000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
