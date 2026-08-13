/* REQOO PKSK BACKEND V1.4 — CUSTOMER DASHBOARD + DEVICE CONTROL + PROGRESS + ADMIN */
const SPREADSHEET_ID='1-2xHWFrHWPuVw4X0KvddBOuF9C79Hl4q35_6xVlK7dc';
const ADMIN_TOKEN='adminpksk'; // keep the same token used by your current PKSK Admin deployment
const ORDERS_SHEET='PKSK_Orders';
const LICENSES_SHEET='PKSK_Licenses';
const DEVICES_SHEET='PKSK_Devices';
const PROGRESS_SHEET='PKSK_Progress';
const ACTIVITY_SHEET='PKSK_Activity';
const PKSK_AMOUNT=29;
const MAX_DEVICES=2;

function pkskJsonp_(callback,payload){
  const safe=/^[A-Za-z0-9_$]+$/.test(String(callback||''))?String(callback):'';
  const text=JSON.stringify(payload);
  return safe?ContentService.createTextOutput(safe+'('+text+')').setMimeType(ContentService.MimeType.JAVASCRIPT):ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
function pkskSS_(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function pkskSheet_(name,headers){
  const ss=pkskSS_();let sh=ss.getSheetByName(name);
  if(!sh)sh=ss.insertSheet(name);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1)}
  else if(sh.getLastColumn()<headers.length)sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}
function setupPKSK(){
  pkskSheet_(ORDERS_SHEET,['orderNo','name','phone','ref','amount','status','licenseCode','createdAt','verifiedAt','adminNote']);
  pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']);
  pkskSheet_(DEVICES_SHEET,['licenseCode','deviceId','label','userAgent','firstSeen','lastSeen','active']);
  pkskSheet_(PROGRESS_SHEET,['licenseCode','setNo','completed','score','aIndex','bCorrect','answered','timeUsed','essayWords','updatedAt']);
  pkskSheet_(ACTIVITY_SHEET,['createdAt','licenseCode','action','message','deviceId']);
}
function pkskFindRow_(sheet,col,value){
  const last=sheet.getLastRow();if(last<2)return -1;const vals=sheet.getRange(2,col,last-1,1).getValues();
  for(let i=0;i<vals.length;i++)if(String(vals[i][0]).trim()===String(value).trim())return i+2;return -1;
}
function pkskLicenseRow_(code){return pkskFindRow_(pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']),1,String(code||'').trim().toUpperCase())}
function pkskLicense_(code){
  const sh=pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']);const row=pkskLicenseRow_(code);
  if(row<2)return null;const v=sh.getRange(row,1,1,7).getValues()[0];return {row,code:String(v[0]||''),orderNo:String(v[1]||''),name:String(v[2]||''),phone:String(v[3]||''),status:String(v[4]||'').toUpperCase(),createdAt:v[5]||'',activatedAt:v[6]||''};
}
function pkskDevices_(code){
  const sh=pkskSheet_(DEVICES_SHEET,['licenseCode','deviceId','label','userAgent','firstSeen','lastSeen','active']);const v=sh.getDataRange().getValues();
  if(v.length<2)return [];return v.slice(1).filter(r=>String(r[0]||'').toUpperCase()===String(code||'').toUpperCase()&&String(r[6]||'TRUE').toLowerCase()!=='false').map(r=>({licenseCode:String(r[0]||''),deviceId:String(r[1]||''),label:String(r[2]||'Device'),userAgent:String(r[3]||''),firstSeen:r[4]||'',lastSeen:r[5]||'',active:true}));
}
function pkskLog_(code,action,message,deviceId){try{pkskSheet_(ACTIVITY_SHEET,['createdAt','licenseCode','action','message','deviceId']).appendRow([new Date(),String(code||''),String(action||''),String(message||''),String(deviceId||'')])}catch(e){}}
function pkskValidate_(code){
  const lic=pkskLicense_(code);if(!lic)return {ok:false,error:'Access Code tidak sah.'};
  if(lic.status!=='ACTIVE')return {ok:false,error:'Access Code belum aktif atau telah disekat.'};
  const devices=pkskDevices_(lic.code);return {ok:true,active:true,licenseCode:lic.code,name:lic.name,phone:lic.phone,status:lic.status,maxDevices:MAX_DEVICES,deviceCount:devices.length,message:'Akses disahkan.'};
}
function pkskRegisterDevice_(code,deviceId,userAgent){
  const v=pkskValidate_(code);if(!v.ok)return v;deviceId=String(deviceId||'').trim();if(!deviceId)return {ok:false,error:'ID peranti diperlukan.'};
  const sh=pkskSheet_(DEVICES_SHEET,['licenseCode','deviceId','label','userAgent','firstSeen','lastSeen','active']);const rows=sh.getDataRange().getValues();let found=-1;
  for(let i=1;i<rows.length;i++)if(String(rows[i][0]).toUpperCase()===v.licenseCode&&String(rows[i][1])===deviceId){found=i+1;break}
  const now=new Date();
  if(found>1){sh.getRange(found,6).setValue(now);sh.getRange(found,7).setValue('TRUE');pkskLog_(v.licenseCode,'device_seen','Peranti dikenali semula.',deviceId);return {ok:true,registered:true,deviceCount:pkskDevices_(v.licenseCode).length,maxDevices:MAX_DEVICES}}
  const devices=pkskDevices_(v.licenseCode);if(devices.length>=MAX_DEVICES)return {ok:false,error:`Had peranti dicapai (${MAX_DEVICES}/${MAX_DEVICES}). Sila hubungi admin untuk reset peranti.`};
  const label=/iphone|ipad/i.test(userAgent)?'iPhone / iPad':/android/i.test(userAgent)?'Android':/windows/i.test(userAgent)?'Windows':/mac/i.test(userAgent)?'Mac':'Browser';
  sh.appendRow([v.licenseCode,deviceId,label,String(userAgent||'').slice(0,500),now,now,'TRUE']);pkskLog_(v.licenseCode,'device_registered',label+' didaftarkan.',deviceId);
  return {ok:true,registered:true,deviceCount:devices.length+1,maxDevices:MAX_DEVICES,label};
}
function pkskProgress_(code){
  const sh=pkskSheet_(PROGRESS_SHEET,['licenseCode','setNo','completed','score','aIndex','bCorrect','answered','timeUsed','essayWords','updatedAt']);const v=sh.getDataRange().getValues();
  if(v.length<2)return [];return v.slice(1).filter(r=>String(r[0]||'').toUpperCase()===String(code||'').toUpperCase()).map(r=>({setNo:Number(r[1]||0),completed:String(r[2]||'').toLowerCase()==='true',score:Number(r[3]||0),aIndex:Number(r[4]||0),bCorrect:Number(r[5]||0),answered:Number(r[6]||0),timeUsed:Number(r[7]||0),essayWords:Number(r[8]||0),updatedAt:r[9]||''})).sort((a,b)=>a.setNo-b.setNo);
}
function pkskActivity_(code){
  const sh=pkskSheet_(ACTIVITY_SHEET,['createdAt','licenseCode','action','message','deviceId']);const v=sh.getDataRange().getValues();if(v.length<2)return [];
  return v.slice(1).filter(r=>String(r[1]||'').toUpperCase()===String(code||'').toUpperCase()).reverse().slice(0,30).map(r=>({createdAt:r[0] instanceof Date?r[0].toISOString():String(r[0]||''),action:String(r[2]||''),message:String(r[3]||''),deviceId:String(r[4]||'')}));
}
function pkskSaveProgress_(d){
  const v=pkskValidate_(d.code);if(!v.ok)return v;const device=pkskRegisterDevice_(d.code,d.deviceId,d.userAgent||'');if(!device.ok)return device;
  const setNo=Math.max(1,Math.min(50,Number(d.setNo||0)));if(!setNo)return {ok:false,error:'Set tidak sah.'};
  const sh=pkskSheet_(PROGRESS_SHEET,['licenseCode','setNo','completed','score','aIndex','bCorrect','answered','timeUsed','essayWords','updatedAt']);const rows=sh.getDataRange().getValues();let row=-1;
  for(let i=1;i<rows.length;i++)if(String(rows[i][0]).toUpperCase()===v.licenseCode&&Number(rows[i][1])===setNo){row=i+1;break}
  const vals=[v.licenseCode,setNo,d.completed===true||String(d.completed).toLowerCase()==='true'?'TRUE':'FALSE',Number(d.score||0),Number(d.aIndex||0),Number(d.bCorrect||0),Number(d.answered||0),Number(d.timeUsed||0),Number(d.essayWords||0),new Date()];
  if(row>1)sh.getRange(row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);
  pkskLog_(v.licenseCode,d.completed?'set_completed':'set_progress',d.completed?`Set ${String(setNo).padStart(2,'0')} selesai (${Number(d.score||0)}%).`:`Set ${String(setNo).padStart(2,'0')} sedang dijawab (${Number(d.answered||0)} soalan).`,d.deviceId);
  return {ok:true,saved:true,setNo};
}
function pkskCustomerDashboard_(code,deviceId){
  const v=pkskValidate_(code);if(!v.ok)return v;if(deviceId){const reg=pkskRegisterDevice_(code,deviceId,'');if(!reg.ok)return reg}
  const lic=pkskLicense_(code);return {ok:true,license:{licenseCode:lic.code,orderNo:lic.orderNo,name:lic.name,phone:lic.phone,status:lic.status,maxDevices:MAX_DEVICES,deviceCount:pkskDevices_(lic.code).length,createdAt:lic.createdAt,activatedAt:lic.activatedAt},devices:pkskDevices_(lic.code),progress:pkskProgress_(lic.code),activity:pkskActivity_(lic.code)};
}
function createOrder(d){const sh=pkskSheet_(ORDERS_SHEET,['orderNo','name','phone','ref','amount','status','licenseCode','createdAt','verifiedAt','adminNote']);const orderNo=String(d.orderNo||'').trim().toUpperCase(),name=String(d.name||'').trim(),phone=String(d.phone||'').trim(),ref=String(d.ref||'').trim();if(!orderNo||!name||!phone)return {ok:false,error:'Maklumat tidak lengkap'};if(pkskFindRow_(sh,1,orderNo)>0)return {ok:true,orderNo,duplicate:true};sh.appendRow([orderNo,name,phone,ref,PKSK_AMOUNT,'PENDING','','',new Date(),'']);return {ok:true,orderNo,status:'PENDING'}}
function verifyOrder(d){const sh=pkskSheet_(ORDERS_SHEET,['orderNo','name','phone','ref','amount','status','licenseCode','createdAt','verifiedAt','adminNote']);const lic=pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']);const v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++)if(String(v[i][0])===String(d.orderNo)){let code=String(v[i][6]||''),now=new Date();if(!code){code=pkskMakeCode_();lic.appendRow([code,d.orderNo,String(v[i][1]||''),String(v[i][2]||''),'ACTIVE',v[i][7]||now,now])}sh.getRange(i+1,6,1,4).setValues([['PAID',code,'ACTIVE',now]]);pkskLog_(code,'license_activated','Bayaran disahkan dan lesen diaktifkan.','');return {ok:true,accessCode:code,status:'PAID'}}return {ok:false,error:'Order tidak dijumpai'}}
function rejectOrder(d){const sh=pkskSheet_(ORDERS_SHEET,['orderNo','name','phone','ref','amount','status','licenseCode','createdAt','verifiedAt','adminNote']);const row=pkskFindRow_(sh,1,d.orderNo);if(row<2)return {ok:false,error:'Order tidak dijumpai'};sh.getRange(row,6).setValue('REJECTED');const code=String(sh.getRange(row,7).getValue()||'');if(code){const lr=pkskLicenseRow_(code);if(lr>1)pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']).getRange(lr,5).setValue('BLOCKED');pkskLog_(code,'license_blocked','Order ditolak.','')}return {ok:true}}
function listOrders(){const sh=pkskSheet_(ORDERS_SHEET,['orderNo','name','phone','ref','amount','status','licenseCode','createdAt','verifiedAt','adminNote']);const v=sh.getDataRange().getValues();return {ok:true,orders:v.length<2?[]:v.slice(1).reverse().map(r=>{const code=String(r[6]||'');return {orderNo:String(r[0]||''),name:String(r[1]||''),phone:String(r[2]||''),ref:String(r[3]||''),amount:Number(r[4]||29),status:String(r[5]||''),accessCode:code,licenseStatus:code&&pkskLicense_(code)?pkskLicense_(code).status:'',deviceCount:code?pkskDevices_(code).length:0,progressCount:code?pkskProgress_(code).filter(x=>x.completed).length:0,createdAt:r[7] instanceof Date?r[7].toISOString():String(r[7]||''),verifiedAt:r[8] instanceof Date?r[8].toISOString():String(r[8]||'')}})}}
function adminLicenses_(){const sh=pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']);const v=sh.getDataRange().getValues();return v.length<2?[]:v.slice(1).reverse().map(r=>{const code=String(r[0]||'');const p=pkskProgress_(code),d=pkskDevices_(code);const scores=p.filter(x=>x.completed).map(x=>x.score);return {licenseCode:code,orderNo:String(r[1]||''),name:String(r[2]||''),phone:String(r[3]||''),status:String(r[4]||''),createdAt:r[5]||'',activatedAt:r[6]||'',deviceCount:d.length,maxDevices:MAX_DEVICES,devices:d,setsCompleted:p.filter(x=>x.completed).length,average:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,best:scores.length?Math.max.apply(null,scores):0,lastSeen:d.reduce((m,x)=>String(x.lastSeen)>String(m)?x.lastSeen:m,'')};})}
function adminDashboard_(){const orders=listOrders().orders||[],licenses=adminLicenses_();return {ok:true,summary:{orders:orders.length,pending:orders.filter(x=>x.status==='PENDING').length,paid:orders.filter(x=>x.status==='PAID').length,active:licenses.filter(x=>x.status==='ACTIVE').length,devices:licenses.reduce((n,x)=>n+x.deviceCount,0),completedSets:licenses.reduce((n,x)=>n+x.setsCompleted,0)},orders,licenses}}
function adminLicenseDetail_(code){const lic=pkskLicense_(code);if(!lic)return {ok:false,error:'License tidak dijumpai.'};return {ok:true,license:{licenseCode:lic.code,orderNo:lic.orderNo,name:lic.name,phone:lic.phone,status:lic.status,createdAt:lic.createdAt,activatedAt:lic.activatedAt,maxDevices:MAX_DEVICES,deviceCount:pkskDevices_(lic.code).length},devices:pkskDevices_(lic.code),progress:pkskProgress_(lic.code),activity:pkskActivity_(lic.code)}}
function resetDevices_(code){const lic=pkskLicense_(code);if(!lic)return {ok:false,error:'License tidak dijumpai.'};const sh=pkskSheet_(DEVICES_SHEET,['licenseCode','deviceId','label','userAgent','firstSeen','lastSeen','active']);const v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++)if(String(v[i][0]).toUpperCase()===lic.code)sh.getRange(i+1,7).setValue('FALSE');pkskLog_(lic.code,'devices_reset','Admin reset semua peranti.','');return {ok:true}}
function setLicenseStatus_(code,status){const lic=pkskLicense_(code);if(!lic)return {ok:false,error:'License tidak dijumpai.'};const sh=pkskSheet_(LICENSES_SHEET,['licenseCode','orderNo','name','phone','status','createdAt','activatedAt']);sh.getRange(lic.row,5).setValue(String(status).toUpperCase());pkskLog_(lic.code,'license_status','Status lesen ditukar kepada '+String(status).toUpperCase()+'.','');return {ok:true,status:String(status).toUpperCase()}}
function doGet(e){try{setupPKSK();const p=e.parameter||{},a=String(p.action||'');let r;if(a==='createPKSKOrder')r=createOrder(p);else if(a==='validateAccess')r=pkskValidate_(p.code);else if(a==='registerDevice')r=pkskRegisterDevice_(p.code,p.deviceId,p.userAgent);else if(a==='getCustomerDashboard')r=pkskCustomerDashboard_(p.code,p.deviceId);else if(a==='saveProgress')r=pkskSaveProgress_(p);else if(a==='listPKSKOrders'||a==='listOrders')r=String(p.token||'')===ADMIN_TOKEN?listOrders():{ok:false,error:'Unauthorized'};else if(a==='getPKSKAdminDashboard')r=String(p.token||'')===ADMIN_TOKEN?adminDashboard_():{ok:false,error:'Unauthorized'};else if(a==='getPKSKLicense')r=String(p.token||'')===ADMIN_TOKEN?adminLicenseDetail_(p.code):{ok:false,error:'Unauthorized'};else if(a==='resetDevices')r=String(p.token||'')===ADMIN_TOKEN?resetDevices_(p.code):{ok:false,error:'Unauthorized'};else if(a==='setLicenseStatus')r=String(p.token||'')===ADMIN_TOKEN?setLicenseStatus_(p.code,p.status):{ok:false,error:'Unauthorized'};else if(a==='verifyPKSKOrder')r=String(p.token||'')===ADMIN_TOKEN?verifyOrder(p):{ok:false,error:'Unauthorized'};else if(a==='rejectPKSKOrder')r=String(p.token||'')===ADMIN_TOKEN?rejectOrder(p):{ok:false,error:'Unauthorized'};else r={ok:true,service:'REQOO PKSK Backend',version:'1.4',maxDevices:MAX_DEVICES};return pkskJsonp_(p.callback,r)}catch(err){return pkskJsonp_(e.parameter&&e.parameter.callback,{ok:false,error:String(err.message||err)})}}
function doPost(e){try{setupPKSK();const d=e.postData&&e.postData.contents?JSON.parse(e.postData.contents):e.parameter||{},a=String(d.action||'');let r;if(a==='createPKSKOrder')r=createOrder(d);else if(a==='validateAccess')r=pkskValidate_(d.code);else if(a==='registerDevice')r=pkskRegisterDevice_(d.code,d.deviceId,d.userAgent);else if(a==='getCustomerDashboard')r=pkskCustomerDashboard_(d.code,d.deviceId);else if(a==='saveProgress')r=pkskSaveProgress_(d);else if(String(d.token||'')!==ADMIN_TOKEN)r={ok:false,error:'Unauthorized'};else if(a==='listPKSKOrders'||a==='listOrders')r=listOrders();else if(a==='getPKSKAdminDashboard')r=adminDashboard_();else if(a==='getPKSKLicense')r=adminLicenseDetail_(d.code);else if(a==='resetDevices')r=resetDevices_(d.code);else if(a==='setLicenseStatus')r=setLicenseStatus_(d.code,d.status);else if(a==='verifyPKSKOrder')r=verifyOrder(d);else if(a==='rejectPKSKOrder')r=rejectOrder(d);else r={ok:false,error:'Action tidak dikenali'};return pkskJsonp_(d.callback,r)}catch(err){return pkskJsonp_(e.parameter&&e.parameter.callback,{ok:false,error:String(err.message||err)})}}
