(()=>{
'use strict';
const DEFAULT_DEPOSIT=50;
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
  for(const m of mutations){
    if(m.type==='attributes'&&m.target?.id==='quoteBuilderBody'&&!m.target.classList.contains('open')){
      const input=document.getElementById('qDeposit');
      if(input){input.dataset.userTouched='';setDefaultDeposit(true)}
    }
  }
});
function init(){setDefaultDeposit();observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
