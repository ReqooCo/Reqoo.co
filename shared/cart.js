import { decodeProductOptions } from './catalog.js';

const KEY = 'reqoo_cart_v2';

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('reqoo-cart-updated', { detail: items }));
  return items;
}
function selectionKey(item) {
  try {
    return JSON.stringify({ customization: item.customization || {}, variation: item.variation || {}, addons: item.addons || [] });
  } catch { return '{}'; }
}
function numberPrice(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function selectedValue(value) {
  return value && typeof value === 'object' ? String(value.value ?? value.label ?? '') : String(value ?? '');
}
function resolveDisplayPrice(product, selection) {
  const options = decodeProductOptions(product?.internal_notes);
  let unit = numberPrice(product?.price);
  const variations = selection?.variation || {};
  const addons = Array.isArray(selection?.addons) ? selection.addons : [];

  for (const opt of options.filter(x => x.group === 'variation')) {
    const raw = variations[opt.id] ?? variations[opt.label];
    const chosen = selectedValue(raw);
    if (!chosen) continue;
    const value = (opt.values || []).find(v => String(v.value ?? v.label) === chosen);
    if (value) unit = numberPrice(value.price);
  }

  for (const opt of options.filter(x => x.group === 'addon')) {
    const selected = addons.find(a => String(a?.option_id ?? a?.id ?? '') === String(opt.id) || String(a?.label ?? '') === String(opt.label));
    if (!selected) continue;
    let values = selected.values ?? selected.value ?? selected.label ?? true;
    if (!Array.isArray(values)) values = [values];
    for (const raw of values) {
      const label = raw && typeof raw === 'object' ? String(raw.label ?? raw.value ?? '') : String(raw);
      if (opt.field_type === 'select') {
        const value = (opt.values || []).find(v => String(v.label) === label || String(v.value ?? '') === label);
        unit += numberPrice(value?.price);
      } else {
        unit += numberPrice(opt.addonPrice);
      }
    }
  }
  return unit;
}

export const cart = Object.freeze({
  get: () => read(),
  count: () => read().reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  subtotal: () => read().reduce((sum, item) => sum + (numberPrice(item.price) * Math.max(0, Number(item.quantity) || 0)), 0),
  add(product, quantity = 1) {
    const items = read();
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const id = String(product.id);
    const incoming = {
      customization: product.customization || {},
      variation: product.variation || {},
      addons: Array.isArray(product.addons) ? product.addons : []
    };
    const selectedPrice = resolveDisplayPrice(product, incoming);
    const existing = items.find(item => item.id === id && selectionKey(item) === selectionKey(incoming));
    if (existing) {
      existing.quantity += qty;
      existing.price = selectedPrice;
    } else {
      items.push({
        id,
        name: String(product.name || ''),
        slug: String(product.slug || ''),
        price: selectedPrice,
        base_price: numberPrice(product.price),
        image: String((product.images || [])[0] || ''),
        quantity: qty,
        ...incoming
      });
    }
    return write(items);
  },
  update(id, quantity) {
    const items = read();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return cart.remove(id);
    const item = items.find(entry => entry.id === String(id));
    if (item) item.quantity = Math.floor(qty);
    return write(items);
  },
  remove(id) { return write(read().filter(item => item.id !== String(id))); },
  clear() { return write([]); }
});

export function money(value) { return `RM${numberPrice(value).toFixed(2)}`; }
export function cartBadge() { return cart.count(); }
