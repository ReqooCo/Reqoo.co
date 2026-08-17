(function(){
  const V56='/api/pksk-v56';
  const routed=['validateAccess','registerDevice','getCustomerDashboard','saveProgress','logClientError'];
  function call(action,data,done,retries=2){
    const attempt=n=>{
      const cb='pkskV56Access_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script');
      let finished=false;
      const timer=setTimeout(()=>finish({ok:false,error:'Server mengambil masa terlalu lama.'}),11000);
      function finish(r){if(finished)return;finished=true;clearTimeout(timer);delete window[cb];sc.remove();if(r&&r.ok!==false){done(r);return}if(n<retries){setTimeout(()=>attempt(n+1),700*(n+1));return}done(r||{ok:false,error:'Sambungan server gagal.'})}
      window[cb]=finish;sc.onerror=()=>finish({ok:false,error:'Sambungan server gagal.'});
      sc.src=V56+'?'+new URLSearchParams({action,callback:cb,...data});
      document.body.appendChild(sc);
    };
    attempt(0);
  }
  const original=window.api;
  if(typeof original==='function'&&!original.__v56){
    const wrapped=function(action,data,done,retries){
      if(routed.includes(action))return call(action,data||{},done,retries??2);
      return original.apply(this,arguments);
    };
    wrapped.__v56=true;window.api=wrapped;
  }
  const note=document.querySelector('#login .note');
  if(note)note.textContent='1 pembelian = 1 lesen • Maksimum 3 peranti • Peranti ke-4 akan ditolak automatik • Set 01–50';
})();
