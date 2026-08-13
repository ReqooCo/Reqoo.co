# REQOO PKSK V18 — Dashboard + Payment Proof

This build combines the V14 customer dashboard/device/progress/admin system with the payment-proof workflow.

## Payment flow
1. Customer pays RM29 by QR.
2. Customer uploads JPG/PNG/WEBP proof on `/pksk/payment/`.
3. Proof is stored in Google Drive folder `PKSK_Payment_Proofs`.
4. Order is stored in `PKSK_Orders` with proof URL, filename and Drive ID.
5. Customer gets a WhatsApp notification button after submission.
6. Admin opens `/pksk/admin/`, reviews the proof, verifies the order and sends the Access Code through WhatsApp.

## Backend
Use `REQOO-PKSK-Code-V18-PROOF-DASHBOARD.gs` in the existing PKSK Apps Script project. Run `setupPKSK()` once after pasting to create/extend headers and authorize Google Drive.

Then deploy a **new version** of the existing Web App.

Do not replace the Reqoo Shop backend.
