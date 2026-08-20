const KEY = 'reqoo_cart_v1';

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('reqoo-cart-updated', { detail: items }));
  return items;
}

export const cart = Object.freeze({
  get: () => read(),
  count: () => read().reduce((sum, item) => sum + item.quantity, 0),
  subtotal: () => read().reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0),
  add(product, quantity = 1) {
    const items = read();
    const qty = Math.max(1, Number(quantity) || 1);
    const id = String(product.id);
    const existing = items.find(item => item.id === id);
    if (existing) existing.quantity += qty;
    else items.push({
      id,
      name: String(product.name || ''),
      slug: String(product.slug || ''),
      price: Number(product.price || 0),
      image: String((product.images || [])[0] || ''),
      quantity: qty
    });
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
  remove(id) {
    return write(read().filter(item => item.id !== String(id)));
  },
  clear() {
    return write([]);
  }
});

export function money(value) {
  return `RM${Number(value || 0).toFixed(2)}`;
}

export function cartBadge() {
  return cart.count();
}
