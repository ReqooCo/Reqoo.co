/* REQOO PKSK V57 — single simulator compatibility layer.
   One layer only: access/device API bridge, text briefings, set URL sync,
   verified progress sync. No result renderer or submit click monkey-patches. */
(function(){
  'use strict';
  const API='/api/pksk-v56';
  const TOTAL=50;
  const $=id=>document.getElementById(id);
  const license=()=>String(localStorage.getItem('reqoo_pksk_license')||'').trim().toUpperCase();
  function device(){
    let id=localStorage.getItem('reqoo_pksk_device_id');
    if(!id){id='DEV-'+crypto.getRandomValues(new Uint32Array(3)).join('-')+'-'+Date.now().toString(36);localStorage.setItem('reqoo_pksk_device_id',id)}
    return id;
  }
  function jsonp(action,data,done,retries=2){
    const run=n=>{
      const cb='pkskV57_'+Date.now()+'_'+Math.floor(Math.random()*99999);
      const sc=document.createElement('script'); let finished=false;
      const timer=setTimeout(()=>finish({ok:false,error:'Server mengambil masa terlalu lama.'}),11000);
      function finish(r){
        if(finished)return; finished=true; clearTimeout(timer); delete window[cb]; sc.remove();
        if(r&&r.ok!==false){done(r);return}
        if(n<retries){setTimeout(()=>run(n+1),700*(n+1));return}
        done(r||{ok:false,error:'Sambungan server gagal.'});
      }
      window[cb]=finish;sc.onerror=()=>finish({ok:false,error:'Sambungan server gagal.'});
      sc.src=API+'?'+new URLSearchParams(Object.assign({action,callback:cb},data||{}));
      document.body.appendChild(sc);
    };
    run(0);
  }
  // Replace the legacy API bridge after app.js has loaded. All simulator access/progress
  // calls now use one V56 endpoint instead of competing /api/pksk and V56 wrappers.
  window.pkskApi=function(action,data,done,retries=2){return jsonp(action,data,done||function(){},retries)};
  window.pkskDashApi=function(action,data,done){return window.pkskApi(action,data,done,2)};
  window.pkskLicense=license;
  window.pkskDeviceId=device;
  window.pkskReportError=function(type,message){try{jsonp('logClientError',{code:license(),errorType:type,message:String(message||'').slice(0,400),deviceId:device()},()=>{},0)}catch(_){}};
  window.pkskRequireAccess=function(next){
    const code=license();if(!code){location.href='../access/';return;}
    jsonp('registerDevice',{code,deviceId:device(),userAgent:navigator.userAgent},r=>{
      if(r&&r.ok){next();return}
      localStorage.removeItem('reqoo_pksk_license');
      alert((r&&r.error)||'Akses tidak sah atau had peranti telah dicapai.');location.href='../access/';
    },2);
  };
  // Text-only briefing. No audio and no countdown.
  function briefing(title,text,label,next){
    if(typeof window.show==='function')window.show('briefing');
    const titleEl=$('briefingTitle'),textEl=$('voiceText'),status=$('voiceStatus'),box=$('count');
    if(titleEl)titleEl.textContent=title;if(textEl)textEl.textContent=text;
    if(status)status.textContent='Baca arahan di skrin sebelum meneruskan.';
    const mic=document.querySelector('.mic');if(mic)mic.style.display='none';
    if(!box)return next();box.innerHTML='';
    const btn=document.createElement('button');btn.type='button';btn.className='v57-start-btn';btn.textContent=label;
    btn.onclick=()=>{btn.disabled=true;next()};box.appendChild(btn);
  }
  window.beginABBriefing=function(){
    if(!license()){location.href='../access/';return;}
    if(typeof phase!=='undefined')phase='abBrief';
    briefing('Bahagian A + B','Jawab semua 100 soalan dengan teliti. Anda boleh bergerak antara soalan menggunakan navigasi. Masa keseluruhan ialah 90 minit.','MULA BAHAGIAN A + B →',()=>typeof startAB==='function'&&startAB());
  };
  window.finishAB=function(auto){
    if(typeof phase!=='undefined'&&phase!=='ab')return;
    if(typeof saveTime==='function')saveTime();if(typeof clearInterval==='function')clearInterval(window.interval);
    if(typeof phase!=='undefined')phase='cBrief';
    const msg=auto?'Masa Bahagian A + B telah tamat.':'Bahagian A + B telah selesai.';
    briefing('Bahagian C — Artikulasi Penulisan',msg+' Pilih satu tajuk dan tulis sekurang-kurangnya 100 patah perkataan. Masa 45 minit.','MULA BAHAGIAN C →',()=>typeof startWriting==='function'&&startWriting());
  };
  window.playAnnouncement=function(_key,after){if(typeof after==='function')after()};
  window.playAudioOnly=function(){};
  window.countdown=function(cb){if(typeof cb==='function')cb()};
  // Keep set selection and URL in one place. No reload, no stale ?set=14.
  const originalSelect=window.selectSet;
  window.selectSet=async function(n){
    const requested=Math.max(1,Math.min(TOTAL,Number(n)||1));
    const result=originalSelect?await originalSelect(requested):false;
    if(result!==false || !originalSelect){const u=new URL(location.href);u.searchParams.set('set',String(requested));history.replaceState(null,'',u.pathname+'?'+u.searchParams.toString()+u.hash)}
    return result;
  };
  try{
    const u=new URL(location.href),q=Number(u.searchParams.get('set')||0),saved=Number(localStorage.getItem('pksk-selected-set')||0);
    if(!q&&saved>=1&&saved<=TOTAL){u.searchParams.set('set',String(saved));history.replaceState(null,'',u.pathname+'?'+u.searchParams.toString()+u.hash)}
  }catch(_){ }
  function essayRubric(text){
    const t=String(text||'').trim(),w=t?t.split(/\s+/).length:0;
    const ex=(t.match(/\b(contohnya|sebagai contoh|misalnya|contoh)\b/gi)||[]).length;
    const cx=(t.match(/\b(selain itu|seterusnya|oleh itu|namun|akhir sekali|kesimpulannya|pada pendapat saya)\b/gi)||[]).length;
    const co=/\b(kesimpulannya|sebagai kesimpulan|akhir kata|ringkasnya)\b/i.test(t);
    const r=[w>=100?4:Math.min(4,Math.floor(w/25)),Math.min(4,Math.max(1,Math.floor(w/55))),Math.min(4,ex+(w>=140?1:0)),Math.min(4,Math.max(1,1+Math.min(cx,3))),Math.min(4,(w>=100?2:1)+(co?2:0))];
    return {words:w,total:r.reduce((a,b)=>a+b,0)};
  }
  function answerMap(){try{return Object.assign({},window.answers||{})}catch(_){return {}}}
  function sync(score,extra){
    const code=license();if(!code)return;
    const text=$('essay')?.value||'',c=essayRubric(text);
    const payload=Object.assign({code,deviceId:device(),setNo:Number(window.setNo||1),completed:true,score:Number(score||0),answers:JSON.stringify(answerMap()),scoreC:c.total,essayWords:c.words,essayText:text},extra||{});
    jsonp('saveProgress',payload,r=>{
      if(r&&r.ok){
        localStorage.setItem('pksk-last-server-sync',new Date().toISOString());
        localStorage.setItem('pksk-server-score',String(r.serverScore??score??0));
        localStorage.setItem('pksk-server-score-a',String(r.scoreA??0));
        localStorage.setItem('pksk-server-score-b',String(r.scoreB??0));
        localStorage.setItem('pksk-server-score-c',String(r.scoreC??c.total));
      }else if(typeof queueProgress==='function')queueProgress(payload);
    },2);
  }
  window.syncProgressServer=sync;
  const style=document.createElement('style');style.id='v57-core-style';
  style.textContent='.v57-start-btn{display:inline-flex;align-items:center;justify-content:center;min-width:260px;border:0;border-radius:14px;padding:16px 24px;background:linear-gradient(135deg,#123f67,#178f8a);color:#fff;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(18,63,103,.25)}.v57-start-btn:disabled{opacity:.65}.brief-inner .voice-status{max-width:760px}.mic{display:none!important}';
  document.head.appendChild(style);
})();
