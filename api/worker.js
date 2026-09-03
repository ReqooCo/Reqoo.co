import core from './core-worker.js';
import { handle as handlePksk } from './pksk.js';
import { handle as handleCore } from './core.js';
import { handle as handleShop } from './shop.js';
import { handle as handleAdmin } from './admin-compat.js';
import { onRequest as handleProductImage } from '../functions/api/product-image.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/pksk') return handlePksk(request, env);
    if (url.pathname === '/api/core') return handleCore(request, env);
    if (url.pathname === '/api/shop' || url.pathname === '/api/billplz') return handleShop(request, env);
    if (url.pathname === '/api/sim-admin' || url.pathname === '/api/shop-admin') return handleAdmin(request, env);
    if (url.pathname === '/api/product-image') {
      const bridgedEnv = { ...env, REQOO_ADMIN_TOKEN: env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '' };
      return handleProductImage({ request, env: bridgedEnv, ctx });
    }
    return core.fetch(request, env, ctx);
  }
};
