export const CATALOG_API = 'https://api.reqoo.co';

const OPTIONS_PREFIX = '__REQOO_OPTIONS_V1__:';
const isAdminPage = () => location.pathname === '/admin/' || location.pathname.startsWith('/admin/');
const adminRoot = () => '/admin/';

export const catalogAuth = Object.freeze({
  getKey: () => '',
  setKey: () => {},
  clear: async () => {
    try { await fetch(`${CATALOG_API}/admin/logout`, { method: 'POST', credentials: 'include' }); } catch {}
  }
});

function centralizeAdminUI() {
  if (!isAdminPage() || location.pathname === adminRoot()) return;
  const hideLegacyCredentialFields = () => {
    document.querySelectorAll('input[placeholder="Admin Key"], input[placeholder="Worker secret"]').forEach(input => {
      const box = input.closest('.filters, form, .panel, .rq-card, .notice') || input.parentElement;
      if (box) box.style.display = 'none';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideLegacyCredentialFields, { once: true });
  else hideLegacyCredentialFields();
}
centralizeAdminUI();

export function encodeProductOptions(options) {
  try { return OPTIONS_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(options || [])))); }
  catch { return ''; }
}
export function decodeProductOptions(internalNotes) {
  const raw = String(internalNotes || '');
  if (!raw.startsWith(OPTIONS_PREFIX)) return [];
  try { return JSON.parse(decodeURIComponent(escape(atob(raw.slice(OPTIONS_PREFIX.length))))); }
  catch { return []; }
}
export function normalizeProductOptions(options) { return Array.isArray(options) ? options : []; }

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'Invalid API response' }; }
  if (!res.ok) {
    const message = data?.error?.message || data?.error || `HTTP ${res.status}`;
    if (res.status === 401 && isAdminPage() && location.pathname !== adminRoot()) location.replace(`${adminRoot()}?error=session`);
    throw new Error(message);
  }
  return data;
}

async function publicRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  delete headers['X-Admin-Key'];
  return parseResponse(await fetch(`${CATALOG_API}${path}`, { ...options, headers, credentials: 'include' }));
}

async function adminRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  delete headers['X-Admin-Key'];
  return parseResponse(await fetch(`${CATALOG_API}${path}`, { ...options, headers, credentials: 'include' }));
}

function prepareProduct(product) {
  const p = { ...(product || {}) };
  if (p.product_type === 'custom') p.product_type = 'custom';
  if (p.fulfillment_type === 'pickup') p.fulfillment_type = 'pickup';
  if (p.fulfillment_type === 'service') p.fulfillment_type = 'service';
  if (p.fulfillment_type === 'digital') p.fulfillment_type = 'digital';
  if (!p.internal_notes && Array.isArray(p.options)) p.internal_notes = encodeProductOptions(p.options);
  delete p.options;
  return p;
}

export async function uploadMedia(file) {
  if (!(file instanceof File)) throw new Error('Pilih gambar dahulu');
  const form = new FormData();
  form.append('file', file, file.name);
  return parseResponse(await fetch(`${CATALOG_API}/media/upload`, { method: 'POST', credentials: 'include', body: form }));
}

export const catalog = Object.freeze({
  list: (publishedOnly = false) => publishedOnly ? publicRequest('/products?published=true') : adminRequest('/products'),
  get: id => publicRequest(`/products/${encodeURIComponent(id)}`),
  create: product => adminRequest('/products', { method: 'POST', body: JSON.stringify(prepareProduct(product)) }),
  update: (id, product) => adminRequest(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(prepareProduct(product)) }),
  remove: id => adminRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
});

export function normalizeProduct(input) {
  const options = Array.isArray(input.options) ? input.options : [];
  return prepareProduct({
    name: String(input.name || '').trim(),
    slug: String(input.slug || input.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: String(input.description || '').trim(),
    price: Number(input.price || 0),
    product_type: String(input.product_type || 'physical'),
    fulfillment_type: String(input.fulfillment_type || 'physical_shipping'),
    images: Array.isArray(input.images) ? input.images.map(String).map(s => s.trim()).filter(Boolean) : [],
    published: Boolean(input.published),
    sort: Number(input.sort || 0),
    short_description: String(input.short_description || '').trim(),
    internal_notes: encodeProductOptions(options),
    production_instructions: String(input.production_instructions || '').trim(),
    seo_title: String(input.seo_title || '').trim(),
    seo_description: String(input.seo_description || '').trim()
  });
}
