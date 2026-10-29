/* Read the immutable quotation revision linked to an order. Never write actual costs here. */
export async function quotationOrderEstimate(env,orderId){
 const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reqoo_quotation_costs'").first();if(!table)return null;
 const quote=await env.DB.prepare("SELECT q.id,q.number,q.company_json,k.cost_json FROM reqoo_documents q JOIN reqoo_quotation_costs k ON k.document_id=q.id AND k.revision=COALESCE(json_extract(q.company_json,'$.quoteMeta.revision'),0) WHERE q.type='quotation' AND q.order_id=? ORDER BY q.created_at,q.id LIMIT 1").bind(orderId).first();if(!quote)return null;
 const costs=JSON.parse(quote.cost_json);if(!costs.enabled)return null;
 const items=(await env.DB.prepare('SELECT quantity FROM reqoo_document_items WHERE document_id=? ORDER BY sort_order,id').bind(quote.id).all()).results||[];
 const known=v=>Number.isSafeInteger(v)&&v>=0,rows=Array.isArray(costs.items)?costs.items:[],countMatches=rows.length===items.length&&items.length>0;
 const sum=keys=>{if(!countMatches||rows.some((r,i)=>!Number.isFinite(Number(items[i].quantity))||Number(items[i].quantity)<=0||keys.some(k=>!known(r?.[k]))))return null;return rows.reduce((total,r,i)=>total+Math.round(keys.reduce((n,k)=>n+r[k],0)*Number(items[i].quantity)),0)};
 const materials=sum(['materialsMinor']),labour=sum(['labourMinor']),other=sum(['packagingMinor','outsourcingMinor','otherMinor']),allowance=sum(['overheadMinor']),orderOther=costs.orderOtherMinor;
 const mapped={materials_minor:materials,labour_minor:labour,shipping_minor:0,other_minor:other!==null&&known(orderOther)?other+orderOther:null},complete=Object.values(mapped).every(known),meta=JSON.parse(quote.company_json||'{}').quoteMeta||{};
 return {sourceQuotationId:quote.id,sourceQuotationNumber:quote.number,sourceRevision:Number(meta.revision||0),complete,costs:mapped,totalMinor:complete?Object.values(mapped).reduce((a,b)=>a+b,0):null,overheadAllowanceMinor:allowance};
}
