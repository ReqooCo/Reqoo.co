(()=>{
'use strict';
const DEFAULT_DEPOSIT=50;
const noteText=pct=>`Deposit ${pct}% diperlukan untuk mengesahkan tempahan dan memulakan proses reka bentuk / produksi. Baki bayaran perlu dijelaskan sebelum penghantaran atau serahan.`;
function enhanceDepositNotes(){
  document.querySelectorAll('.rqPaper').forEach(paper=>{
    const deposit=paper.querySelector('.rqPaperTotals .deposit');
    if(!deposit||paper.querySelector('.rqDepositNote'))return;
    const match=(deposit.textContent||'').match(/Deposit\s+([\d.]+)%/i);
    const pct=match?.[1]||String(DEFAULT_DEPOSIT);
    const note=document.createElement('div');
    note.className='rqDepositNote';
    note.innerHTML=`<b>PAYMENT TERM</b><span>${noteText(pct)}</span>`;
    deposit.insertAdjacentElement('afterend',note);
  });
}
function setDefaultDeposit(force=false){
  const input=document.getElementById('qDeposit');
  if(!input)return;
  if(force||(!input.dataset.userTouched&&(!input.value||Number(input.value)===0)))input.value=String(DEFAULT_DEPOSIT);
}
document.addEventListener('input',e=>{if(e.target?.id==='qDeposit')e.target.dataset.userTouched='1'},true);
document.addEventListener('click',e=>{
  if(e.target?.id==='qReset')setTimeout(()=>{const input=document.getElementById('qDeposit');if(input){input.dataset.userTouched='';setDefaultDeposit(true)}},0);
},true);
const observer=new MutationObserver(mutations=>{
  enhanceDepositNotes();
  for(const m of mutations){
    if(m.type==='attributes'&&m.target?.id==='quoteBuilderBody'&&!m.target.classList.contains('open')){
      const input=document.getElementById('qDeposit');
      if(input){input.dataset.userTouched='';setDefaultDeposit(true)}
    }
  }
});
function init(){setDefaultDeposit();enhanceDepositNotes();observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
