import core from './worker.js';
import { webhook as whatsappWebhook } from './whatsapp.js';
import { pkskAdmin } from './pksk-admin.js';
import { quotations } from './quotations.js';
import { manualPayment } from './manual-payment.js';
import { orderAdmin } from './order-admin.js';
import { catalog } from './catalog.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_ORIGINS = new Set([
  'https://admin.reqoo.co',
  'https://shop.reqoo.co',
  'https://reqoo.co',
  'https://www.reqoo.co'
]);

function originAllowed(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function securityHeaders(headers, origin = '') {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'null');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  headers.set('Vary', 'Origin');
}

function response(data, status, origin) {
  const headers = new Headers(JSON_HEADERS);
  securityHeaders(headers, origin);
  return new Response(JSON.stringify(data), { status, headers });
}

function secureResponse(result, origin) {
  const headers = new Headers(result.headers);
  securityHeaders(headers, origin);
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
}

async function ensureOrderExtraSchema(env) {
  try { await env.DB.prepare('ALTER TABLE orders ADD COLUMN shipping_address TEXT').run(); } catch {}
  try { await env.DB.prepare('ALTER TABLE orders ADD COLUMN order_note TEXT').run(); } catch {}
}

async function publicProduct(env, id, origin) {
  const product = await env.DB.prepare(
    "SELECT id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,seo_title,seo_description,created_at,updated_at FROM products WHERE id=? AND status='active'"
  ).bind(id).first();
  if (!product) return response({ error: 'Product not found' }, 404, origin);
  const { results } = await env.DB.prepare('SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY sort_order ASC').bind(id).all();
  const out = response({ ...product, price: Number(product.sale_price_minor ?? product.base_price_minor ?? 0) / 100, published: true, images: (results || []).map(x => x.url) }, 200, origin);
  out.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return out;
}

async function createOrderAndPersistCheckoutFields(request, env, ctx) {
  await ensureOrderExtraSchema(env);
  const payload = await request.json();
  const checkoutAddress = String(payload?.address || '').trim();
  const checkoutNote = String(payload?.note || '').trim();
  const upstream = new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(payload) });
  const result = await core.fetch(upstream, env, ctx);
  if (!result.ok || (!checkoutAddress && !checkoutNote)) return result;
  try {
    const data = await result.clone().json();
    const orderId = data?.order?.id || data?.id || null;
    if (orderId) await env.DB.prepare('UPDATE orders SET shipping_address=?, order_note=?, updated_at=? WHERE id=?').bind(checkoutAddress || null, checkoutNote || null, new Date().toISOString(), orderId).run();
  } catch {}
  return result;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (!originAllowed(origin)) return response({ error: 'Origin not allowed' }, 403, origin);
    if (url.hostname === 'admin.reqoo.co' && (url.pathname === '/' || url.pathname === '')) return Response.redirect('https://reqoo.co/admin/', 302);
    if (url.pathname.startsWith('/admin-orders/')) return secureResponse(await orderAdmin(request, env), origin);
    if (url.pathname.startsWith('/payments/qr/')) return secureResponse(await manualPayment(request, env), origin);
    if (url.pathname === '/whatsapp/webhook') return secureResponse(await whatsappWebhook(request, env, ctx), origin);
    if (url.pathname.startsWith('/pksk-admin/')) return secureResponse(await pkskAdmin(request, env), origin);
    if (url.pathname.startsWith('/quotations')) return secureResponse(await quotations(request, env), origin);
    if (url.pathname === '/products' && (request.method === 'GET' || request.method === 'OPTIONS') && env.DB) return catalog(request, env);
    const match = url.pathname.match(/^\/products\/([^/]+)$/);
    if (request.method === 'GET' && match && env.DB) return publicProduct(env, decodeURIComponent(match[1]), origin);
    if (request.method === 'POST' && url.pathname === '/orders' && env.DB) return secureResponse(await createOrderAndPersistCheckoutFields(request, env, ctx), origin);
    return secureResponse(await core.fetch(request, env, ctx), origin);
  }
};
