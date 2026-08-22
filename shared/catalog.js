export const CATALOG_API = 'https://api.reqoo.co';

const OPTIONS_PREFIX = '__REQOO_OPTIONS_V1__:';
const META_PREFIX = '__REQOO_PRODUCT_V2__:';
const isAdminPage = () => location.pathname === '/admin/' || location.pathname.startsWith('/admin/');
const adminRoot = () => '/admin/';

export const catalogAuth = Object.freeze({
  getKey: () => '',
  setKey: () => {},
  clear: async () => { try { await fetch(`${CATALOG_API}/admin/logout`, { method: 'POST', credentials: 'include' }); } catch {} }
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

function b64Encode(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
function b64Decode(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }

export function encodeProductOptions(options) {
  try { return OPTIONS_PREFIX + b64Encode(options || []); } catch { return ''; }
}
export function decodeProductOptions(internalNotes) {
  const raw = String(internalNotes || '');
  if (raw.startsWith(META_PREFIX)) {
    try { const data = b64Decode(raw.slice(META_PREFIX.length)); return Array.isArray(data?.options) ? data.options : []; } catch { return []; }
  }
  if (!raw.startsWith(OPTIONS_PREFIX)) return [];
  try { return b64Decode(raw.slice(OPTIONS_PREFIX.length)); } catch { return []; }
}
export function encodeProductMeta(meta = {}, options = []) {
  try { return META_PREFIX + b64Encode({ meta, options: Array.isArray(options) ? options : [] }); } catch { return ''; }
}
export function decodeProductMeta(internalNotes) {
  const raw = String(internalNotes || '');
  if (!raw.startsWith(META_PREFIX)) return { meta: {}, options: decodeProductOptions(raw) };
  try {
    const data = b64Decode(raw.slice(META_PREFIX.length));
    return { meta: data?.meta && typeof data.meta === 'object' ? data.meta : {}, options: Array.isArray(data?.options) ? data.options : [] };
  } catch { return { meta: {}, options: [] }; }
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

// Product Builder UX hardening: recover from bfcache/stale DOM and make the save action reliably clickable.
function hardenProductBuilder() {
  if (location.pathname !== '/admin/shop/product-builder') return;
  const run = () => {
    const save = document.getElementById('save');
    const notice = document.getElementById('notice');
    const id = new URLSearchParams(location.search).get('id');
    if (!save) return;
    save.style.pointerEvents = 'auto';
    save.style.position = 'relative';
    save.style.zIndex = '100';
    save.style.touchAction = 'manipulation';
    if (!id && notice && /failed to fetch/i.test(notice.textContent || '')) {
      notice.textContent = 'Sedia. Isi maklumat produk dan variation, kemudian simpan.';
      notice.className = 'notice ok';
    }
    save.addEventListener('click', () => {
      const variations = document.querySelector('#variations');
      const cards = variations?.querySelectorAll('.card') || [];
      if (!cards.length && notice) {
        notice.textContent = 'Tambah sekurang-kurangnya satu Variation dan harga dahulu.';
        notice.className = 'notice err';
        variations?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, { capture: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('pageshow', () => setTimeout(run, 0));
}
hardenProductBuilder();
