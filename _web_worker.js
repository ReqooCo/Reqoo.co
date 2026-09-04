const API_ORIGIN = 'https://api.reqoo.co';

async function proxyApi(request, url) {
  const target = new URL(`${API_ORIGIN}${url.pathname}${url.search}`);
  const init = { method: request.method, headers: request.headers, redirect: 'follow' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
  return fetch(new Request(target.toString(), init));
}

async function injectShopRuntime(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('text/html')) return response;
  const html = await response.text();
  if (!html.includes('heroProduct') || html.includes('/shop/hero-runtime.js')) return new Response(html, response);
  return new Response(html.replace('</body>', '<script src="/shop/hero-runtime.js?v=1"></script></body>'), response);
}

function assetRequest(pathname, request) {
  const target = new URL(pathname, 'https://reqoo.co');
  target.search = new URL(request.url).search;
  const init = { method: request.method, headers: request.headers, redirect: 'follow' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
  return new Request(target.toString(), init);
}

async function adminPkskV2(request, env) {
  const response = await env.ASSETS.fetch(assetRequest('/admin/sim-v2.html', request));
  const type = response.headers.get('content-type') || '';
  const source = type.toLowerCase().includes('text/html') ? await response.text() : null;
  const body = source === null ? response.body : source.replace(/API='\/api\/sim-admin'/g, "API='https://api.reqoo.co/api/sim-admin'");
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma', 'no-cache');
  headers.set('x-reqoo-admin-route', 'pksk-v2');
  headers.set('x-reqoo-api-route', 'direct');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

function pkskAssetPath(pathname) {
  let path = pathname || '/';
  if (path === '/' || path === '/pksk' || path === '/pksk/') return '/sim/pksk/index.html';
  if (/^\/pksk\//i.test(path)) path = path.slice('/pksk'.length) || '/';
  path = `/sim/pksk${path}`;
  if (path.endsWith('/')) path += 'index.html';
  return path;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, url);

    // admin.reqoo.co is a dedicated PKSK admin host. Its root and admin aliases
    // must all land on the V2 dashboard instead of the public Reqoo homepage.
    if (host === 'admin.reqoo.co' && (url.pathname === '/' || /^\/admin\/?$/i.test(url.pathname) || /^\/admin\/sim-v2\.html$/i.test(url.pathname) || /^\/sim\/pksk\/admin\/?$/i.test(url.pathname))) return adminPkskV2(request, env);

    if (host === 'pksk.sim.reqoo.co') {
      const pathname = pkskAssetPath(url.pathname);
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      const response = await env.ASSETS.fetch(assetRequest(`/${cleanPath}`, request));
      return response;
    }

    if (host === 'shop.reqoo.co') {
      const pathname = url.pathname === '/' ? '/shop/index.html' : `/shop${url.pathname}`;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      const response = await env.ASSETS.fetch(assetRequest(`/${cleanPath}`, request));
      return injectShopRuntime(response);
    }

    if (host === 'sim.reqoo.co') {
      let pathname = url.pathname;
      if (pathname === '/' || pathname === '') pathname = '/sim/index.html';
      else if (/^\/pksk\/?$/i.test(pathname)) pathname = '/sim/pksk/index.html';
      else if (/^\/pksk\//i.test(pathname)) pathname = `/sim${pathname}`;
      const cleanPath = pathname.replace(/^\/+/, '');
      if (cleanPath.includes('..')) return new Response('Not Found', { status: 404 });
      return env.ASSETS.fetch(assetRequest(`/${cleanPath}`, request));
    }
    return env.ASSETS.fetch(request);
  }
};