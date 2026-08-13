# REQOO PKSK — FINAL MERGE GUIDE

## URL structure
- Main Reqoo: `/`
- Shop: `/shop/`
- PKSK landing: `/pksk/`
- Payment QR: `/pksk/payment/`
- Access: `/pksk/access/`
- Admin: `/pksk/admin/`
- Simulator: `/pksk/simulator/`

## Included
- Set 01–50 only
- JSON bank + visual assets
- Existing Maybank QR in `pksk/payment/assets/maybank-qr.jpeg`
- Existing access/admin/payment UI preserved
- Simulator added under `pksk/simulator/`
- Simulator gate checks the existing Google Apps Script access API before starting

## Google Apps Script
Open the EXISTING Reqoo Apps Script project. Do NOT replace the existing `doGet()` or shop functions.

Open:
`pksk/PKSK_QR_GAS_ADDON.gs.txt`

1. Paste the functions into the existing Apps Script.
2. Merge the listed `action === ...` cases into the existing `doGet(e)`.
3. Keep your existing admin token mechanism. Do not expose the token in public frontend code.
4. Deploy the existing Apps Script as Web App and keep the same `/exec` URL already used by the current PKSK pages.
5. The functions automatically create:
   - `PKSK_Orders`
   - `PKSK_Licenses`

## Important
GitHub Pages is static. It cannot hide the JSON files or run server-side code. The access-code gate therefore controls the simulator UI, while the Google Apps Script controls license activation.

For stronger content protection later, move the question JSON/assets behind a backend. That is NOT required for this QR/manual-approval V1.

## Payment V1
1. Customer scans the QR.
2. Customer submits order details.
3. Order is written to `PKSK_Orders` as PENDING.
4. Admin verifies the bank payment manually.
5. Admin gets an access code.
6. Access code is sent to customer.
7. Customer enters code.
8. Simulator validates the code before starting.

## Do not
- Do not overwrite the root Reqoo `index.html`.
- Do not overwrite the existing Shop.
- Do not replace the existing Apps Script wholesale.
- Do not expose the admin token in frontend code.
