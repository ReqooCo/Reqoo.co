import { onRequest } from '../functions/api/shop-admin.js';

export async function handle(request, env) {
  const bridgedEnv = {
    ...env,
    SHOP_DB: env.SHOP_DB || env.DB,
    SHOP_ADMIN_TOKEN: env.SHOP_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || '',
    PKSK_ADMIN_TOKEN: env.PKSK_ADMIN_TOKEN || env.REQOO_ADMIN_TOKEN || env.ADMIN_KEY || ''
  };
  return onRequest({ request, env: bridgedEnv });
}
