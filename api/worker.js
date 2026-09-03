import core from './core-worker.js';
import { handle as handlePksk } from './pksk.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/pksk') return handlePksk(request, env);
    return core.fetch(request, env, ctx);
  }
};
