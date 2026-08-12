# REQOO PKSK Landing V1

Target URL:
`https://reqoo.co/pksk/`

## Tujuan
Landing page mobile-first untuk produk PKSK Simulasi 100 Set.

## Flow yang dikunci
Customer → `/pksk/` → butang Beli → sistem order Reqoo sedia ada → payment → order/admin → access code → customer kembali ke `/pksk/` → masukkan code → simulator.

## Penting
Landing page ini **tidak menggantikan** `shop/index.html`, `shop/admin.html` atau `backend/Code.gs`.

Sistem order sedia ada kekal sebagai base.

## Sebelum live
1. Letakkan folder ini sebagai `pksk/` pada hosting yang sama dengan Reqoo.
2. Pastikan `/shop/` ialah laluan shop sedia ada.
3. Tambah produk PKSK pada katalog/order Reqoo.
4. Tambah proses generate access code pada backend sedia ada.
5. Tambah kolum access code/status/activation dalam Orders jika belum ada.
6. Isi `VERIFY_URL` dalam `app.js` selepas endpoint backend siap.
7. Tetapkan `SIMULATOR_URL` kepada lokasi simulator 100 set.
8. Uji penuh: order → payment → admin → code → activation → simulator → progress.

## Access-code V1
Cadangan medan order:
- `product`
- `accessCode`
- `accessStatus` (UNUSED / ACTIVE / BLOCKED)
- `activatedAt`
- `lastSeenAt`
- `deviceId` atau pengenal sesi yang sesuai

Jangan bina DRM berat untuk V1. Fokus pada akses mudah dan kawalan asas.

## Nota
Produk ini ialah simulasi latihan dan bukan peperiksaan rasmi KPM atau salinan soalan sebenar.
