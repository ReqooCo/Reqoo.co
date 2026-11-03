import circle from '@tabler/icons/outline/circle.svg?url';
import oval from '@tabler/icons/outline/oval-vertical.svg?url';
import square from '@tabler/icons/outline/square.svg?url';
import rounded from '@tabler/icons/outline/square-rounded.svg?url';
import triangle from '@tabler/icons/outline/triangle.svg?url';
import polygon from '@tabler/icons/outline/hexagon.svg?url';
import star from '@tabler/icons/outline/star.svg?url';
import pencil from '@tabler/icons/outline/pencil.svg?url';
export function installShapePalette(){const select=document.getElementById('customShapeKind'),palette=document.createElement('div');palette.id='shapeQuickPalette';for(const [value,label,icon]of [['circle','Bulat',circle],['ellipse','Bujur',oval],['rectangle','Petak',square],['rounded','Bucu bulat',rounded],['triangle','Segi tiga',triangle],['polygon','Poligon',polygon],['star','Bintang',star],['draw','Bentuk sendiri',pencil]]){const b=document.createElement('button');b.type='button';b.dataset.shape=value;b.title=label;b.setAttribute('aria-label',label);b.innerHTML=`<img src="${icon}" alt="">`;b.onclick=()=>{select.value=value;select.dispatchEvent(new Event('input'));select.dispatchEvent(new Event('change'));sync()};palette.append(b)}function sync(){palette.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shape===select.value)))}document.getElementById('customShapeDialog').querySelector('header').after(palette);select.addEventListener('change',sync);document.getElementById('customShapeDialog').addEventListener('toggle',sync);sync()}
