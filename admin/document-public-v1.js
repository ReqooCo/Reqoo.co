(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'RM'+(Number(n||0)/100).toFixed(2);
const LEGAL_NAME='AB ART TRADING',SSM_NO='201903337879 (003053605-X)';
const DEFAULT_BANK_DETAILS='Bank: MAYBANK\\nAccount Name: AB ART TRADING\\nAccount No: 5660 1063 5319';
function cleanField(v){const s=String(v??'').trim();return !s||/^(?:-|—|n\/?a|none|null)$/i.test(s)?'':s}
function dateFmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ms-MY',{day:'2-digit',month:'short',year:'numeric'})}
function typeLabel(t){return t==='quotation'?'Quotation':t==='invoice'?'Invoice':t==='receipt'?'Official Receipt':'Delivery Order'}
function customerBlock(doc,meta){
  const name=cleanField(doc.customer_name)||'Customer',attention=cleanField(meta.attention),phone=cleanField(doc.customer_phone),email=cleanField(doc.customer_email),address=cleanField(meta.customerAddress);
  const contacts=[phone?`<div><span>TEL / WHATSAPP</span><b>${esc(phone)}</b></div>`:'',email?`<div><span>EMAIL</span><b>${esc(email)}</b></div>`:''].join('');
  return `<div class="rqPaperCustomer"><div class="rqPaperCustomerName">${esc(name)}</div>${attention?`<div class="rqPaperAttention"><span>ATTN</span><b>${esc(attention)}</b></div>`:''}${contacts?`<div class="rqPaperCustomerContacts">${contacts}</div>`:''}${address?`<div class="rqPaperCustomerAddress"><span>ADDRESS</span><p>${esc(address)}</p></div>`:''}</div>`;
}
function paymentTerms(meta,isQuote){
  const pct=Math.max(0,Math.min(100,Number(meta?.depositPercent||0)));
  if(!isQuote||pct<=0)return'';
  const balance=Math.max(0,100-pct);
  return `<div class="rqPaperPaymentTerms"><b>PAYMENT TERMS</b><p>${esc(pct)}% deposit is required to confirm the order and commence artwork preparation and production. The remaining ${esc(balance)}% balance must be paid in full before delivery or collection.</p></div>`;
}
function paper(doc){
  const c=doc.company||{},meta=c.quoteMeta||{},isQuote=doc.type==='quotation',isInvoice=doc.type==='invoice',isDO=doc.type==='delivery_order',payState=String(doc.payment_status||'pending').toLowerCase(),isPaid=!isQuote&&(payState==='paid'||doc.status==='paid'),depositPct=Math.max(0,Math.min(100,Number(meta.depositPercent||0))),depositInvoice=isInvoice&&depositPct>0&&depositPct<100,depositMinor=depositInvoice?Math.round(Number(doc.total_minor||0)*depositPct/100):0,balanceAfterDeposit=depositInvoice?Math.max(0,Number(doc.total_minor||0)-depositMinor):0;
  const rows=(doc.items||[]).map(i=>isDO?`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td></tr>`:`<tr><td>${esc(i.description)}${i.variation?`<br><small>${esc(i.variation)}</small>`:''}</td><td>${Number(i.quantity||1)}</td><td>${money(i.unit_price_minor)}</td><td>${money(i.line_total_minor)}</td></tr>`).join('');
  const regNo=cleanField(c.registrationNo)||SSM_NO,companyLines=[cleanField(c.address),cleanField(c.phone),cleanField(c.email)].filter(Boolean).join('\n');
  const statusText=isQuote?String(doc.status||'issued').toUpperCase():(isPaid?'PAID':payState==='partial'?'PARTIAL':depositInvoice?'DEPOSIT DUE':'UNPAID');
  const detail=`${!isQuote?`<b>Order:</b> ${esc(doc.order_id)}<br>`:''}<b>Issued:</b> ${esc(dateFmt(doc.issued_at))}${doc.due_at?`<br><b>${isQuote?'Valid until':'Due'}:</b> ${esc(dateFmt(doc.due_at))}`:''}<br><span class="rqPaperStatus ${isPaid?'paid':'unpaid'}">${esc(statusText)}</span>`;
  const table=isDO?`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th></tr></thead><tbody>${rows}</tbody></table>`:`<table class="rqPaperTable"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT PRICE</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>`;
  const invoiceDepositRows=depositInvoice?(payState==='partial'?`<div class="deposit"><span>Deposit Received ${esc(depositPct)}%</span><b>${money(depositMinor)}</b></div><div><span>Balance Due</span><b>${money(balanceAfterDeposit)}</b></div>`:`<div class="deposit"><span>Deposit Required ${esc(depositPct)}%</span><b>${money(depositMinor)}</b></div><div class="deposit"><span>AMOUNT DUE NOW</span><b>${money(depositMinor)}</b></div><div><span>Balance After Deposit</span><b>${money(balanceAfterDeposit)}</b></div>`):'';
  const totals=isDO?'':`<div class="rqPaperTotals"><div><span>Subtotal</span><b>${money(doc.subtotal_minor)}</b></div>${Number(doc.discount_minor)?`<div><span>Discount</span><b>- ${money(doc.discount_minor)}</b></div>`:''}${Number(doc.shipping_minor)?`<div><span>Delivery / Other</span><b>${money(doc.shipping_minor)}</b></div>`:''}${Number(doc.tax_minor)?`<div><span>Tax</span><b>${money(doc.tax_minor)}</b></div>`:''}<div class="grand"><span>Total Order</span><b>${money(doc.total_minor)}</b></div>${isQuote&&Number(meta.depositPercent)>0?`<div class="deposit"><span>Deposit ${esc(meta.depositPercent)}%</span><b>${money(Math.round(Number(doc.total_minor||0)*Number(meta.depositPercent)/100))}</b></div>`:''}${invoiceDepositRows}</div>`;
  const quoteInfo=isQuote&&(meta.notes||meta.terms)?`<div class="rqPaperQuoteInfo">${meta.notes?`<div><b>NOTES</b><p>${esc(meta.notes)}</p></div>`:''}${meta.terms?`<div><b>TERMS & CONDITIONS</b><p>${esc(meta.terms)}</p></div>`:''}</div>`:'';
  const bankDetails=cleanField(c.bank)||DEFAULT_BANK_DETAILS,bank=!isDO?`<div class="rqPaperBank"><b>PAYMENT DETAILS</b><br>${esc(bankDetails)}</div>`:'';
  const foot=isQuote?'Quotation ini bukan bukti pembayaran.':doc.type==='invoice'?(depositInvoice?'Invoice ini menunjukkan nilai penuh order dan deposit yang perlu dibayar pada peringkat semasa.':'Invoice ini merekodkan amaun yang perlu dibayar.'):doc.type==='receipt'?'Official Receipt ini dikeluarkan selepas bayaran disahkan.':'Delivery Order mengesahkan item untuk penghantaran/serahan.';
  return `<section class="rqPaper"><div class="rqPaperTop"><div><div class="rqPaperBrand">${esc(c.companyName||'REQOO.CO')}</div><div class="rqPaperLegal">by ${esc(LEGAL_NAME)}</div><div class="rqPaperReg">SSM: ${esc(regNo)}</div><div class="rqDocMeta">Quality · Design · Innovation</div><div class="rqPaperCompany">${esc(companyLines)}</div></div><div class="rqPaperType"><h1>${esc(typeLabel(doc.type).toUpperCase())}</h1><small>${esc(doc.number)}</small></div></div><div class="rqPaperGrid"><div><div class="rqPaperLabel">BILL TO</div>${customerBlock(doc,meta)}</div><div><div class="rqPaperLabel">DETAIL</div>${detail}</div></div>${doc.type==='receipt'?'<div class="rqReceiptNote">Bayaran telah disahkan oleh Admin Reqoo.</div>':''}${table}${totals}${paymentTerms(meta,isQuote)}${quoteInfo}${bank}<div class="rqPaperFoot">${esc(foot)}<br>${esc(doc.number)} · REQOO.CO</div></section>`;
}
async function load(){try{const token=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'');if(!token)throw Error('Link dokumen tidak sah');const u=new URL('/api/shop-admin',location.origin);u.searchParams.set('action','publicDocument');u.searchParams.set('shareToken',token);const r=await fetch(u,{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Dokumen tidak dijumpai');$('publicState').style.display='none';$('publicDoc').innerHTML=paper(d.document);document.title=`${d.document.number} — REQOO.CO`}catch(e){$('publicState').textContent=e.message}}
$('publicPrint').addEventListener('click',()=>window.print());load();
})();
