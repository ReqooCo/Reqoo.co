# ToyyibPay setup

REQOO uses ToyyibPay as the payment provider. The backend adapter is at `functions/api/toyyibpay.js`, while PKSK uses `functions/api/sim-payment.js`.

## Cloudflare variables/secrets

Required:

- `TOYYIBPAY_USER_SECRET_KEY` — **Secret**. Copy the User Secret Key from ToyyibPay. Do not commit it to GitHub or paste it into frontend code.
- `TOYYIBPAY_CATEGORY_CODE` — variable or Secret. This is returned by ToyyibPay when a category is created.
- `TOYYIBPAY_ENV` — `production` for live or `sandbox` for dev.toyyibpay.com.

Optional:

- `TOYYIBPAY_ENABLE_DUITNOW_QR` — default `1`.
- `TOYYIBPAY_CHARGE_DUITNOW_QR` — default `0` (merchant pays DuitNow QR charge); use `1` only if the customer should bear it.
- `TOYYIBPAY_CHARGE_TO_CUSTOMER` — default `0` for the non-DuitNow channel fee setting.
- `REQOO_PAYMENT_TOKEN` — existing secret used to protect server-side setup/create-bill actions on the generic adapter.

## First-time category creation

After `TOYYIBPAY_USER_SECRET_KEY` is configured, call the protected adapter action `createCategory` once. It creates the default category `REQOO Payments` unless another name is supplied, and returns a `categoryCode`.

Save that returned code in Cloudflare as `TOYYIBPAY_CATEGORY_CODE` and redeploy.

The generic adapter endpoint supports:

- `health`
- `createCategory`
- `createBill`
- `verifyCallback`

`createCategory` and `createBill` require the `X-Reqoo-Payment-Token` header to match `REQOO_PAYMENT_TOKEN`.

## PKSK payment flow

`functions/api/sim-payment.js` now creates ToyyibPay bills and stores references as `toyyibpay:<BillCode>`. Successful ToyyibPay callbacks are verified using the documented MD5 callback hash before the order is marked paid, the PKSK license is issued, and referral settlement is completed.

Return URL:

`https://pksk.sim.reqoo.co/api/sim-payment?action=redirect`

Callback URL:

`https://pksk.sim.reqoo.co/api/sim-payment?action=callback`

## Rollback

Keep the old Billplz Cloudflare secrets temporarily during rollout. They are no longer used by the migrated PKSK flow, but retaining them makes rollback easier until a real ToyyibPay test payment has completed successfully.
