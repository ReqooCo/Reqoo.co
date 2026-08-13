# REQOO PKSK V14 — Dashboard + Device Control

Patch ini untuk versi PKSK yang sedang diuji. Ia mengekalkan flow payment sedia ada dan menambah:

- Access Code masuk ke **Customer Dashboard**, bukan terus ke simulator.
- Dashboard tunjuk set selesai, purata, skor terbaik, device usage dan aktiviti.
- Maksimum **2 peranti** bagi setiap license.
- Admin boleh lihat license, device, progress dan activity log.
- Admin boleh reset semua device atau block license.
- Progress set disimpan ke server; session jawapan masih disimpan pada device untuk resume.
- Simulator phone: header lebih kecil, bottom navigation dan navigation drawer.
- Ada butang **Dashboard** dari simulator supaya customer boleh keluar dan masuk semula tanpa hilang akses.

## Fail penting

- `access/index.html` — login + customer dashboard.
- `simulator/index.html` — UI simulator dengan dashboard button + mobile navigation.
- `simulator/js/app.js` — device gate, resume session dan server progress sync.
- `simulator/css/style.css` — mobile CBT navigation.
- `admin/index.html` + `admin/style.css` — PKSK Admin dashboard.
- `REQOO-PKSK-Code-V14.gs` — backend Google Apps Script baharu.

## Deploy backend

1. Buka project Google Apps Script PKSK yang digunakan sekarang.
2. Backup code lama dahulu.
3. Gantikan code backend dengan `REQOO-PKSK-Code-V14.gs` **atau merge fungsi/action V14 ke router yang sedang digunakan**.
4. Pastikan `SPREADSHEET_ID` betul dan `ADMIN_TOKEN` sama dengan token admin PKSK semasa.
5. Deploy > Manage deployments > Edit deployment > New version > Deploy.
6. Pastikan Web app access masih seperti deployment PKSK sedia ada.

Backend V14 akan membuat sheet tambahan secara automatik:

- `PKSK_Devices`
- `PKSK_Progress`
- `PKSK_Activity`

Sheet `PKSK_Orders` dan `PKSK_Licenses` dikekalkan.

## Urutan test

1. Access Code aktif → `/pksk/access/`
2. Semak masuk dashboard.
3. Pastikan device `1 / 2`.
4. Tekan Sambung → simulator.
5. Uji phone: `☷ SOALAN` membuka navigation drawer.
6. Jawab beberapa soalan → keluar Dashboard.
7. Masuk semula → sambung set yang sama.
8. Habiskan satu set → semak progress dashboard.
9. Admin → semak license, device count dan progress.
10. Register device kedua → mesti jadi `2 / 2`. Device ketiga mesti ditolak.
11. Admin reset device → cuba device baru.

**Jangan ubah landing page Reqoo shop dalam patch ini.**
