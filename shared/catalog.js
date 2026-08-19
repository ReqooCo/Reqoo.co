export const CATALOG_API = 'https://api.reqoo.co';

const adminKey = () => sessionStorage.getItem('reqoo_admin_key') || '';
export const catalogAuth = Object.freeze({
  getKey: adminKey,
  setKey: (key) => sessionStorage.setItem('reqoo_admin_key', String(key || '')),
  clear: () => sessionStorage.removeItem('reqoo_admin_key')
});

async function request(path, options = {}) {
  const key = adminKey();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (key) headers['X-Admin-Key'] = key;
  const res = await fetch(`${CATALOG_API}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'Invalid API response' }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const catalog = Object.freeze({
  list: async (publishedOnly = false) => {
    const data = await request(`/products${publishedOnly ? '?published=true' : ''}`);
    return Array.isArray(data) ? data : (data?.products || []);
  },
  get: async (id) => (await request(`/products/${encodeURIComponent(id)}`)).product,
  create: async (product) => (await request('/products', { method: 'POST', body: JSON.stringify(product) })).product,
  update: async (id, product) => (await request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(product) })).product,
  remove: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
});

export function normalizeProduct(input) {
  const base = Number(input.base_price_minor ?? input.base_price ?? input.price ?? 0);
  const saleRaw = input.sale_price_minor ?? input.sale_price;
  const sale = saleRaw === '' || saleRaw == null ? null : Number(saleRaw);
  return {
    sku: String(input.sku || '').trim() || null,
    name: String(input.name || '').trim(),
    slug: String(input.slug || input.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    product_type: input.product_type || 'physical',
    fulfillment_type: input.fulfillment_type || 'physical_shipping',
    description: String(input.description || '').trim(),
    short_description: String(input.short_description || '').trim(),
    base_price_minor: Number.isFinite(base) ? Math.round(base) : 0,
    sale_price_minor: sale != null && Number.isFinite(sale) ? Math.round(sale) : null,
    currency: String(input.currency || 'MYR'),
    status: input.status || (input.published ? 'active' : 'draft'),
    internal_notes: input.internal_notes ?? null,
    production_instructions: input.production_instructions ?? null,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    images: Array.isArray(input.images) ? input.images.map(String).map(s => s.trim()).filter(Boolean) : [],
    variations: Array.isArray(input.variations) ? input.variations : [],
    addons: Array.isArray(input.addons) ? input.addons : [],
    custom_fields: Array.isArray(input.custom_fields) ? input.custom_fields : []
  };
}
