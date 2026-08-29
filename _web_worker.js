export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (host === 'pksk.sim.reqoo.co') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      const target = new URL(`/sim/pksk/${cleanPath}`, url.origin);
      target.search = url.search;
      const response = await env.ASSETS.fetch(new Request(target.toString(), request));
      if (response.status === 404) return new Response('PKSK Simulator asset not found', { status: 404 });
      return response;
    }

    if (host === 'shop.reqoo.co') {
      const pathname = url.pathname === '/' ? '/shop/index.html' : `/shop${url.pathname}`;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      return env.ASSETS.fetch(new Request(new URL(`/${cleanPath}`, url.origin), request));
    }

    return env.ASSETS.fetch(request);
  }
};
