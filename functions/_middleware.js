export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Only rewrite the dedicated PKSK simulator hostname.
  if (url.hostname.toLowerCase() !== 'pksk.sim.reqoo.co') {
    return context.next();
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const cleanPath = pathname.replace(/^\/+/, '');

  // Prevent path traversal while mapping the public subdomain to the
  // simulator's repository folder.
  if (cleanPath.includes('..')) {
    return new Response('Not Found', { status: 404 });
  }

  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/sim/pksk/${cleanPath}`;

  return context.env.ASSETS.fetch(new Request(assetUrl.toString(), request));
}
