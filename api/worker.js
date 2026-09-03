import core from './core-worker.js';
import { handle as handlePksk } from './pksk.js';
import { handle as handleCore } from './core.js';
import { handle as handleShop } from './shop.js';
import { handle as handleAdmin } from './admin-compat.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/pksk') return handlePksk(request, env);
    if (url.pathname === '/api/core') return handleCore(request, env);
    if (url.pathname === '/api/shop' || url.pathname === '/api/billplz') return handleShop(request, env);
    if (url.pathname === '/api/sim-admin' || url.pathname === '/api/shop-admin') return handleAdmin(request, env);
    return core.fetch(request, env, ctx);
  }
};
