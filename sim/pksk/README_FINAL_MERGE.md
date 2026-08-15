# REQOO PKSK — CANONICAL PRODUCTION FLOW

## URL structure
- PKSK landing: `/pksk/`
- Payment: `/pksk/payment/`
- Access: `/pksk/access/`
- Simulator: `/pksk/simulator/`
- Admin: `/pksk/admin/`

## Canonical backend
PKSK production access, QR/manual payment, license, device registration, progress and dashboard use `/api/pksk`.

Online Billplz payment uses `/api/sim-payment`.

Do not introduce a second PKSK payment/access backend.

## Payment flow
### Online
1. Customer enters details.
2. `/api/sim-payment` creates the Billplz bill.
3. Billplz callback is signature-validated.
4. Order becomes `PAID`.
5. SIM license is created automatically.
6. Customer is redirected to Access.

### QR / manual
1. Customer enters details.
2. Customer pays RM35 through the displayed QR.
3. Customer uploads JPG/PNG/WEBP proof.
4. `/api/pksk` stores the proof in R2 and marks the order `PENDING`.
5. Admin opens the proof and verifies it.
6. Only a `PENDING` order with a valid R2 proof can be verified.
7. Order becomes `PAID` and a SIM license becomes `ACTIVE`.
8. Admin/customer flow sends the Access Code.

## License contract
- 1 purchase = 1 license.
- Maximum **2 active devices**.
- License, device and progress records are owned by the SIM backend.
- Access is validated server-side before simulator use.

## Payment reference contract
`orders.payment_ref` is typed:

- `billplz:<bill-id>` — online payment reference.
- `proof:<r2-key>` — QR/manual payment proof.
- `UPLOAD_FAILED:<reason>` — manual proof upload failure.

Do not use a generic non-empty `payment_ref` as proof of payment.

## Data ownership
- SHOP owns SHOP orders.
- SIM owns SIM licenses, devices and progress.
- R2 stores payment proof and large SIM assets.
- D1 stores structured SIM transactional data.

## Question bank
Set 01–50 and their JSON/visual/audio assets are canonical simulator content. Do not modify them during payment/access/backend maintenance unless the task explicitly targets the bank.

## Legacy files
Older Google Apps Script PKSK material is retained only as historical/reference material. It is **not** the production backend and must not be wired back into the current pages.

## Production rule
Before changing PKSK payment/access logic, audit this chain end-to-end:

`Landing → Payment → D1 order → R2 proof/Billplz callback → Admin verify → License → Access → Device → Simulator → Progress → Dashboard`
