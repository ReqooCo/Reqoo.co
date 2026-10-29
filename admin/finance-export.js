/* Excel-friendly CSV: distinguish summary metrics from expense detail rows. */
(function(root){'use strict';
function cell(v){let text=String(v??'');if(/^[\s\uFEFF]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'}
function buildCsv(data){
 const s=data.summary||{},rows=[['Record type','Month','Date','Category / metric','Description','Amount (MYR)','Status']];
 for(const[label,key]of [['Delivered sales excluding tax','deliveredSalesMinor'],['Recorded job costs','recordedJobCostsMinor'],['Recorded overhead','overheadMinor'],['Confirmed collections','collectionsMinor'],['Estimated operating result','estimatedOperatingResultMinor']])rows.push(['Summary',data.month,'',label,key==='estimatedOperatingResultMinor'&&s[key]==null?'Job costs incomplete':'',s[key]==null?'':Number(s[key])/100,key==='estimatedOperatingResultMinor'&&s[key]==null?'Incomplete':'Recorded']);
 rows.push(['Note',data.month,'','','Summary rows are separate from expense detail. Overhead totals include only recorded expenses. Collections are separate from delivered sales.','','']);
 for(const e of data.expenses||[])rows.push(['Expense',data.month,e.expense_date,e.category,e.description+(e.status==='void'?' · Void reason: '+(e.void_reason||''):''),Number(e.amount_minor)/100,e.status]);
 return '\uFEFF'+rows.map(row=>row.map(v=>typeof v==='number'?Number.isFinite(v)?v.toFixed(2):'':cell(v)).join(',')).join('\r\n')+'\r\n';
}
if(typeof module==='object'&&module.exports){module.exports={buildCsv};return}
const host=document.getElementById('operatingExpensesHost'),toolbar=host?.querySelector('.rqExpenseToolbar');if(!toolbar)return;
const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Export CSV';button.dataset.exportFinance='';toolbar.append(button);
button.onclick=async()=>{button.disabled=true;const month=host.querySelector('[data-month]').value;try{const url=new URL('/api/admin-business',location.origin);url.searchParams.set('action','exportOperatingMonth');url.searchParams.set('month',month);const response=await fetch(url,{cache:'no-store'}),data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Export unavailable.');const blob=new Blob([buildCsv(data)],{type:'text/csv;charset=utf-8'}),link=document.createElement('a'),objectUrl=URL.createObjectURL(blob);link.href=objectUrl;link.download='REQOO-Finance-'+data.month+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);host.querySelector('[data-state]').textContent='CSV exported. Summary and expense detail are separate record types.'}catch(e){host.querySelector('[data-state]').textContent=e.message}finally{button.disabled=false}};
})(typeof window==='undefined'?globalThis:window);
