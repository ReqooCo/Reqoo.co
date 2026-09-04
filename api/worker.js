import { onRequest as handleCore } from '../functions/api/core.js';
import { onRequest as handleSimAdmin } from '../functions/api/sim-admin.js';
import { onRequest as handleShopAdmin } from './shop-admin.js';
import { onRequest as handleProductImage } from '../functions/api/product-image.js';
import { handle as handleShop } from './shop.js';
import { handle as handlePksk } from './pksk.js';
import { handle as handleHero } from './hero.js';

function withAdminEnv(env) {
  return {
    ...env,
    REQOO_ADMIN_TOKEN: env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '',
    SHOP_ADMIN_TOKEN: env.SHOP_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '',
    PKSK_ADMIN_TOKEN: env.PKSK_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || ''
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const bridgedEnv = withAdminEnv(env);

    if (path === '/api/shop' || path === '/api/billplz') return handleShop(request, bridgedEnv);
    if (path === '/api/pksk') return handlePksk(request, bridgedEnv);
    if (path === '/api/shop-hero') return handleHero(request, bridgedEnv);
    if (path === '/api/core') return handleCore({ request, env: bridgedEnv });
    if (path === '/api/sim-admin') return handleSimAdmin({ request, env: bridgedEnv });
    if (path === '/api/shop-admin') return handleShopAdmin({ request, env: bridgedEnv });
    if (path === '/api/product-image') return handleProductImage({ request, env: bridgedEnv, ctx });

    if (path === '/api/health') {
      return new Response(JSON.stringify({ ok: !!env.DB, service: 'reqoo-api', db: !!env.DB, media: !!env.MEDIA }), {
        status: env.DB ? 200 : 503,
        headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
    });
  }
};
