/* Owner-only actions, called after the shared Admin session/role/audit guard. */
const S=v=>String(v??'').trim();
const J=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
export const EXPENSE_CATEGORIES=['Rent','Utilities','Internet','Software','Marketing','Admin wages','Maintenance','Other'];
const dateValid=s=>/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export async function expenseApi(request,env,d,actor){
 if(actor.role!=='owner')return J({ok:false,error:'Owner access required.'},403);
 const action=S(d.action),write=['recordOperatingExpense','voidOperatingExpense'].includes(action);
 if(write&&request.method!=='POST')return J({ok:false,error:'Use POST.'},405);
 if(action==='recordOperatingExpense'){
  const id=S(d.requestId),date=S(d.date),description=S(d.description).slice(0,160),category=S(d.category),amount=d.amountMinor;
  if(!/^[a-zA-Z0-9_-]{12,100}$/.test(id)||!dateValid(date)||!description||!EXPENSE_CATEGORIES.includes(category)||!Number.isSafeInteger(amount)||amount<1||amount>1000000000)return J({ok:false,error:'Enter a valid date, category, description and amount.'},400);
  await env.DB.prepare('INSERT OR IGNORE INTO reqoo_operating_expenses(id,expense_date,category,description,amount_minor,status,recorded_at,recorded_by) VALUES(?,?,?,?,?,\'recorded\',?,?)').bind(id,date,category,description,amount,new Date().toISOString(),actor.name||'Owner').run();
  const expense=await env.DB.prepare('SELECT * FROM reqoo_operating_expenses WHERE id=?').bind(id).first();
  if(expense.expense_date!==date||expense.category!==category||expense.description!==description||expense.amount_minor!==amount)return J({ok:false,error:'This save request already belongs to another expense. Reload before saving.'},409);
  return J({ok:true,expense});
 }
 if(action==='voidOperatingExpense'){
  const reason=S(d.reason).slice(0,300);if(reason.length<3)return J({ok:false,error:'Enter a reason for voiding this expense.'},400);
  const expense=await env.DB.prepare('SELECT * FROM reqoo_operating_expenses WHERE id=?').bind(S(d.id)).first();if(!expense)return J({ok:false,error:'Expense not found.'},404);
  if(expense.status==='recorded')await env.DB.prepare("UPDATE reqoo_operating_expenses SET status='void',voided_at=?,voided_by=?,void_reason=? WHERE id=? AND status='recorded'").bind(new Date().toISOString(),actor.name||'Owner',reason,expense.id).run();
  return J({ok:true});
 }
 const month=S(d.month);if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month))return J({ok:false,error:'Choose a valid month.'},400);
 const offset=Math.max(0,Math.min(1000000,Math.floor(Number(d.offset)||0))),start=month+'-01',next=new Date(start+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const end=next.toISOString().slice(0,10);
 if(action==='operatingExpenses'){
  const rows=(await env.DB.prepare('SELECT * FROM reqoo_operating_expenses WHERE expense_date>=? AND expense_date<? ORDER BY expense_date DESC,recorded_at DESC,id LIMIT 6 OFFSET ?').bind(start,end,offset).all()).results||[];
  return J({ok:true,expenses:rows.slice(0,5),hasMore:rows.length>5,offset});
 }
 // Malaysia calendar month boundaries for UTC order handoffs and confirmed payments.
 const utcStart=new Date(Date.parse(start+'T00:00:00Z')-8*3600000).toISOString(),utcEnd=new Date(next.getTime()-8*3600000).toISOString();
 const [sales,overhead,collected]=await Promise.all([
  env.DB.prepare("SELECT COUNT(*) order_count,COALESCE(SUM(o.total_minor-o.tax_minor),0) sales_minor,SUM(CASE WHEN k.order_id IS NULL THEN 1 ELSE 0 END) missing_costs,COALESCE(SUM(COALESCE(k.materials_minor,0)+COALESCE(k.labour_minor,0)+COALESCE(k.shipping_minor,0)+COALESCE(k.other_minor,0)),0) cost_minor FROM orders o JOIN reqoo_order_handoffs h ON h.order_id=o.id LEFT JOIN reqoo_order_costs k ON k.order_id=o.id WHERE o.fulfillment_status='fulfilled' AND o.payment_status NOT IN ('cancelled','failed','refunded') AND datetime(h.delivered_at)>=datetime(?) AND datetime(h.delivered_at)<datetime(?)").bind(utcStart,utcEnd).first(),
  env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) amount_minor,COUNT(*) count FROM reqoo_operating_expenses WHERE status='recorded' AND expense_date>=? AND expense_date<?").bind(start,end).first(),
  env.DB.prepare("SELECT COALESCE(SUM(amount_minor),0) amount_minor FROM reqoo_payments WHERE status='confirmed' AND datetime(paid_at)>=datetime(?) AND datetime(paid_at)<datetime(?)").bind(utcStart,utcEnd).first()
 ]);
 const missing=Number(sales?.missing_costs||0),revenue=Number(sales?.sales_minor||0),cost=Number(sales?.cost_minor||0),expenses=Number(overhead?.amount_minor||0);
 return J({ok:true,month,summary:{deliveredSalesMinor:revenue,recordedJobCostsMinor:cost,missingCostOrders:missing,deliveredOrders:Number(sales?.order_count||0),overheadMinor:expenses,expenseCount:Number(overhead?.count||0),collectionsMinor:Number(collected?.amount_minor||0),estimatedOperatingResultMinor:missing?null:revenue-cost-expenses}});
}
