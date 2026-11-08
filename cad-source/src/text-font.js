import {getFont,loadFont} from 'replicad';
export const SKETCH_FONT='DejaVu Sans';
let loader=null,pending=null;
export function setSketchFontLoader(value){loader=value;}
export async function ensureSketchFont(){
 if(getFont(SKETCH_FONT))return;
 if(!loader)throw Error('Sketch text font is unavailable');
 if(!pending)pending=Promise.resolve().then(loader).then(buffer=>loadFont(buffer,SKETCH_FONT)).catch(e=>{pending=null;throw e;});
 await pending;
}
