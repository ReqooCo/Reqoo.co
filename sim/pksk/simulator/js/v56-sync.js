(function(){
  const V56='/api/pksk-v56';
  function call(action,data,done,retries=2){const attempt=n=>{const cb='pkskV56_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script');let finished=false;const timer=setTimeout(()=>finish({ok:false,error:'Server mengambil masa terlalu lama.'}),11000);function finish(r){if(finished)return;finished=true;clearTimeout(timer);delete window[cb];sc.remove();if(r&&r.ok!==false){done(r);return}if(n<retries){setTimeout(()=>attempt(n+1),700*(n+1));return}done(r||{ok:false,error:'Sambungan server gagal.'})}window[cb]=finish;sc.onerror=()=>finish({ok:false,error:'Sambungan server gagal.'});sc.src=V56+'?'+new URLSearchParams({action,callback:cb,...data});document.body.appendChild(sc)};attempt(0)}
  function patchApi(name){const original=window[name];if(typeof original!=='function'||original.__v56)return;const fn=function(action,data,done,retries){const routed=['validateAccess','registerDevice','getCustomerDashboard','saveProgress','logClientError'];if(routed.includes(action))return call(action,data,done,retries??2);return original.apply(this,arguments)};fn.__v56=true;window[name]=fn}
  patchApi('pkskApi');patchApi('api');
  if(typeof window.syncProgressServer==='function'&&!window.syncProgressServer.__v56){
    const fn=function(score,extra){const code=typeof pkskLicense==='function'?pkskLicense():'';if(!code)return;let answerMap={};try{answerMap=answers||{}}catch(_){}let currentSet=1;try{currentSet=Number(setNo||1)}catch(_){}const payload=Object.assign({code,deviceId:typeof pkskDeviceId==='function'?pkskDeviceId():'',setNo:currentSet,completed:true,score:Number(score||0),answers:JSON.stringify(answerMap)},extra||{});call('saveProgress',payload,function(r){if(r&&r.ok){localStorage.setItem('pksk-last-server-sync',new Date().toISOString());localStorage.setItem('pksk-server-score',String(r.serverScore??score??0))}else{try{if(typeof queueProgress==='function')queueProgress(payload);if(typeof pkskReportError==='function')pkskReportError('SAVE_PROGRESS_FAILED',r&&r.error||'Progress sync gagal')}catch(_) {}}},2)};
    fn.__v56=true;window.syncProgressServer=fn;
  }
  function patchDashboard(){if(typeof window.renderDashboard==='function'&&!window.renderDashboard.__v56){const original=window.renderDashboard;const fn=function(r){if(r&&r.license)r.license.maxDevices=3;original.call(this,r);const note=document.querySelector('#login .note');if(note)note.textContent='1 pembelian = 1 lesen • Maksimum 3 peranti • Peranti ke-4 akan ditolak automatik • Set 01–50';const d=document.getElementById('devices');if(d&&r?.license)d.textContent=`${r.license.deviceCount||0} / 3`;const di=document.getElementById('deviceInfo');if(di&&r?.license)di.textContent=`${r.license.deviceCount||0} / 3 peranti digunakan`;const p=(r?.progress||[]).slice().sort((a,b)=>Number(a.setNo)-Number(b.setNo)),last=p.filter(x=>x.completed).pop(),resume=document.getElementById('resume');if(resume){resume.dataset.set=String(last?last.setNo:(localStorage.getItem('pksk-selected-set')||1));resume.textContent=last?`▶ ULANG SET ${String(last.setNo).padStart(2,'0')}`:'▶ MULA SET 01'}};fn.__v56=true;window.renderDashboard=fn}}
  patchDashboard();setTimeout(patchDashboard,500);setTimeout(patchDashboard,1500);

  // Mobile bugfix: the navigation backdrop can survive the transition from A+B to C.
  // Clear it whenever the simulator switches screen so it cannot block the writing editor.
  function patchShow(){
    if(typeof window.show!=='function'||window.show.__v56OverlayFix)return;
    const original=window.show;
    const fn=function(id){
      document.body.classList.remove('nav-open');
      const nav=document.getElementById('navCard');
      if(nav)nav.classList.remove('mobile-open');
      return original.apply(this,arguments);
    };
    fn.__v56OverlayFix=true;
    window.show=fn;
  }
  patchShow();setTimeout(patchShow,100);setTimeout(patchShow,500);

  // Text-only briefing: no voice and no countdown. Use an explicit start button.
  function renderStartButton(label,callback){
    const box=document.getElementById('count');
    if(!box)return;
    box.innerHTML='';
    const btn=document.createElement('button');
    btn.type='button';
    btn.textContent=label;
    btn.style.cssText='display:inline-block;border:0;border-radius:12px;padding:15px 28px;background:#10233f;color:#fff;font-size:15px;font-weight:850;letter-spacing:.02em;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.22)';
    btn.addEventListener('click',()=>{btn.disabled=true;btn.style.opacity='.65';box.innerHTML='';callback()},{once:true});
    box.appendChild(btn);
  }
  function textBriefing(title,text,label,callback){
    document.body.classList.remove('nav-open');
    const nav=document.getElementById('navCard');
    if(nav)nav.classList.remove('mobile-open');
    if(typeof window.show==='function')window.show('briefing');
    const titleEl=document.getElementById('briefingTitle');
    const textEl=document.getElementById('voiceText');
    const statusEl=document.getElementById('voiceStatus');
    if(titleEl)titleEl.textContent=title;
    if(textEl)textEl.textContent=text;
    if(statusEl)statusEl.textContent='Arahan dipaparkan di skrin. Sila baca sebelum mula.';
    renderStartButton(label,callback);
  }
  window.beginABBriefing=function(){
    if(typeof pkskLicense==='function'&&!pkskLicense()){location.href='../access/';return;}
    if(typeof phase!=='undefined')phase='abBrief';
    textBriefing('Bahagian A + B','Sila jawab semua soalan Bahagian A dan Bahagian B dengan teliti. Semak jawapan sebelum menghantar. Masa Bahagian A + B ialah 90 minit.','MULA BAHAGIAN A + B',function(){if(typeof startAB==='function')startAB()});
  };
  window.finishAB=function(auto){
    if(typeof phase!=='undefined'&&phase!=='ab')return;
    if(typeof saveTime==='function')saveTime();
    if(typeof clearInterval==='function')clearInterval(interval);
    if(typeof phase!=='undefined')phase='cBrief';
    const msg=auto?'Masa Bahagian A + B telah tamat. Sila baca arahan Bahagian C.':'Bahagian A + B telah selesai. Sila baca arahan Bahagian C.';
    textBriefing('Bahagian C — Artikulasi Penulisan',msg+' Tulis sekurang-kurangnya 100 patah perkataan. Pilih satu tajuk sahaja. Masa Bahagian C ialah 45 minit.','MULA BAHAGIAN C',function(){if(typeof startWriting==='function')startWriting()});
  };
})();
