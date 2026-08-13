# REQOO PKSK V20 — SMOOTH + REFERRAL

## Apa yang diubah
- Harga PKSK: RM35
- Referral commission default: RM5 dan boleh diubah dari Admin
- Referral registration + referral link
- Payment proof + server acknowledgement check
- WhatsApp selepas verify dengan link:
  https://reqoo.co/pksk/access/?code=ACCESS_CODE
- Access page auto-fill + auto validate
- Admin mobile dashboard baru
- Resend Access + copy code
- User activity trace
- Client error log
- Progress local-first + retry/queue bila connection terganggu
- API JSONP timeout/retry
- Backend runtime tidak lagi menjalankan full setup/Drive folder check pada setiap request
- Sets 01-50 dan kandungan simulator tidak diubah

## Install
1. Replace Code.gs PKSK dengan:
   `REQOO-PKSK-Code-V20-SMOOTH.gs`
2. Run `setupPKSK()` sekali.
3. Approve Google Drive permission.
4. Deploy -> New version, kekalkan URL Web App `/exec`.
5. Upload/sync folder `pksk/` dalam ZIP ini ke hosting Reqoo.

## Jangan sentuh
- `pksk/simulator/sets/`
- audio
- soalan JSON
- aset simulator

## Admin
URL:
`/pksk/admin/`

Token admin kekal seperti yang digunakan sekarang.

## Referral
URL:
`/pksk/referral/`

Referral link:
`/pksk/?ref=KODREF`

Harga dan komisen boleh diubah dari Admin > Tetapan.

## Payment
Customer:
`/pksk/payment/`

Selepas bukti dihantar, sistem buat semakan penerimaan server sebelum memaparkan WhatsApp.

## Penting
API URL dalam frontend kekal URL Web App PKSK yang sama. Jangan ubah ke URL Shop Reqoo.
