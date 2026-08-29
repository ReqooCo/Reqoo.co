export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  if (url.hostname.toLowerCase() !== 'pksk.sim.reqoo.co') {
    return context.next();
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const cleanPath = pathname.replace(/^\/+/, '');

  if (cleanPath.includes('..')) {
    return new Response('Not Found', { status: 404 });
  }

  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/sim/pksk/${cleanPath}`;

  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), request));

  if (response.status === 404) {
    return new Response('PKSK Simulator asset not found', { status: 404 });
  }

  return response;
}
