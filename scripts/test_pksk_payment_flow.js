#!/usr/bin/env node
'use strict';
const fs=require('fs');
const assert=require('assert');
const page=fs.readFileSync('sim/pksk/payment-v2/index.html','utf8');
const api=fs.readFileSync('functions/api/pksk-payment-v2.js','utf8');
const access=fs.readFileSync('sim/pksk/access/app.js','utf8');
const simulator=fs.readFileSync('sim/pksk/simulator/js/app.js','utf8');

assert(page.includes("rememberOrder(currentOrder)"),'QR submit must persist the pending order');
assert(page.includes("pollStatus(currentOrder)"),'QR submit must immediately start status polling');
assert(page.includes("localStorage.setItem('reqoo_pksk_pending_order'"),'pending order must survive reload/navigation');
assert(page.includes('SEMAK SEKARANG'),'pending state must offer an explicit recheck action');
assert(page.includes("r.status==='paid'&&r.accessCode"),'paid order must transition to access-code state');
assert(page.includes("../access/?code="),'success state must hand off to access dashboard');
assert(api.includes("case'status':return json(await status(d,env))"),'payment API status action must exist');
assert(api.includes("issueLicense(o,env)"),'payment backend must issue a license after confirmed payment');
assert(access.includes("api('registerDevice'"),'dashboard login must register the device');
assert(access.includes("api('getCustomerDashboard'"),'dashboard must load server progress');
assert(simulator.includes("api('saveProgress'"),'simulator must sync progress to server');
assert(simulator.includes("requireAccess"),'simulator must enforce access before starting');
console.log('PASS: PKSK payment -> access -> simulator flow contract present');
