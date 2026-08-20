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

export async function uploadMedia(file) {
  if (!(file instanceof File)) throw new Error('Pilih gambar dahulu');
  const form = new FormData();
  form.append('file', file, file.name);
  const key = adminKey();
  const res = await fetch(`${CATALOG_API}/media/upload`, { method: 'POST', headers: key ? { 'X-Admin-Key': key } : {}, body: form });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'Invalid upload response' }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const catalog = Object.freeze({
  list: (publishedOnly = false) => request(`/products${publishedOnly ? '?published=true' : ''}`),
  create: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
  update: (id, product) => request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(product) }),
  remove: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
});

export function normalizeProduct(input) {
  return {
    name: String(input.name || '').trim(),
    slug: String(input.slug || input.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: String(input.description || '').trim(),
    price: Number(input.price || 0),
    images: Array.isArray(input.images) ? input.images.map(String).map(s => s.trim()).filter(Boolean) : [],
    published: Boolean(input.published),
    sort: Number(input.sort || 0)
  };
}
