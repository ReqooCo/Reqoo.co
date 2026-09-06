// REQOO SHOP ADMIN V1 canonical entrypoint.
// Stable product/image/order/payment/document actions are currently served by the audited v4→v5→v2 chain.
// This boundary lets production routing move to V1 without changing behaviour while the remaining internals are consolidated.
import { onRequest as handleShopAdminFlowV4 } from './shop-admin-flow-v4.js';
export async function onRequest({request,env}) { return handleShopAdminFlowV4({request,env}); }
