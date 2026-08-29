export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (host !== 'pksk.sim.reqoo.co') {
      return env.ASSETS.fetch(request);
    }

    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const cleanPath = pathname.replace(/^\/+/, '');

    if (cleanPath.includes('..')) {
      return new Response('Not Found', { status: 404 });
    }

    // PKSK simulator lives under /sim/pksk in the repository.
    const target = new URL(`/sim/pksk/${cleanPath}`, url.origin);
    target.search = url.search;

    return env.ASSETS.fetch(new Request(target.toString(), request));
  }
};
