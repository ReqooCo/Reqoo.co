REQOO FINAL FIX 3 — CUSTOMER RECEIPT

Replace ONLY:
1. /shop/admin.html
2. Google Apps Script Code.gs

Then Apps Script:
Save -> Deploy -> Manage deployments -> Edit -> New version -> Deploy

KEEP YOUR EXISTING ADMIN_TOKEN.

Receipt separation:
- Receipt URL = customer-uploaded payment proof.
- Customer Receipt URL = REQOO-generated PDF.
- Lihat Bukti Bayaran uses payment proof only.
- Hantar Resit uses REQOO customer receipt only.
- If Customer Receipt URL is empty, Hantar Resit generates a fresh REQOO PDF,
  stores it in Drive, writes the URL to column 16, then opens WhatsApp with it.
- No fallback to payment proof.

Order number:
- Backend/Google Sheet keeps the original full order number.
- Admin/customer display: #RQ-YYMMDD-XXXX.
- Generated REQOO PDF uses the same short display number.

Does not replace shop/index.html and does not modify promo/cart/QR.
