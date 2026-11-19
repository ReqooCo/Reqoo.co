// KaloriKu Worker foundation. Account endpoints intentionally disabled until email provider, rate limiting and authorization tests are ready.
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/status") {
   let database = false;
   try { database = !!(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first()); } catch {}
   return Response.json({app:"KaloriKu Fit",database,registration:false,authentication:false,storage:"local-only"}, {headers:{"cache-control":"no-store"}});
  }
  if (url.pathname.startsWith("/api/")) return Response.json({error:"Account API is not yet enabled"},{status:503,headers:{"cache-control":"no-store"}});
  return new Response("Static app content is deployed separately until the build pipeline is migrated.",{status:503});
 }
};
