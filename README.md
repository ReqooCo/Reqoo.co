# REQOO.CO Website

Struktur GitHub Pages:
- `/` — landing page utama REQOO.CO
- `/shop/` — catalogue, customize, cart & checkout
- `/shop/promotion.html` — public promotion page
- `/shop/promotion-admin.html` — pengurusan promotion
- `/shop/admin.html` — order dashboard

## Nota promotion
Promotion public dan link `?promo=slug` menggunakan `listPromotions` daripada Google Apps Script yang sama. Shop tidak lagi bergantung kepada endpoint `getPromotion`, jadi link seperti:
`/shop/?promo=merdeka-special`
akan mencari promo berdasarkan slug daripada senarai promotion public.

API endpoint yang digunakan dikekalkan seperti dalam projek asal.

<!-- PKSK polish workflow trigger -->
