# REQOO PKSK — CANONICAL PRODUCTION FLOW

## URL structure
- PKSK landing: `/pksk/`
- Payment: `/pksk/payment/`
- Access: `/pksk/access/`
- Simulator: `/pksk/simulator/`
- Admin: `/pksk/admin/`

## Canonical backend
PKSK production payment, license, device registration, progress and dashboard use `/api/pksk` for the core backend, with `/api/pksk-v56` as the isolated access/simulator sync layer.

Online Billplz payment uses `/api/sim-payment`.

Do not introduce another PKSK payment/access backend.

## License contract
- 1 purchase = 1 license.
- Maximum **3 active devices**.
- License, device and progress records are owned by the SIM backend.
- Access is validated server-side before simulator use.

## Question bank
Set 01–50 and their JSON/visual/audio assets are canonical simulator content. Do not modify them during payment/access/backend maintenance unless the task explicitly targets the bank.

## Legacy files
Older Google Apps Script PKSK material is retained only as historical/reference material. It is **not** the production backend and must not be wired back into the current pages.

`README_INSTALL_V20.md` is obsolete and has been removed.

## Production rule
Before changing PKSK payment/access logic, audit this chain end-to-end:

`Landing → Payment → D1 order → R2 proof/Billplz callback → Admin verify → License → Access → Device → Simulator → Progress → Dashboard`
