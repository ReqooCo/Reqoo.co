(()=>{
'use strict';
function clean(){
  document.querySelector('.tab[data-tab="settings"]')?.remove();
  document.getElementById('settings')?.remove();
}
clean();
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();
