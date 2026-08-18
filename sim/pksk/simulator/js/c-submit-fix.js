(function(){
  function findButton(){
    return Array.from(document.querySelectorAll('button')).find(function(btn){
      const t=(btn.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      return t.includes('HANTAR BAHAGIAN C');
    });
  }
  function escapeText(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function emergencyFinish(err){
    console.error('[PKSK C SUBMIT] canonical finish failed:',err);
    try{
      if(typeof winterval!=='undefined')clearInterval(winterval);
      if(typeof phase!=='undefined')phase='done';
      const essay=document.getElementById('essay');
      const text=essay?String(essay.value||'').trim():'';
      const words=text?text.split(/\s+/).length:0;
      const topic=(typeof writing!=='undefined'&&writing&&writing[selectedTopic])?writing[selectedTopic]:{title:'Tajuk dipilih'};
      if(typeof show==='function')show('result');
      const summary=document.getElementById('summary');
      if(summary)summary.innerHTML=[['Bahagian C',words+' patah'],['Status','Dihantar'],['Set',typeof setNo!=='undefined'?'Set '+String(setNo).padStart(2,'0'):'—']].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
      const ca=document.getElementById('cAnalysis');
      if(ca)ca.innerHTML=`<div class="essay-grid"><div class="essay-item"><b>Tajuk</b><p>${escapeText(topic.title)}</p></div><div class="essay-item"><b>Panjang karangan</b><p>${words} patah perkataan</p></div><div class="essay-item"><b>Semakan</b><p>Jawapan telah diterima. Laporan penuh akan diteruskan pada sesi seterusnya.</p></div></div>`;
      const con=document.getElementById('conclusion');
      if(con)con.textContent='Bahagian C telah dihantar. Sistem menggunakan mod pemulihan kerana laporan penuh mengalami ralat. Jawapan anda kekal direkodkan pada sesi ini.';
      if(typeof pkskReportError==='function')pkskReportError('C_RESULT_BUILD_FAILED',String(err&&err.stack||err||'unknown').slice(0,400));
      return true;
    }catch(fallbackErr){
      console.error('[PKSK C SUBMIT] emergency fallback failed:',fallbackErr);
      const status=document.getElementById('minStatus');
      if(status)status.textContent='Ralat sistem. Sila refresh dan cuba sekali lagi.';
      return false;
    }
  }
  function submit(){
    if(typeof phase!=='undefined'&&phase!=='c')phase='c';
    try{
      if(typeof finishWriting!=='function')throw new Error('finishWriting tidak tersedia');
      finishWriting(false);
      return true;
    }catch(err){return emergencyFinish(err)}
  }
  window.__pkskSubmitC=submit;
  function handle(e){
    const target=e.target&&e.target.closest?e.target.closest('button'):null;
    if(!target)return;
    const label=(target.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
    if(label.includes('HANTAR BAHAGIAN C')||target.id==='finishWriting'||target.id==='submitWriting'){
      const writing=document.getElementById('writing');
      if(!writing||writing.classList.contains('hidden'))return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      target.disabled=true;target.textContent='MEMPROSES...';
      const ok=submit();
      if(!ok){target.disabled=false;target.textContent='HANTAR BAHAGIAN C →'}
    }
  }
  // Window capture runs before the legacy document-capture handler in v56-sync.
  window.addEventListener('click',handle,true);
  function bind(){
    const btn=findButton();
    if(btn){btn.type='button';btn.removeAttribute('onclick')}
  }
  bind();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
  const observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});
})();
