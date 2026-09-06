// REQOO SHOP V1 canonical entrypoint.
// Stable createOrder logic lives in v3; remaining stable read/query actions are preserved by its v2 fallback.
// This is intentionally a thin compatibility boundary during V1 consolidation.
import { onRequest as handleShopFlowV3 } from './shop-flow-v3.js';
export async function onRequest({request,env}) { return handleShopFlowV3({request,env}); }
