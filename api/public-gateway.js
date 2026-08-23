import core from './worker.js';
import { pkskAdmin } from './pksk-admin.js';
import { quotations } from './quotations.js';
import { manualPayment } from './manual-payment.js';
import { orderAdmin } from './order-admin.js';
import { createOrder } from './order-create.js';
import { catalog } from './catalog.js';
import { webhook as whatsappWebhook } from './whatsapp.js';
import { adminLogin, adminLogout, hasAdminSession } from './admin-session.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_ORIGINS = new Set(['https://admin.reqoo.co','https://shop.reqoo.co','https://reqoo.co','https://www.reqoo.co']);
function originAllowed(origin) { return !origin || ALLOWED_ORIGINS.has(origin); }
function securityHeaders(headers, origin = '') {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (ALLOWED_ORIGINS.has(origin)) { headers.set('Access-Control-Allow-Origin', origin); headers.set('Access-Control-Allow-Credentials', 'true'); }
  else if (origin) headers.set('Access-Control-Allow-Origin', 'null');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, Idempotency-Key');
  headers.set('Vary', 'Origin');
}
function response(data, status, origin) { const headers = new Headers(JSON_HEADERS); securityHeaders(headers, origin); headers.set('Cache-Control','no-store'); return new Response(JSON.stringify(data),{status,headers}); }
function secureResponse(result, origin) { const headers = new Headers(result.headers); securityHeaders(headers, origin); headers.set('Cache-Control','no-store'); return new Response(result.body,{status:result.status,statusText:result.statusText,headers}); }
function withAdminKey(request, env) { const headers = new Headers(request.headers); headers.set('X-Admin-Key',env.ADMIN_KEY||''); return new Request(request,{headers}); }
function isAdminCoreRoute(url, request) {
  if (url.pathname === '/products') return !(request.method === 'GET' && url.searchParams.get('published') === 'true');
  if (url.pathname === '/custom-requests') return request.method !== 'POST';
  if (url.pathname === '/orders') return request.method !== 'POST';
  if (url.pathname.startsWith('/media/')) { let mediaPath=url.pathname; try{mediaPath=decodeURIComponent(mediaPath)}catch{} return !mediaPath.startsWith('/media/products/'); }
  return false;
}
function isProductDetail(url) { return /^\/products\/[^/]+$/.test(url.pathname); }

export default { async fetch(request, env, ctx) {
  const url = new URL(request.url); const origin = request.headers.get('Origin') || '';
  if (!originAllowed(origin)) return response({error:'Origin not allowed'},403,origin);
  if (request.method === 'OPTIONS') return response({},204,origin);
  if (url.pathname === '/admin/login') return secureResponse(await adminLogin(request,env),origin);
  if (url.pathname === '/admin/logout') return secureResponse(await adminLogout(),origin);
  if (url.pathname === '/admin/session') return response({ok:await hasAdminSession(request,env)},200,origin);
  if (url.hostname === 'admin.reqoo.co' && (url.pathname === '/' || url.pathname === '')) return Response.redirect('https://reqoo.co/admin/',302);

  const sessionValid = await hasAdminSession(request,env);
  const adminCoreRoute = isAdminCoreRoute(url,request);
  const adminRequest = sessionValid ? withAdminKey(request,env) : request;

  if (url.pathname === '/orders' && request.method === 'POST') return secureResponse(await createOrder(request,env),origin);
  if (url.pathname.startsWith('/admin-orders/')) {
    if (!sessionValid) return response({ok:false,error:{code:'ADMIN_AUTH_REQUIRED',message:'Admin session diperlukan.'}},401,origin);
    return secureResponse(await orderAdmin(adminRequest,env),origin);
  }
  if (url.pathname.startsWith('/payments/qr/')) return secureResponse(await manualPayment(sessionValid ? adminRequest : request,env),origin);
  if (url.pathname === '/whatsapp/webhook') return secureResponse(await whatsappWebhook(request,env,ctx),origin);
  if (url.pathname.startsWith('/pksk-admin/')) {
    if (!sessionValid) return response({ok:false,error:{code:'ADMIN_AUTH_REQUIRED',message:'Admin session diperlukan.'}},401,origin);
    return secureResponse(await pkskAdmin(adminRequest,env),origin);
  }
  if (url.pathname.startsWith('/quotations')) {
    if (!sessionValid && !url.pathname.startsWith('/quotations/shared')) return response({ok:false,error:{code:'ADMIN_AUTH_REQUIRED',message:'Admin session diperlukan.'}},401,origin);
    return secureResponse(await quotations(sessionValid ? adminRequest : request,env),origin);
  }
  if (url.pathname === '/products' && request.method === 'GET' && env.DB) {
    if (url.searchParams.get('published') !== 'true' && !sessionValid) return response({ok:false,error:{code:'ADMIN_AUTH_REQUIRED',message:'Admin session diperlukan.'}},401,origin);
    return secureResponse(await catalog(adminRequest,env),origin);
  }
  if (isProductDetail(url) && request.method === 'GET' && !sessionValid) {
    const result = await core.fetch(request,env,ctx);
    if (!result.ok) return secureResponse(result,origin);
    try { const data=await result.clone().json(); if (!data?.published || data?.status !== 'active') return response({error:'Product not found'},404,origin); }
    catch { return response({error:'Product not found'},404,origin); }
    return secureResponse(result,origin);
  }
  if (adminCoreRoute && !sessionValid) return response({ok:false,error:{code:'ADMIN_AUTH_REQUIRED',message:'Admin session diperlukan.'}},401,origin);
  if (url.pathname.startsWith('/media/') && sessionValid) return secureResponse(await core.fetch(adminRequest,env,ctx),origin);
  return secureResponse(await core.fetch(request,env,ctx),origin);
} };
