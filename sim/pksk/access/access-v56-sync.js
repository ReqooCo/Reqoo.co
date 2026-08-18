(function(){
  const V56='/api/pksk-v56';
  const routed=['validateAccess','registerDevice','getCustomerDashboard','saveProgress','logClientError'];
  function call(action,data,done,retries=2){
    const attempt=n=>{
      const cb='pkskV56Access_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script');let finished=false;
      const timer=setTimeout(()=>finish({ok:false,error:'Server mengambil masa terlalu lama.'}),11000);
      function finish(r){if(finished)return;finished=true;clearTimeout(timer);delete window[cb];sc.remove();if(r&&r.ok!==false){done(r);return}if(n<retries){setTimeout(()=>attempt(n+1),700*(n+1));return}done(r||{ok:false,error:'Sambungan server gagal.'})}
      window[cb]=finish;sc.onerror=()=>finish({ok:false,error:'Sambungan server gagal.'});
      sc.src=V56+'?'+new URLSearchParams({action,callback:cb,...data});document.body.appendChild(sc);
    };attempt(0);
  }
  const original=window.api;
  if(typeof original==='function'&&!original.__v56){
    const wrapped=function(action,data,done,retries){if(routed.includes(action))return call(action,data||{},done,retries??2);return original.apply(this,arguments)};
    wrapped.__v56=true;window.api=wrapped;
  }
  function polishDashboard(){
    if(document.getElementById('pksk-dashboard-v57'))return;
    const s=document.createElement('style');s.id='pksk-dashboard-v57';s.textContent=`
      body{background:linear-gradient(180deg,#f7fafc 0,#eef4f8 100%)!important}.card{box-shadow:0 16px 42px rgba(11,24,48,.07)!important;border-color:#dbe5ee!important}.hero{padding:8px 2px 4px}.hero h1{letter-spacing:-.035em}.license{background:linear-gradient(135deg,#effbf5,#fff)!important;border-color:#b8dfcc!important}.kpis{gap:14px}.kpi{transition:transform .16s,box-shadow .16s;border-radius:17px!important;box-shadow:0 8px 24px rgba(11,24,48,.045)}.kpi:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(11,24,48,.08)}.kpi b{font-variant-numeric:tabular-nums}.section h2{font-size:18px}.setrow{padding:15px!important;border-radius:14px!important;box-shadow:0 5px 16px rgba(11,24,48,.035)}.setrow b{font-size:13px}.bar{height:9px}.cta{position:sticky;bottom:12px;z-index:8;background:rgba(255,255,255,.92);padding:10px;border:1px solid #dbe5ee;border-radius:15px;box-shadow:0 12px 30px rgba(11,24,48,.12);backdrop-filter:blur(10px)}.cta button{min-height:48px}.cta .primary{background:linear-gradient(135deg,#10233f,#193f68)!important;box-shadow:0 8px 18px rgba(16,35,63,.18)}.activity .act{border-radius:12px}.note{border-left:4px solid #178f8a}.head-actions .dark{background:#10233f!important}
      @media(max-width:720px){main{padding-top:18px}.hero h1{font-size:29px}.kpis{gap:9px}.kpi{padding:15px}.kpi b{font-size:23px}.setrow{grid-template-columns:58px 1fr 58px!important;padding:13px!important}.cta{bottom:8px;flex-direction:column}.cta button{width:100%}}
    `;document.head.appendChild(s);
  }
  function syncDeviceLimit(){
    const note=document.querySelector('#login .note');if(note)note.textContent='1 pembelian = 1 lesen • Maksimum 3 peranti • Peranti ke-4 akan ditolak automatik • Set 01–50';
    const d=document.getElementById('devices');if(d){const m=(d.textContent.match(/\/\s*(\d+)/)||[])[1];if(m==='2')d.textContent=d.textContent.replace(/\/\s*2\b/,'/ 3')}
    const di=document.getElementById('deviceInfo');if(di)di.textContent=di.textContent.replace(/\/\s*2\b/,'/ 3').replace(/peranti digunakan$/,'peranti digunakan');
  }
  polishDashboard();syncDeviceLimit();setInterval(syncDeviceLimit,800);
})();
