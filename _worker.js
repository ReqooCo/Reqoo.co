export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Dedicated simulator subdomain: expose only /sim/pksk as the site root.
    if (host === 'pksk.sim.reqoo.co') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const cleanPath = pathname.replace(/^\/+/, '');

      // Block traversal attempts before mapping into the simulator folder.
      if (cleanPath.includes('..')) {
        return new Response('Not Found', { status: 404 });
      }

      const target = new URL(`/sim/pksk/${cleanPath}`, url.origin);
      target.search = url.search;

      const response = await env.ASSETS.fetch(new Request(target.toString(), request));

      // If the simulator asset does not exist, do not fall back to the main
      // Reqoo landing page. This makes a broken simulator route explicit.
      if (response.status === 404) {
        return new Response('PKSK Simulator asset not found', { status: 404 });
      }

      return response;
    }

    return env.ASSETS.fetch(request);
  }
};
