import core from './worker.js';
import { pkskAdmin } from './pksk-admin.js';
import { quotations } from './quotations.js';
import { manualPayment } from './manual-payment.js';
import { orderAdmin } from './order-admin.js';
import { catalog } from './catalog.js';
import { webhook as whatsappWebhook } from './whatsapp.js';
import { adminLogin, adminLogout, hasAdminSession } from './admin-session.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_ORIGINS = new Set(['https://admin.reqoo.co', 'https://shop.reqoo.co', 'https://reqoo.co', 'https://www.reqoo.co']);
function originAllowed(origin) { return !origin || ALLOWED_ORIGINS.has(origin); }
function securityHeaders(headers, origin = '') {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (ALLOWED_ORIGINS.has(origin)) { headers.set('Access-Control-Allow-Origin', origin); headers.set('Access-Control-Allow-Credentials', 'true'); }
  else if (origin) headers.set('Access-Control-Allow-Origin', 'null');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  headers.set('Vary', 'Origin');
}
function response(data, status, origin) { const headers = new Headers(JSON_HEADERS); securityHeaders(headers, origin); headers.set('Cache-Control', 'no-store'); return new Response(JSON.stringify(data), { status, headers }); }
function secureResponse(result, origin) { const headers = new Headers(result.headers); securityHeaders(headers, origin); headers.set('Cache-Control', 'no-store'); return new Response(result.body, { status: result.status, statusText: result.statusText, headers }); }
function withAdminKey(request, env) { const headers = new Headers(request.headers); headers.set('X-Admin-Key', env.ADMIN_KEY || ''); return new Request(request, { headers }); }
function isAdminCoreRoute(url, request) {
  if (url.pathname === '/products') return !(request.method === 'GET' && url.searchParams.get('published') === 'true');
  if (url.pathname === '/custom-requests') return request.method !== 'POST';
  if (url.pathname === '/orders') return request.method !== 'POST';
  if (url.pathname.startsWith('/media/')) return !url.pathname.startsWith('/media/products/');
  return false;
}
function imageExtension(name, type) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  const byType = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/svg+xml':'svg','image/bmp':'bmp','image/tiff':'tiff','image/heic':'heic','image/heif':'heif' };
  return byType[type] || (['jpg','jpeg','png','webp','gif','avif','svg','bmp','tif','tiff','heic','heif'].includes(ext) ? (ext === 'jpeg' ? 'jpg' : ext === 'tif' ? 'tiff' : ext) : 'bin');
}
async function uploadProductMedia(request, env, origin) {
  if (!env.MEDIA) return response({ ok:false, error:'R2 binding MEDIA is not configured' }, 500, origin);
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return response({ ok:false, error:'Image file is required' }, 400, origin);
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || 'image').slice(0,200);
  const ext = imageExtension(name, type);
  const looksImage = type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|svg|bmp|tiff?|heic|heif)$/i.test(name);
  if (!looksImage) return response({ ok:false, error:'Fail bukan gambar yang disokong.' }, 400, origin);
  if (file.size > 10 * 1024 * 1024) return response({ ok:false, error:'Gambar terlalu besar. Maksimum 10MB setiap gambar.' }, 400, origin);
  const key = `products/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata:{ contentType:type || 'application/octet-stream', cacheControl:'public, max-age=31536000, immutable' }, customMetadata:{ originalName:name } });
  return response({ ok:true, key, url:`https://api.reqoo.co/media/${encodeURIComponent(key)}`, size:file.size, type:type || 'application/octet-stream' }, 201, origin);
}
export default { async fetch(request, env, ctx) {
  const url = new URL(request.url); const origin = request.headers.get('Origin') || '';
  if (!originAllowed(origin)) return response({ error: 'Origin not allowed' }, 403, origin);
  if (request.method === 'OPTIONS') return response({}, 204, origin);
  if (url.pathname === '/admin/login') return secureResponse(await adminLogin(request, env), origin);
  if (url.pathname === '/admin/logout') return secureResponse(await adminLogout(), origin);
  if (url.hostname === 'admin.reqoo.co' && (url.pathname === '/' || url.pathname === '')) return Response.redirect('https://reqoo.co/admin/', 302);
  const sessionValid = await hasAdminSession(request, env);
  const adminCoreRoute = isAdminCoreRoute(url, request);
  const adminRequest = sessionValid ? withAdminKey(request, env) : request;
  if (url.pathname.startsWith('/admin-orders/')) { if (!sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin); return secureResponse(await orderAdmin(adminRequest, env), origin); }
  if (url.pathname.startsWith('/payments/qr/')) return secureResponse(await manualPayment(request, env), origin);
  if (url.pathname === '/whatsapp/webhook') return secureResponse(await whatsappWebhook(request, env, ctx), origin);
  if (url.pathname.startsWith('/pksk-admin/')) { if (!sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin); return secureResponse(await pkskAdmin(adminRequest, env), origin); }
  if (url.pathname.startsWith('/quotations')) { if (!sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin); return secureResponse(await quotations(adminRequest, env), origin); }
  if (url.pathname === '/products' && request.method === 'GET' && env.DB) { if (url.searchParams.get('published') !== 'true' && !sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin); return secureResponse(await catalog(adminRequest, env), origin); }
  if (url.pathname === '/media/upload' && request.method === 'POST') { if (!sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin); return uploadProductMedia(request, env, origin); }
  if (adminCoreRoute && !sessionValid) return response({ ok:false, error:{ code:'ADMIN_AUTH_REQUIRED', message:'Admin session diperlukan.' } }, 401, origin);
  if (url.pathname.startsWith('/media/') && sessionValid) return secureResponse(await core.fetch(adminRequest, env, ctx), origin);
  return secureResponse(await core.fetch(request, env, ctx), origin);
} };