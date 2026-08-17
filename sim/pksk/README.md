# REQOO PKSK — Production Canonical

## Flow
Landing → Payment → D1 order → R2 proof / Billplz callback → Admin verify → License → Access → Device → Simulator → Progress → Dashboard.

## Production backends
- `/api/pksk` — canonical PKSK order, QR/manual payment proof, admin verification, license and admin operations.
- `/api/pksk-v56` — access/device/progress validation layer used by the V56 client sync scripts.
- `/api/sim-payment` — online Billplz payment flow.

The V56 layer is intentionally additive; it does not replace the payment/admin backend.

## License
- 1 purchase = 1 license.
- Maximum 3 active devices.
- Access and progress are server-validated.

## Payment references
- `billplz:<bill-id>` — online payment.
- `proof:<r2-key>` — QR/manual payment proof.
- `UPLOAD_FAILED:<reason>` — proof upload failure.

Never treat a generic non-empty payment reference as proof of payment.

## Question bank
Set 01–50 and all JSON/visual/audio assets are canonical simulator content. Do not modify them during payment/access maintenance.

## Legacy
Old Google Apps Script PKSK material is historical only and is not part of production.
