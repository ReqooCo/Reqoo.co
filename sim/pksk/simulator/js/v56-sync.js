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

  function clearNav(){document.body.classList.remove('nav-open');const nav=document.getElementById('navCard');if(nav)nav.classList.remove('mobile-open')}
  function patchShow(){if(typeof window.show!=='function'||window.show.__v56OverlayFix)return;const original=window.show;const fn=function(id){clearNav();return original.apply(this,arguments)};fn.__v56OverlayFix=true;window.show=fn}
  patchShow();setTimeout(patchShow,100);setTimeout(patchShow,500);

  // Text-only briefing: no voice and no countdown. Use an explicit start button.
  function renderStartButton(label,callback){const box=document.getElementById('count');if(!box)return;box.innerHTML='';const btn=document.createElement('button');btn.type='button';btn.className='v56-start-btn';btn.textContent=label;btn.addEventListener('click',()=>{btn.disabled=true;btn.classList.add('pressed');box.innerHTML='';callback()},{once:true});box.appendChild(btn)}
  function textBriefing(title,text,label,callback){clearNav();if(typeof window.show==='function')window.show('briefing');const titleEl=document.getElementById('briefingTitle'),textEl=document.getElementById('voiceText'),statusEl=document.getElementById('voiceStatus');if(titleEl)titleEl.textContent=title;if(textEl)textEl.textContent=text;if(statusEl)statusEl.textContent='Arahan dipaparkan di skrin. Sila baca sebelum mula.';renderStartButton(label,callback)}
  window.beginABBriefing=function(){if(typeof pkskLicense==='function'&&!pkskLicense()){location.href='../access/';return}if(typeof phase!=='undefined')phase='abBrief';textBriefing('Bahagian A + B','Sila jawab semua soalan Bahagian A dan Bahagian B dengan teliti. Semak jawapan sebelum menghantar. Masa Bahagian A + B ialah 90 minit.','MULA BAHAGIAN A + B',function(){if(typeof startAB==='function')startAB()})};
  window.finishAB=function(auto){if(typeof phase!=='undefined'&&phase!=='ab')return;if(typeof saveTime==='function')saveTime();if(typeof clearInterval==='function')clearInterval(interval);if(typeof phase!=='undefined')phase='cBrief';const msg=auto?'Masa Bahagian A + B telah tamat. Sila baca arahan Bahagian C.':'Bahagian A + B telah selesai. Sila baca arahan Bahagian C.';textBriefing('Bahagian C — Artikulasi Penulisan',msg+' Tulis sekurang-kurangnya 100 patah perkataan. Pilih satu tajuk sahaja. Masa Bahagian C ialah 45 minit.','MULA BAHAGIAN C',function(){if(typeof startWriting==='function')startWriting()})};

  // Critical fix: some mobile browsers do not honour the old inline handler on the C submit button.
  // Capture the click at document level and call the canonical finishWriting() directly.
  function bindWritingSubmit(){
    if(window.__v56WritingSubmitFix)return;
    window.__v56WritingSubmitFix=true;
    document.addEventListener('click',function(e){
      const target=e.target&&e.target.closest?e.target.closest('button'):null;
      if(!target)return;
      const label=(target.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      if(typeof phase!=='undefined'&&phase==='c'&&(label.includes('HANTAR')||target.id==='finishWriting'||target.id==='submitWriting')){
        e.preventDefault();e.stopImmediatePropagation();
        if(typeof finishWriting==='function')finishWriting(false);
      }
    },true);
  }
  bindWritingSubmit();

  // Clear, high-contrast CBT skin. Keeps the existing DOM and question bank untouched.
  function injectUi(){
    if(document.getElementById('v56-polish'))return;
    const s=document.createElement('style');s.id='v56-polish';s.textContent=`
      .v56-start-btn{display:inline-flex;align-items:center;justify-content:center;min-width:250px;border:0;border-radius:14px;padding:16px 24px;background:linear-gradient(135deg,#16a394,#0f776f);color:#fff;font-size:15px;font-weight:950;letter-spacing:.01em;cursor:pointer;box-shadow:0 12px 28px rgba(15,119,111,.30);transition:transform .15s,box-shadow .15s}.v56-start-btn:active{transform:scale(.98)}.v56-start-btn.pressed{opacity:.65}
      .exam-top{box-shadow:0 5px 18px rgba(7,24,43,.20);position:sticky;top:0;z-index:20}.timer strong{font-variant-numeric:tabular-nums;color:#fff}.q-card{border-radius:18px!important;box-shadow:0 12px 30px rgba(16,35,63,.07)!important}.qtext{font-size:clamp(18px,2.2vw,22px)!important;line-height:1.7!important}.opt{min-height:58px;align-items:center!important;padding:15px 17px!important}.opt input{width:18px;height:18px}.opt.selected{box-shadow:0 0 0 3px rgba(23,143,138,.10)}
      .nav-card{box-shadow:0 10px 28px rgba(16,35,63,.06)}.q-grid button{transition:.15s}.q-grid button:hover{transform:translateY(-1px)}.finish-btn{background:linear-gradient(135deg,#c94d4d,#a53b3b)!important;color:#fff!important;border:0!important;box-shadow:0 8px 18px rgba(165,59,59,.20)}
      .write-card{border-radius:18px!important;box-shadow:0 12px 30px rgba(16,35,63,.07)!important}.write-heading{align-items:flex-start}.write-heading h2{font-size:24px}.topic{padding:16px!important}.topic.selected{box-shadow:0 0 0 3px rgba(23,143,138,.08)}textarea{min-height:390px!important;font-size:16px!important;background:#fff!important}.editor-foot{font-weight:700}.editor-foot #minStatus{color:#bd4b4b}.editor-foot #minStatus:empty{display:none}
      .result-wrap{padding-top:32px}.result-top h1{font-size:clamp(30px,5vw,44px)}.summary-grid{gap:12px}.section-result{box-shadow:0 8px 22px rgba(16,35,63,.05)}
      @media(max-width:700px){.exam-top{height:64px;padding:0 13px}.exam-brand b{font-size:15px}.timer{padding-left:12px}.timer strong{font-size:21px}.exam-layout,.write-layout{padding:12px}.q-card{padding:20px!important;min-height:0}.qtext{font-size:18px!important}.nav-card{padding:14px}.q-grid{grid-template-columns:repeat(5,1fr);gap:6px}.q-grid button{height:38px}.nav-row{gap:8px}.nav-row button{flex:1}.write-card{padding:18px!important}.write-heading{display:block}.write-rule{text-align:left;margin-top:10px}.topics{margin:14px 0}.topic span{font-size:11px}.v56-start-btn{width:min(100%,330px)}.summary-grid{grid-template-columns:repeat(2,1fr)!important}}
    `;document.head.appendChild(s)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectUi);else injectUi();
})();
