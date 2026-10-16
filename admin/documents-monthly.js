(()=>{
'use strict';
const $=id=>document.getElementById(id),panel=$('rqMonthlyPanel'),media=matchMedia('(min-width:1100px)');
if(!panel)return;
const names=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM '+(n/100).toLocaleString('ms-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
let ready=false,loaded=false,seq=0;
const year=new Date().getFullYear();
for(let y=year;y>=year-4;y--){const option=document.createElement('option');option.value=y;option.textContent=y;$('rqMonthlyYear').append(option)}
function chart(rows,series,kind){
 const width=660,height=232,left=62,right=12,top=14,bottom=35,plotH=height-top-bottom,slot=(width-left-right)/12;
 const max=Math.max(0,...rows.flatMap(r=>series.map(s=>r[s.key]))),step=kind==='money'?Math.max(100,Math.ceil(max/400)*100):Math.max(1,Math.ceil(max/4)),ceiling=step*4;
 let svg='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+(kind==='money'?'Nilai invoice dan bayaran diterima mengikut bulan':'Bilangan quotation, invoice dan delivery order mengikut bulan')+'">';
 for(let i=0;i<=4;i++){const y=top+plotH-i*plotH/4,value=i*step,label=kind==='money'?(value/100).toLocaleString('ms-MY',{maximumFractionDigits:0}):value;svg+='<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y+'" y2="'+y+'" class="rqChartGrid"/><text x="'+(left-9)+'" y="'+(y+4)+'" text-anchor="end" class="rqChartLabel">'+esc(label)+'</text>'}
 rows.forEach((r,i)=>{const x=left+i*slot,bar=Math.min(13,(slot-10)/series.length);series.forEach((s,j)=>{const value=r[s.key],h=value/ceiling*plotH,bx=x+slot/2-series.length*bar/2+j*bar;svg+='<rect x="'+bx+'" y="'+(top+plotH-h)+'" width="'+(bar-2)+'" height="'+h+'" rx="3" fill="'+s.color+'"><title>'+names[i]+' · '+s.label+': '+esc(kind==='money'?money(value):value)+'</title></rect>'});svg+='<text x="'+(x+slot/2)+'" y="'+(height-12)+'" text-anchor="middle" class="rqChartLabel">'+names[i]+'</text>'});
 return svg+'</svg>';
}
function render(data){
 const rows=data.months,invoice=rows.reduce((n,r)=>n+r.invoiceMinor,0),paid=rows.reduce((n,r)=>n+r.paidMinor,0),count=rows.reduce((n,r)=>n+r.quotationCount+r.invoiceCount+r.deliveryCount,0);
 const amounts=[{key:'invoiceMinor',label:'Nilai invoice',color:'#a9b6ce'},{key:'paidMinor',label:'Bayaran diterima',color:'#7f9e83'}],counts=[{key:'quotationCount',label:'Quotation',color:'#cbb68b'},{key:'invoiceCount',label:'Invoice',color:'#a9b6ce'},{key:'deliveryCount',label:'Delivery order',color:'#90aaa5'}];
 const legend=items=>'<div class="rqChartLegend">'+items.map(s=>'<span><i style="background:'+s.color+'"></i>'+s.label+'</span>').join('')+'</div>';
 $('rqMonthlyContent').innerHTML='<div class="rqMonthlyTotals"><div><span>Nilai invoice · '+data.year+'</span><strong>'+money(invoice)+'</strong></div><div><span>Bayaran diterima · '+data.year+'</span><strong>'+money(paid)+'</strong></div><div><span>Dokumen dikeluarkan</span><strong>'+count+'</strong></div></div>'+(count===0&&paid===0?'<p class="rqDocsState">Belum ada aktiviti direkodkan untuk tahun ini.</p>':'')+'<div class="rqMonthlyCharts"><article><h3>Invoice dan bayaran <small>RM</small></h3>'+legend(amounts)+chart(rows,amounts,'money')+'</article><article><h3>Aktiviti dokumen <small>Bilangan</small></h3>'+legend(counts)+chart(rows,counts,'count')+'</article></div><p class="rqMonthlyNote">Nilai penuh invoice mengikut tarikh dikeluarkan; bayaran disahkan mengikut tarikh diterima. Bayaran termasuk deposit dan bayaran separa, sekali sahaja—bukan jumlah resit ditambah semula. Masa Malaysia. Carta bebas daripada carian dan filter senarai.</p><details class="rqMonthlyData"><summary>Lihat data bulanan</summary><table><caption>Ringkasan bulanan '+data.year+'</caption><thead><tr><th>Bulan</th><th>Quotation</th><th>Invoice</th><th>Delivery order</th><th>Nilai invoice</th><th>Bayaran diterima</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><th scope="row">'+names[i]+'</th><td>'+r.quotationCount+'</td><td>'+r.invoiceCount+'</td><td>'+r.deliveryCount+'</td><td>'+money(r.invoiceMinor)+'</td><td>'+money(r.paidMinor)+'</td></tr>').join('')+'</tbody></table></details>';
 $('rqMonthlyContent').hidden=false;
}
async function load(){
 if(!ready||!media.matches)return;const request=++seq;loaded=true;panel.setAttribute('aria-busy','true');$('rqMonthlyState').textContent='Memuatkan carta…';$('rqMonthlyContent').hidden=true;
 try{const url=new URL('/api/shop-admin',location.origin);url.searchParams.set('action','documentsMonthlySummary');url.searchParams.set('year',$('rqMonthlyYear').value);const response=await fetch(url,{cache:'no-store'}),data=await response.json();if(request!==seq)return;if(response.status===401){location.href='/admin/?return='+encodeURIComponent(location.pathname);return}if(!response.ok||!data.ok)throw Error(data.error||'Gagal memuatkan carta.');if(!Array.isArray(data.months)||data.months.length!==12)throw Error('Data bulanan tidak lengkap.');render(data);$('rqMonthlyState').textContent='Jan–Dis '+data.year+' · Semua rekod';}
 catch(error){if(request===seq){loaded=false;$('rqMonthlyState').textContent=error.message+' Tekan Muat semula carta untuk cuba lagi.'}}
 finally{if(request===seq)panel.setAttribute('aria-busy','false')}
}
function visibility(){panel.hidden=!media.matches;if(media.matches&&!loaded)load()}
media.addEventListener('change',visibility);
$('rqMonthlyYear').addEventListener('change',load);$('rqMonthlyRefresh').addEventListener('click',load);
$('refreshDocs')?.addEventListener('click',()=>{if(ready&&media.matches)load()});
const start=()=>{ready=true;visibility()};
if(document.documentElement.dataset.rqDocumentsReady==='1')start();else document.addEventListener('rq:documents-ready',start,{once:true});
visibility();
})();
