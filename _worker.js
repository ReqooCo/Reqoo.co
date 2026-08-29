export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Keep the normal Reqoo site and other custom domains unchanged.
    if (host !== 'pksk.sim.reqoo.co') {
      return env.ASSETS.fetch(request);
    }

    // The Pages custom-domain runtime can expose the root project assets but
    // may not resolve the nested simulator directory through ASSETS directly.
    // Proxy the simulator files through the main Reqoo Pages domain instead.
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const cleanPath = pathname.replace(/^\/+/, '');

    // Never allow traversal.
    if (cleanPath.includes('..')) {
      return new Response('Not Found', { status: 404 });
    }

    const target = new URL(`/sim/simulator/pksk/${cleanPath}`, 'https://reqoo.co');
    target.search = url.search;

    return fetch(new Request(target.toString(), request));
  }
};
