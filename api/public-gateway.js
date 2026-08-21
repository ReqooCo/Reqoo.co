import core from './worker.js';
import { webhook as whatsappWebhook } from './whatsapp.js';
import { pkskAdmin } from './pksk-admin.js';
import { quotations } from './quotations.js';
import { manualPayment } from './manual-payment.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_ORIGINS = new Set([
  'https://admin.reqoo.co',
  'https://shop.reqoo.co',
  'https://reqoo.co',
  'https://www.reqoo.co'
]);

function response(data, status, origin) {
  const headers = new Headers(JSON_HEADERS);
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.has(origin) ? origin : 'null');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  headers.set('Vary', 'Origin');
  return new Response(JSON.stringify(data), { status, headers });
}

async function publicProduct(env, id, origin) {
  const product = await env.DB.prepare(
    "SELECT id,sku,name,slug,product_type,fulfillment_type,description,short_description,base_price_minor,sale_price_minor,currency,status,seo_title,seo_description,created_at,updated_at FROM products WHERE id=? AND status='active'"
  ).bind(id).first();
  if (!product) return response({ error: 'Product not found' }, 404, origin);
  const { results } = await env.DB.prepare('SELECT id,url,alt_text,sort_order,is_cover FROM product_images WHERE product_id=? ORDER BY sort_order ASC').bind(id).all();
  return response({ ...product, price: Number(product.sale_price_minor ?? product.base_price_minor ?? 0) / 100, published: true, images: (results || []).map(x => x.url) }, 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (url.hostname === 'admin.reqoo.co' && (url.pathname === '/' || url.pathname === '')) return Response.redirect('https://reqoo.co/admin/', 302);
    if (url.pathname.startsWith('/payments/qr/')) return manualPayment(request, env);
    if (url.pathname === '/whatsapp/webhook') return whatsappWebhook(request, env, ctx);
    if (url.pathname.startsWith('/pksk-admin/')) return pkskAdmin(request, env);
    if (url.pathname.startsWith('/quotations')) return quotations(request, env);
    const match = url.pathname.match(/^\/products\/([^/]+)$/);
    if (request.method === 'GET' && match && env.DB) return publicProduct(env, decodeURIComponent(match[1]), origin);
    return core.fetch(request, env, ctx);
  }
};
