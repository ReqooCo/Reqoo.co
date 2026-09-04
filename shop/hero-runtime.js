(() => {
  const DEFAULT_HERO = '/shop/assets/plaque-signature.jpg';
  async function loadHero() {
    const el = document.querySelector('.heroProduct');
    if (!el) return;
    try {
      const r = await fetch('/api/shop-hero?_=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      const url = String(j?.url || DEFAULT_HERO).trim();
      if (url) {
        el.src = url;
        el.onerror = () => { el.onerror = null; el.src = DEFAULT_HERO; };
      }
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadHero, { once: true });
  else loadHero();
})();
