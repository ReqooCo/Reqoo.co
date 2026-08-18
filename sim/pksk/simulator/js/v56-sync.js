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
})();
