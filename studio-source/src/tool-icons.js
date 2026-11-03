import mirrorX from '@tabler/icons/outline/flip-horizontal.svg?url';
import mirrorY from '@tabler/icons/outline/flip-vertical.svg?url';
import align from '@tabler/icons/outline/align-box-center-middle.svg?url';
import center from '@tabler/icons/outline/focus-2.svg?url';
import group from '@tabler/icons/outline/box-multiple.svg?url';
import split from '@tabler/icons/outline/cut.svg?url';
import union from '@tabler/icons/outline/layers-union.svg?url';
import subtract from '@tabler/icons/outline/layers-subtract.svg?url';
import emboss from '@tabler/icons/outline/layers-intersect.svg?url';
import backing from '@tabler/icons/outline/stack-2.svg?url';
import add from '@tabler/icons/outline/square-plus.svg?url';
import shape from '@tabler/icons/outline/shape.svg?url';
import image from '@tabler/icons/outline/photo-scan.svg?url';
import flower from '@tabler/icons/outline/flower.svg?url';
import ring from '@tabler/icons/outline/circle-dashed.svg?url';
import resin from '@tabler/icons/outline/border-outer.svg?url';
import settings from '@tabler/icons/outline/settings.svg?url';
import template from '@tabler/icons/outline/template.svg?url';
import taper from '@tabler/icons/outline/perspective.svg?url';
import led from '@tabler/icons/outline/bulb.svg?url';
import rotate from '@tabler/icons/outline/rotate-3d.svg?url';
import wave from '@tabler/icons/outline/wave-sine.svg?url';
import straight from '@tabler/icons/outline/align-center.svg?url';
export function installToolIcons(){
 const icons={mirrorX,mirrorY,alignSelected:align,centerSelected:center,groupSelected:group,ungroupSelected:group,splitSelected:split,unionSelected:union,subtractSelected:subtract,embossSelected:emboss,engraveSelected:subtract,addBacking:backing,openCustomShape:shape,openImageShape:image,decorTab:flower,attachmentTab:ring,resinTools:resin,arrangeTools:settings,taperTool:taper,ledTool:led,rotateObject:rotate,stagger:wave,align:straight};
 for(const b of document.querySelectorAll('#editToolbar button')){const label=b.id==='arrangeTools'?'Tetapan alat':b.getAttribute('aria-label')||b.textContent.trim(),src=icons[b.id]||b.querySelector('img')?.src||(b.dataset.toolPanel==='storagePanel'?template:add);const icon=document.createElement('img');icon.src=src;icon.alt='';if(b.id==='ungroupSelected')icon.style.opacity='.45';b.replaceChildren(icon);b.setAttribute('aria-label',label);b.removeAttribute('title');b.classList.add('symbolTool')}
 const tip=document.createElement('div');tip.id='toolNameTip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);function show(b){tip.textContent=b.getAttribute('aria-label');tip.hidden=false;const r=b.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+(r.width-tip.offsetWidth)/2))+'px';tip.style.top=(r.bottom+7)+'px'}for(const b of document.querySelectorAll('#editToolbar button')){b.addEventListener('mouseenter',()=>show(b));b.addEventListener('focus',()=>show(b));b.addEventListener('mouseleave',()=>tip.hidden=true);b.addEventListener('blur',()=>tip.hidden=true);b.addEventListener('click',()=>tip.hidden=true)}window.addEventListener('reqoo-language-changed',()=>tip.hidden=true);
}
