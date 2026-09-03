import { onRequest } from '../functions/api/core.js';

export async function handle(request, env) {
  const bridgedEnv = { ...env, REQOO_ADMIN_TOKEN: env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '' };
  return onRequest({ request, env: bridgedEnv });
}
