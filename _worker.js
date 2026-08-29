export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Keep the normal Reqoo site and other custom domains unchanged.
    if (host !== 'pksk.sim.reqoo.co') {
      return env.ASSETS.fetch(request);
    }

    // Serve the PKSK simulator from its existing repository folder at the
    // subdomain root, so users do not need to know the internal path.
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const cleanPath = pathname.replace(/^\/+/, '');

    // Only allow normal relative asset/page paths; never allow traversal.
    if (cleanPath.includes('..')) {
      return new Response('Not Found', { status: 404 });
    }

    const assetUrl = new URL(request.url);
    assetUrl.pathname = `/sim/simulator/pksk/${cleanPath}`;

    return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  }
};
