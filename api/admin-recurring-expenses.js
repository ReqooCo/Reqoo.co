import {EXPENSE_CATEGORIES} from './admin-expenses.js';
const S=v=>String(v??'').trim(),J=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}}),validMonth=v=>/^20\d\d-(0[1-9]|1[0-2])$/.test(v);
export async function recurringExpenseApi(request,env,d,actor){
 if(actor.role!=='owner')return J({ok:false,error:'Owner access required.'},403);
 const action=S(d.action),month=S(d.month),id=S(d.id);
 if(action!=='recurringExpenses'&&request.method!=='POST')return J({ok:false,error:'Use POST.'},405);
 if(action==='saveRecurringExpense'){
  const description=S(d.description).slice(0,160),category=S(d.category),amount=d.amountMinor,day=d.day,revision=d.expectedRevision,start=S(d.startMonth),active=d.active===false?0:1;
  if(!/^[A-Za-z0-9_-]{12,64}$/.test(id)||!description||!EXPENSE_CATEGORIES.includes(category)||!Number.isSafeInteger(amount)||amount<1||amount>1000000000||!Number.isInteger(day)||day<1||day>31||!validMonth(start)||!Number.isInteger(revision)||revision<0)return J({ok:false,error:'Enter valid template details.'},400);
  const old=await env.DB.prepare('SELECT * FROM reqoo_recurring_expenses WHERE id=?').bind(id).first();
  if(old&&revision===0){if(old.description===description&&old.category===category&&old.amount_minor===amount&&old.day_of_month===day&&old.start_month===start&&old.active===active)return J({ok:true,template:old});return J({ok:false,error:'This save request already belongs to another template.'},409)}
  let result;if(revision===0)result=await env.DB.prepare('INSERT OR IGNORE INTO reqoo_recurring_expenses(id,description,category,amount_minor,day_of_month,start_month,active,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(id,description,category,amount,day,start,active,new Date().toISOString(),actor.name||'Owner').run();
  else result=await env.DB.prepare('UPDATE reqoo_recurring_expenses SET description=?,category=?,amount_minor=?,day_of_month=?,start_month=?,active=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?').bind(description,category,amount,day,start,active,new Date().toISOString(),actor.name||'Owner',id,revision).run();
  if(!Number(result?.meta?.changes??result?.changes))return J({ok:false,error:'Template changed. Refresh before saving.'},409);
  return J({ok:true,template:await env.DB.prepare('SELECT * FROM reqoo_recurring_expenses WHERE id=?').bind(id).first()});
 }
 if(!validMonth(month))return J({ok:false,error:'Choose a valid month.'},400);
 if(action==='recurringExpenses'){
  const offset=Math.max(0,Math.min(1000000,Math.floor(Number(d.offset)||0))),rows=(await env.DB.prepare("SELECT t.*,e.status recorded_status FROM reqoo_recurring_expenses t LEFT JOIN reqoo_operating_expenses e ON e.id='rec_'||t.id||'_'||? ORDER BY t.active DESC,t.description,t.id LIMIT 6 OFFSET ?").bind(month,offset).all()).results||[];
  return J({ok:true,templates:rows.slice(0,5),hasMore:rows.length>5});
 }
 const template=await env.DB.prepare('SELECT * FROM reqoo_recurring_expenses WHERE id=?').bind(id).first();if(!template)return J({ok:false,error:'Template not found.'},404);
 const expenseId='rec_'+id+'_'+month,existing=await env.DB.prepare('SELECT * FROM reqoo_operating_expenses WHERE id=?').bind(expenseId).first();
 if(existing)return J({ok:true,created:false,expense:existing});
 if(!template.active||month<template.start_month||d.expectedRevision!==template.revision)return J({ok:false,error:'Template changed, paused or not started. Refresh before recording.'},409);
 const [year,m]=month.split('-').map(Number),day=Math.min(template.day_of_month,new Date(Date.UTC(year,m,0)).getUTCDate()),date=month+'-'+String(day).padStart(2,'0');
 const result=await env.DB.prepare("INSERT OR IGNORE INTO reqoo_operating_expenses(id,expense_date,category,description,amount_minor,status,recorded_at,recorded_by) SELECT ?,?,?,?,?, 'recorded',?,? FROM reqoo_recurring_expenses WHERE id=? AND revision=? AND active=1").bind(expenseId,date,template.category,template.description,template.amount_minor,new Date().toISOString(),actor.name||'Owner',id,template.revision).run();
 const expense=await env.DB.prepare('SELECT * FROM reqoo_operating_expenses WHERE id=?').bind(expenseId).first();if(!expense)return J({ok:false,error:'Template changed. Refresh before recording.'},409);
 return J({ok:true,created:!!Number(result?.meta?.changes??result?.changes),expense});
}
