# Rujukan rasmi dan keputusan reka bentuk — Reqoo 3D Studio 0.9.0

## Import dan bahasa versi 0.9
PNG/JPG diproses pada PC melalui Canvas 2D dan kontur mask. SVG dibaca sebagai
geometri dengan Three.js SVGLoader. Solid, lubang dan sambungan menggunakan
Manifold sedia ada. Tiada perkhidmatan AI luaran untuk membuang latar gambar.
BM/EN ialah pilihan UI setempat dan berasingan daripada teks dan nama objek.
Rujukan API: https://threejs.org/docs/#examples/en/loaders/SVGLoader
https://manifoldcad.org/docs/html/classmanifold_1_1_cross_section.html

Disemak 22 Oktober 2026. Fokus akhir: keychain huruf/nama, nametag kerajaan dengan stiker Jata dan bingkai resin, serta keychain mini gaya plat biasa/EV.

## Nametag kerajaan

JPA menetapkan plastik 75 × 25 mm, huruf putih atas hitam dan Jata Persekutuan. Modul JPA 2025 menyatakan tarikh kuat kuasa 6 Januari 2025. Nama hendaklah konsisten; gelaran, nama jawatan dan logo jabatan tidak dimasukkan. Penggunaan Jata berkaitan pegawai Persekutuan dalam urusan rasmi; ketetapan untuk agensi lain perlu dirujuk kepada agensi masing-masing.

- https://docs.jpa.gov.my/docs/bk/2025/MODUL6.pdf
- https://docs.jpa.gov.my/docs/myppsm/PPSM/UP/Tatakelakuan-dan-Pengurusan-Tatatertib-Pegawai-Awam/64/

Keputusan aplikasi mengikut permintaan pengguna:
- Tapak kekal 75 × 25 mm. Warna tapak hitam, nama putih.
- Jata TIDAK dicetak 3D. Terdapat petak kosong untuk stiker: awal 18 × 18 mm, boleh ubah 12–20 mm, lekuk 0.3 mm.
- Bingkai resin selebar 1 mm mengelilingi SELURUH nametag. Tinggi awal 1.5 mm di atas tapak, boleh diubah 0.5–6 mm. Huruf awal 1.2 mm meninggalkan ruang 0.3 mm di bawah bibir bingkai.
- Saiz petak, lekuk, bingkai, ketebalan dan poket pin/magnet ialah pilihan reka bentuk, bukan ukuran wajib tambahan JPA. Pilihan font juga ciri reka bentuk pengguna. Pastikan nama kekal jelas dan stiker Jata yang sesuai dipasang.

## Rujukan gaya plat biasa

JPJ menerangkan Arial Bold, tinggi aksara kereta 70 mm, lebar lazim 40 mm (angka 1 dikecualikan), strok dan jarak 10 mm; gaya biasa putih atas hitam.

- https://www.jpj.gov.my/pusat-media-3/informasi-perkhidmatan-jpj/kenderaan/spesifikasi-no-plat-kenderaan/

Dalam aplikasi, plat ialah KEYCHAIN MINI sahaja, awal 85 × 25 mm dengan lubang cincin. Teks dikecilkan supaya muat. Ukuran plat jalan raya tidak digunakan sebagai ukuran keychain. Susunan satu/dua baris disediakan; font boleh ditukar bebas. Model keychain tidak diperakui untuk dipasang sebagai plat kenderaan.

## Rujukan gaya EV

JPJ menerangkan latar putih, tulisan hitam, indeks hijau dan bendera Malaysia di kiri. JPJePlate sebenar mempunyai fon keselamatan khas, hologram, QR, siri laser, RFID dan skru keselamatan.

Aplikasi hanya menghasilkan KEYCHAIN MINI gaya EV menggunakan font reka bentuk pengguna. Tiada ciri keselamatan rasmi, kod QR atau nombor siri dihasilkan. Rujukan: halaman rasmi JPJ di atas; portal tempahan https://jpjeplate.jpj.gov.my/ tidak dapat dicapai terus semasa semakan.

## Font dan aset

Font Windows dibaca daripada pemasangan Windows pada PC pengguna; fail font Microsoft tidak diedarkan. Pilihan mengikut font yang tersedia: Arial Bold, Arial, Segoe UI Bold, Times New Roman Bold, Comic Sans MS Bold, Impact, Georgia Bold, Verdana Bold, Courier New Bold, Tahoma Bold dan Trebuchet MS Bold. Helvetiker Bold ialah font sandaran terbina. Pengguna juga boleh membuka fail TTF/OTF sendiri.

Bendera bagi keychain EV: MYDS / GovTech Malaysia.
- https://design.digital.gov.my/en/icon
- https://github.com/govtechmy/myds/blob/main/packages/react/src/svg/icons/malaysia-flag.svg




## Plat motosikal dan bentuk cenderamata — kemas kini 0.6
- JPJ: https://www.jpj.gov.my/pusat-media-3/informasi-perkhidmatan-jpj/kenderaan/spesifikasi-no-plat-kenderaan/
  Rujukan huruf motosikal Arial Bold, putih/hitam dan susunan dua baris. Dimensi mini 50 x 40 mm merupakan pilihan Reqoo, bukan spesifikasi plat jalan raya.
- Bentuk pasaran dirujuk daripada pembekal UMAKE: https://www.umakedesign.my/bm/showproducts/productid/6458735/cid/0/umake-motor-crystal-3d-number-plate-acrylic-laser-cut-nombor-plat-motor-kristal-plat-moto-ex5-y15-rs150-vf3i-lc135/
  Pembekal menyenaraikan V Shape, Square, Rectangle dan Diamond.
- Gambar V-shape diperiksa: https://shopee.com.my/Nombor-Plat-Number-Plate-V-Shape-Motorcycle-YSUKU-with-Allen-Key-Nut-JPJ-Font-i.54609674.2270522263
- Gambar diamond diperiksa: https://shopee.com.my/Diamond-Frame-Motor-nombor-Plate-Ketuk-Aluminium-Font-Ori-Aluminium-Color-i.1136398561.27985902846
  Reqoo menghasilkan kontur mini sendiri berdasarkan bentuk tersebut; tiada logo penjual atau gambar produk disertakan.

## 3MF dan Union
- Isu mesej Bambu untuk 3MF tanpa config: https://github.com/bambulab/BambuStudio/issues/11927
  Pembangun mengakui semakan terlalu agresif; fail model biasa boleh dimuatkan dengan OK. Tiada profil printer dicipta oleh Reqoo.
- Manifold API: https://manifoldcad.org/docs/jsapi/documents/Using_Manifold.html
  Manifold 3.5.4, Apache-2.0, dilaksanakan setempat dan luar talian. Lesen disertakan dalam desktop/MANIFOLD-LICENSE.txt.
- Saiz gelung, sarung pen, pin pad dan dulang resin ialah parameter reka bentuk, bukan piawaian rasmi atau jaminan muat fizikal.


## Bookmark, booth dan QR — 0.9
Rujukan gaya, bukan aset yang disalin:
- Bookmark nama: https://www.wholesalebykali.com/products/3d-printed-bookmark-personalized
- Papan QR booth: https://www.etsy.com/listing/4532692937/custom-3d-printed-qr-code-sign-with-your
- Papan QR berdiri: https://mhkmade.com/products/qr-code-sign-payment-sign-nfc-payment-stand-tap-to-pay-sign-bar-menu-display-3d-printed-payment-tabletop-payment-scan
- Signage bertingkat: https://www.island-3d.com/products/layered-logo-sign
- Quiet zone empat modul DENSO WAVE: https://www.qrcode.com/en/howto/code.html/index.html
- QR asal merchant daripada bank/provider: https://knowledgebase.paynet.my/hc/en-us/articles/49584176719513-How-Can-Merchants-Use-DuitNow-QR
- Gambar QR diproses setempat menggunakan jsQR 1.4.0; kod dibina dengan qrcode-generator 2.0.4. jsQR berlesen Apache-2.0 dan qrcode-generator berlesen MIT; lesen disertakan. Tiada pendaftaran atau transaksi pembayaran.
- Arch/scallop/retro dan kontur bunga/hati/bintang/rama-rama/kucing dijana sebagai geometri sendiri; tiada gambar produk penjual digunakan dalam aplikasi.


## Rujukan aliran editor 0.9 (22 Oktober 2026)
- Canva Help — kombinasi gaya / warna / font: https://www.canva.com/help/color-and-font-combinations/
- Canva Design School — carian elemen dan font: https://www.canva.com/design-school/resources/using-search-canva-essentials-guide/
- PrusaSlicer Text Tool — fon dipasang / manipulasi teks: https://help.prusa3d.com/article/text-tool_399460
- PrusaSlicer 2.6 — pustaka font dan emboss: https://blog.prusa3d.com/prusaslicer-2-6-is-here-organic-supports-text-embossing-new-cut-tool-and-more_79322/
- Bambu Lab MakerLab — pendekatan preset Make My Sign: https://blog.bambulab.com/new-launch-of-makerlab-experiments/
- Autodesk Fusion Text — teks profil untuk geometri: https://help.autodesk.com/view/fusion360/ENU/?contextId=SKT-SKETCH-CREATE-TEXT

Reqoo menggunakan idea carian / kategori / preset dalam UI sendiri. Bentuk clipart
ialah kontur geometri asal dalam sumber Reqoo, bukan aset yang disalin daripada
aplikasi rujukan. Fungsi diterapkan pada aplikasi Electron sedia ada.

## Font tambahan
Sumber rasmi: https://github.com/google/fonts/tree/main/ofl
12 keluarga statik: lilitaone, pacifico, lobster, cherrybombone, bangers,
righteous, yesevaone, courgette, berkshireswash, bubblegumsans, boogaloo, fugazone.
Setiap fail OFL asal disimpan bersama font dalam desktop/fonts; salinan lengkap
dalam FONT-LICENSES.txt. Font Windows pengguna dibaca setempat, tidak diagihkan.


## v1.0.0 — toolbar dan katalog kereta
Semakan 23 Oktober 2026. Rujukan gaya UI: sumber rasmi Bambu Studio
https://github.com/bambulab/BambuStudio/blob/master/src/slic3r/GUI/GLCanvas3D.cpp
Reqoo menggunakan ikon Tabler (MIT), bukan menyalin aset ikon Bambu Studio.

Katalog ialah interpretasi relief ringkas: 96 pilihan, 19 pengeluar. Termasuk
model/generasi terdahulu, bukan senarai semua kereta yang sedang dijual.
Reka bentuk dibina dengan geometri aplikasi; tiada foto/logo pengeluar diedarkan.
Profil dan lampu dikongsi mengikut keluarga gaya; semak gambar kereta sebenar
jika memerlukan ketepatan generasi. Label nama bukan logo rasmi.

Rujukan pengeluar/model utama:
- Honda Civic: https://www.honda.com.my/model/civic
- Perodua: https://www.perodua.com.my/our-models/choose-model
- Perodua terdahulu: https://eownersmanual.perodua.com.my/ourcars
- Proton: https://www.proton.com/after-sales/owners-manual/
- Toyota: https://www.toyota.com.my/en.html
- Nissan: https://nissan.com.my/v2/
- Mazda: https://mazda.com.my/vehicles
- Mitsubishi: https://www.mitsubishi-motors.com.my/brochures/
- BMW: https://www.bmw.com.my/en/all-models.html
- Mercedes-Benz: https://www.mercedes-benz.com.my/passengercars/models.html
- Volkswagen: https://www.volkswagen.com.my/models
- BYD: https://www.byd.com/my
- Tesla: https://www.tesla.com/en_MY/models
- Chery: https://www.chery.my/
- Hyundai: https://www.hyundai.com/my/en
- Kia: https://www.kia.com/my/en

Nama lain dalam katalog termasuk Ford Ranger, Isuzu D-Max, Suzuki Swift dan
Peugeot 3008/5008. Tiada dakwaan semua variasi diperiksa terhadap lukisan OEM.
Gunakan preset sebagai permulaan reka bentuk keychain dan ubah mengikut keperluan.
