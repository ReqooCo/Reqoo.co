/* REQOO PKSK structured question visual renderer
   Supports the six canonical structured visual kinds without exposing answer-only fields.
*/
(()=>{
'use strict';
const COLORS={ink:'#17243a',muted:'#68788e',line:'#cbd5e1',paper:'#f8fafc',navy:'#10233f',teal:'#178f8a',tealSoft:'#dff3f1',gold:'#e8b95a'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const svg=(body,label,viewBox='0 0 560 300')=>`<div class="question-visual structured-visual" role="img" aria-label="${esc(label)}"><svg viewBox="${viewBox}" width="100%" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto" aria-hidden="true" focusable="false">${body}</svg></div>`;
const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-size="16" font-weight="700" fill="${COLORS.ink}" ${extra}>${esc(s)}</text>`;
const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.ink}" stroke-width="3" stroke-linecap="round" ${extra}/>`;

function fractionBar(v){
  const parts=clamp(Math.round(num(v.parts,1)),1,12),selected=clamp(Math.round(num(v.selected,0)),0,parts);
  const x=30,y=95,w=500/parts,h=82;
  let cells='';
  for(let i=0;i<parts;i++)cells+=`<rect x="${x+i*w}" y="${y}" width="${w}" height="${h}" fill="${i<selected?COLORS.tealSoft:'#fff'}" stroke="${COLORS.navy}" stroke-width="2"/>`;
  return svg(`<rect x="18" y="30" width="524" height="220" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/>${text(280,70,'Pecahan berlorek')} ${cells}${text(280,215,`${selected} daripada ${parts} bahagian`,'font-size="14" fill="'+COLORS.muted+'"')}`,'Rajah pecahan berlorek');
}

function fiveValueData(v){
  const values=(Array.isArray(v.values)?v.values:[]).slice(0,8).map(x=>num(x,0));
  if(!values.length)return '';
  const max=Math.max(...values.map(Math.abs),1),base=225,plotH=125,gap=470/values.length,barW=Math.min(58,gap*.58);
  let bars='';
  values.forEach((value,i)=>{const h=Math.max(4,Math.abs(value)/max*plotH),cx=45+gap*(i+.5),y=base-h;bars+=`<rect x="${cx-barW/2}" y="${y}" width="${barW}" height="${h}" rx="5" fill="${COLORS.tealSoft}" stroke="${COLORS.teal}" stroke-width="2"/>${text(cx,y-10,value,'font-size="14"')}${text(cx,252,i+1,'font-size="12" fill="'+COLORS.muted+'"')}`});
  return svg(`<rect x="18" y="20" width="524" height="260" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/>${text(280,55,'Data lima nilai')}${line(38,225,522,225,'stroke="'+COLORS.line+'" stroke-width="2"')}${bars}`,'Carta data nilai');
}

function rectangle(v){
  const l=num(v.length_cm),w=num(v.width_cm);
  return svg(`<rect x="18" y="20" width="524" height="260" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/><rect x="125" y="78" width="310" height="140" fill="#fff" stroke="${COLORS.navy}" stroke-width="4"/>${line(125,238,435,238,'stroke="'+COLORS.teal+'"')}${line(455,78,455,218,'stroke="'+COLORS.teal+'"')}${text(280,267,`${l} cm`,'fill="'+COLORS.teal+'"')}${text(490,153,`${w} cm`,'fill="'+COLORS.teal+'"')}`,'Rajah segi empat tepat dengan panjang dan lebar');
}

function cuboid(v){
  const l=num(v.length_cm),w=num(v.width_cm),h=num(v.height_cm);
  const front=`145,105 390,105 390,225 145,225`,back=`205,65 450,65 450,185 390,225 390,105 145,105`;
  return svg(`<rect x="18" y="20" width="524" height="260" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/><polyline points="${front}" fill="#fff" stroke="${COLORS.navy}" stroke-width="3"/><polyline points="205,65 450,65 450,185 390,225" fill="none" stroke="${COLORS.navy}" stroke-width="3"/>${line(145,105,205,65)}${line(390,105,450,65)}${line(390,225,450,185)}${text(268,257,`${l} cm`,'fill="'+COLORS.teal+'"')}${text(464,215,`${w} cm`,'fill="'+COLORS.teal+'"')}${text(112,171,`${h} cm`,'fill="'+COLORS.teal+'"')}`,'Rajah kuboid dengan panjang, lebar dan tinggi');
}

function straightLineAngle(v){
  const known=clamp(num(v.known_angle_deg,90),1,179),cx=280,cy=190,r=112,rad=known*Math.PI/180;
  const px=cx+r*Math.cos(rad),py=cy-r*Math.sin(rad),arcR=58;
  const ax=cx+arcR,ay=cy,bx=cx+arcR*Math.cos(rad),by=cy-arcR*Math.sin(rad),large=known>180?1:0;
  const mid=rad/2,kx=cx+88*Math.cos(mid),ky=cy-88*Math.sin(mid);
  const remain=(180-known)*Math.PI/180,mid2=rad+remain/2,ux=cx+82*Math.cos(mid2),uy=cy-82*Math.sin(mid2);
  return svg(`<rect x="18" y="20" width="524" height="260" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/>${line(65,190,495,190)}${line(cx,cy,px,py,'stroke="'+COLORS.teal+'" stroke-width="4"')}<path d="M ${ax} ${ay} A ${arcR} ${arcR} 0 ${large} 0 ${bx} ${by}" fill="none" stroke="${COLORS.gold}" stroke-width="4"/>${text(kx,ky,`${known}°`,'font-size="15"')}${text(ux,uy,'x°','font-size="17" fill="'+COLORS.teal+'"')}`,'Rajah sudut pada garis lurus');
}

function coordinateMove(v){
  const start=Array.isArray(v.start)?v.start:[0,0],sx=num(start[0]),sy=num(start[1]),move=Math.max(0,num(v.move_right));
  const endX=sx+move,maxCoord=Math.max(6,Math.ceil(endX+1),Math.ceil(sy+1)),step=210/maxCoord,ox=135,oy=245;
  let grid='';for(let i=0;i<=maxCoord;i++){const gx=ox+i*step,gy=oy-i*step;grid+=`<line x1="${gx}" y1="35" x2="${gx}" y2="${oy}" stroke="${COLORS.line}" stroke-width="1"/><line x1="${ox}" y1="${gy}" x2="${ox+210}" y2="${gy}" stroke="${COLORS.line}" stroke-width="1"/>`;if(i<maxCoord)grid+=`${text(gx,264,i,'font-size="10" fill="'+COLORS.muted+'"')}${text(119,gy+4,i,'font-size="10" fill="'+COLORS.muted+'"')}`}
  const x1=ox+sx*step,y1=oy-sy*step,x2=ox+endX*step,y2=y1;
  return svg(`<rect x="18" y="15" width="524" height="270" rx="18" fill="${COLORS.paper}" stroke="${COLORS.line}"/>${grid}${line(ox,oy,ox+225,oy,'stroke="'+COLORS.navy+'"')}${line(ox,oy,ox,25,'stroke="'+COLORS.navy+'"')}<circle cx="${x1}" cy="${y1}" r="7" fill="${COLORS.navy}"/>${text(x1,y1+28,`(${sx}, ${sy})`,'font-size="13"')}<line x1="${x1+10}" y1="${y1}" x2="${x2-10}" y2="${y2}" stroke="${COLORS.teal}" stroke-width="4" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="${COLORS.teal}"/></marker></defs><circle cx="${x2}" cy="${y2}" r="7" fill="#fff" stroke="${COLORS.teal}" stroke-width="3"/>${text((x1+x2)/2,y1-22,`${move} unit ke kanan`,'font-size="13" fill="'+COLORS.teal+'"')}${text(x2,y2+27,'?','font-size="17" fill="'+COLORS.teal+'"')}`,'Rajah koordinat dan pergerakan ke kanan','0 0 560 300');
}

const renderers={fraction_bar:fractionBar,five_value_data:fiveValueData,rectangle,cuboid,straight_line_angle:straightLineAngle,coordinate_move:coordinateMove};
function render(value,legacySrc){
  if(!value)return '';
  if(typeof value==='string')return `<div class="question-visual"><img src="${esc(legacySrc(value))}" alt="Rajah soalan"></div>`;
  if(typeof value!=='object')return '';
  const fn=renderers[String(value.kind||'')];
  return fn?fn(value):`<div class="question-visual" role="status"><div style="max-width:560px;margin:0 auto;padding:14px;border:1px solid ${COLORS.line};border-radius:10px;background:${COLORS.paper};color:${COLORS.muted};font-size:12px">Rajah soalan tidak dapat dipaparkan.</div></div>`;
}
window.PKSKVisual={render,supportedKinds:Object.freeze(Object.keys(renderers))};
})();