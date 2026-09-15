from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'sim/pksk/simulator/sets/SET 01-10/data/set03.json'
A_LEVELS = [1,2,2,3,1,3,2,4,2,3,1,4,2,3,2,3,1,2,3,2,1,2,3,4,2,1,1,3,1,4]
ANSWER_SLOTS = [0,1,2,3] * 17 + [0,1]
SCORING_NOTE = 'Bahagian A ialah respons berprofil; skor mencerminkan kekuatan respons latihan, bukan label betul/salah mutlak.'


def situ(cat, construct, question, options, weights, idx):
    return {'id':f'A{idx:02d}','section':'BAHAGIAN A','category':cat,'format':'SITUATIONAL','question':question,'options':options,'weights':weights,'type':'graded','plannedLevel':A_LEVELS[idx-1],'constructFamily':construct,'levelSignal':A_LEVELS[idx-1],'contentDomain':cat,'setLevel':3,'rebuildStatus':'GOLD_V1_HUMAN_AUTHORED','scoringNote':SCORING_NOTE}


def direct(cat, construct, statement, agree_is_stronger, idx):
    return {'id':f'A{idx:02d}','section':'BAHAGIAN A','category':cat,'format':'AGREE_DISAGREE','question':statement,'options':['Setuju','Tidak setuju'],'weights':[3,0] if agree_is_stronger else [0,3],'type':'graded','plannedLevel':A_LEVELS[idx-1],'constructFamily':construct,'levelSignal':A_LEVELS[idx-1],'contentDomain':cat,'setLevel':3,'rebuildStatus':'GOLD_V1_HUMAN_AUTHORED','scoringNote':SCORING_NOTE}


def spec(level, construct, question, correct, distractors, visual=None):
    return (level, construct, question, correct, distractors, visual)


def make_b(idx, category, item, slot):
    level, construct, question, correct, distractors, visual = item
    opts=list(distractors); opts.insert(slot,correct)
    q={'id':f'B{idx:02d}','section':'BAHAGIAN B','category':category,'format':'MCQ','question':question,'options':opts,'answerIndex':slot,'weights':[3 if i==slot else 0 for i in range(4)],'type':'graded','plannedLevel':level,'constructFamily':construct,'levelSignal':level,'contentDomain':category,'setLevel':3,'rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'}
    if visual:q['visual']=visual
    return q


A_SITU = [
('EQ','welcoming_new_peer','Seorang murid baharu duduk sendirian ketika rehat dan kelihatan tidak pasti hendak pergi ke mana. Apakah tindakan kamu?', ['Biarkan dia supaya cepat belajar berdikari','Sapa dengan mesra, tawarkan untuk menunjukkan tempat penting dan beri ruang jika dia belum selesa bercakap banyak','Tanya terus banyak perkara peribadi supaya cepat rapat','Panggil beberapa rakan mengelilinginya supaya dia tidak bersendirian'], [1,3,0,2]),
('SQ','commitment_conflict','Kamu baru sedar latihan rumah sukan bertindih dengan masa yang telah dipersetujui untuk menyiapkan kerja kumpulan. Apakah tindakan paling bertanggungjawab?', ['Tidak hadir kerja kumpulan tanpa memberitahu','Maklumkan konflik seawal mungkin dan bincang pembahagian masa atau tugas yang masih adil','Minta rakan menyiapkan semua bahagian kamu','Tunggu sehingga kedua-dua aktiviti bermula sebelum memilih'], [1,3,0,2]),
('SSQ','presentation_choice','Kumpulan kamu mempunyai hanya lima minit untuk membentangkan dapatan yang banyak. Apakah cara terbaik memilih bentuk pembentangan?', ['Masukkan semua maklumat walaupun tulisan terlalu kecil','Utamakan dapatan penting dan pilih cara visual yang jelas dalam masa yang tersedia','Pilih cara yang paling disukai ketua tanpa melihat kandungan','Buang semua data dan bercakap tanpa persediaan'], [1,3,2,0]),
('EQ','receiving_criticism','Guru memberi banyak pembetulan pada hasil kerja yang kamu sangka sudah baik. Apakah respons paling matang?', ['Anggap pembetulan itu bermaksud kamu tidak berbakat','Baca maklum balas dengan tenang, tanya jika ada yang tidak jelas dan pilih perkara utama untuk diperbaiki','Padam hasil kerja itu dan mula projek lain','Bandingkan jumlah kesalahan kamu dengan rakan sebelum membuat apa-apa perubahan'], [0,3,1,2]),
('SQ','found_device','Kamu menemui sepasang fon telinga tanpa nama di kawasan kantin. Apakah tindakan paling wajar?', ['Simpan sehingga pemilik datang mencari kamu','Serahkan kepada guru atau tempat barang hilang sambil menyatakan lokasi kamu menemuinya','Cuba gunakan sebentar untuk memastikan ia masih berfungsi','Muat naik gambarnya bersama lokasi tepat dan minta sesiapa mengaku sebagai pemilik'], [1,3,0,2]),
('SSQ','conflicting_ideas','Dua ahli kumpulan bertegas dengan cadangan berbeza dan perbincangan mula terhenti. Apakah tindakan terbaik?', ['Undi segera tanpa mendengar alasan','Senaraikan keperluan tugasan, dengar alasan kedua-dua pihak dan bandingkan cadangan berdasarkan kriteria yang dipersetujui','Pilih cadangan ahli yang lebih petah bercakap','Minta kedua-duanya menarik diri daripada perbincangan'], [1,3,2,0]),
('EQ','resilience_selection','Kamu tidak terpilih menyertai pasukan sekolah walaupun telah berlatih lama. Apakah tindakan yang paling membantu perkembangan diri?', ['Berhenti menyertai latihan supaya tidak kecewa lagi','Minta maklum balas khusus, kenal pasti kemahiran yang perlu diperbaiki dan terus berlatih dengan sasaran baharu','Katakan proses pemilihan tidak adil sebelum mengetahui sebab','Cuba meyakinkan rakan supaya turut berhenti'], [1,3,2,0]),
('SQ','resource_care','Selepas aktiviti, kamu melihat paip air di belakang dewan masih mengalir dan pemegangnya agak longgar. Apakah tindakan sesuai?', ['Biarkan kerana kamu bukan orang terakhir yang menggunakannya','Jika selamat, tutup aliran dan maklumkan kerosakan kepada guru atau petugas supaya diperiksa','Putar pemegang sekuat-kuatnya walaupun mungkin rosak','Ambil video dan tunggu orang lain bertindak'], [1,3,0,2]),
('SSQ','fair_workload','Ketua mahu membahagikan empat tugas sama banyak mengikut bilangan tugas, tetapi satu tugas memerlukan masa tiga kali lebih lama. Apakah cadangan paling adil?', ['Terima sahaja kerana bilangan tugas sudah sama','Bandingkan beban masa dan kesukaran, kemudian agihkan supaya jumlah beban setiap ahli lebih seimbang','Beri tugas paling sukar kepada ahli yang paling senyap','Biarkan setiap orang memilih tanpa mengambil kira beban'], [1,3,0,2]),
('EQ','conversation_balance','Dalam perbincangan, seorang rakan bercakap hampir sepanjang masa dan ahli lain tidak sempat memberi pandangan. Apakah respons kamu?', ['Potong percakapannya dengan kasar','Cadangkan giliran atau minta pandangan ahli yang belum bercakap dengan cara yang menghormati semua orang','Diam kerana dia mungkin mempunyai idea paling banyak','Hantar mesej kepada ahli lain untuk mengkritiknya selepas perbincangan'], [0,3,2,1]),
('SQ','deadline_honesty','Kamu terlupa menghantar satu bahagian tugasan pada masa yang dijanjikan dan rakan kumpulan bertanya sebabnya. Apakah tindakan terbaik?', ['Cipta alasan supaya mereka tidak marah','Akui kesilapan, jelaskan keadaan dengan ringkas dan beri masa realistik untuk menyiapkan bahagian itu','Salahkan sambungan internet walaupun bukan puncanya','Tidak membalas sehingga tugasan siap'], [0,3,1,2]),
('EQ','sharing_device','Adik perlu menggunakan komputer keluarga untuk tugasan penting ketika kamu sedang bermain permainan yang boleh disambung kemudian. Apakah tindakan paling matang?', ['Terus bermain kerana kamu menggunakannya dahulu','Semak keperluan masa adik dan cari aturan yang munasabah, contohnya beri laluan untuk tugasan penting dahulu','Tutup komputer supaya tiada siapa dapat menggunakannya','Suruh adik menyalin tugasan daripada rakannya'], [1,3,0,2]),
('SQ','rumour_responsibility','Kamu menerima mesej yang menuduh seorang rakan menipu dalam pertandingan, tetapi mesej itu tidak menyertakan bukti. Apakah tindakan kamu?', ['Teruskan mesej itu kepada rakan rapat sahaja','Jangan sebarkan tuduhan yang belum disahkan dan rujuk saluran yang sesuai jika ada kebimbangan sebenar','Tanya orang ramai dalam kumpulan kelas sama ada mereka percaya','Tambahkan perkataan “mungkin” sebelum berkongsi supaya lebih selamat'], [1,3,0,2]),
('SSQ','fair_election','Kelas mahu memilih wakil untuk satu program. Rakan baik kamu bertanding bersama murid lain yang lebih memenuhi syarat tugas. Apakah cara membuat pilihan yang paling wajar?', ['Undi rakan baik kerana hubungan lebih penting','Nilai calon berdasarkan tugas, kebolehan dan sikap yang diperlukan walaupun pilihan itu bukan rakan rapat','Tidak mengundi supaya tidak perlu memilih','Minta rakan baik menjanjikan sesuatu sebelum kamu mengundi'], [1,3,2,0]),
('SQ','shared_space','Selepas makan, beberapa sampah tertinggal di kawasan yang digunakan bersama walaupun bukan semuanya milik kamu. Apakah tindakan paling bertanggungjawab?', ['Kutip sampah sendiri sahaja dan tinggalkan yang lain','Bantu memastikan kawasan kembali bersih dan ajak rakan yang terlibat mengurus sampah masing-masing','Tunggu pengawas datang','Alihkan sampah ke bawah meja supaya tidak kelihatan'], [2,3,1,0]),
('SSQ','data_conflict','Kumpulan mencatat dua bacaan berbeza untuk ukuran yang sepatutnya sama. Apakah tindakan terbaik sebelum membuat kesimpulan?', ['Pilih bacaan yang lebih sesuai dengan jangkaan','Semak kaedah ukuran, ulang bacaan jika boleh dan rekod sebab jika terdapat perbezaan','Ambil purata terus tanpa memeriksa punca','Buang kedua-dua bacaan dan gunakan anggaran'], [1,3,2,0]),
('EQ','helping_injury','Seorang murid terjatuh ketika bersukan dan kelihatan kesakitan. Ramai orang mula mengerumuninya. Apakah tindakan paling sesuai?', ['Angkatnya segera walaupun tidak tahu jenis kecederaan','Beri ruang, panggil guru atau orang dewasa yang bertanggungjawab dan ikut arahan keselamatan','Rakam keadaan supaya mudah diterangkan kemudian','Minta dia bangun dan berjalan untuk menguji kecederaan'], [1,3,0,2]),
('SQ','cyberbullying_response','Kamu melihat beberapa komen mengejek seorang murid dalam kumpulan kelas. Apakah tindakan yang paling bertanggungjawab?', ['Tambah emoji ketawa tetapi jangan menulis komen','Jangan sertai ejekan, simpan bukti jika perlu dan maklumkan kepada orang dewasa atau saluran sekolah yang sesuai','Keluar kumpulan dan biarkan perkara itu berterusan','Balas pembuli dengan ejekan yang lebih kuat'], [1,3,2,0]),
('EQ','using_feedback','Selepas latihan bercakap, rakan memberitahu suara kamu kurang jelas tetapi isi kamu baik. Apakah tindakan paling membantu?', ['Abaikan komen kerana isi lebih penting','Terima perkara yang berguna, cuba teknik suara yang lebih jelas dan minta maklum balas semula selepas berlatih','Berhenti bercakap dalam aktiviti seterusnya','Minta rakan menarik balik komen itu'], [1,3,0,2]),
('SSQ','family_task_planning','Pada hujung minggu kamu perlu menyiapkan projek sekolah dan membantu keluarga dalam satu urusan yang telah dirancang. Apakah pendekatan terbaik?', ['Tunggu sehingga salah satu pihak mengingatkan kamu','Senaraikan tugasan dan masa yang tersedia, dahulukan perkara berjadual serta berbincang jika ada pertindihan','Siapkan projek sepanjang malam tanpa rehat','Serahkan bahagian projek kamu kepada rakan'], [1,3,2,0]),
]

A_DIRECT = [
('SQ','truthfulness','Apabila saya tidak pasti tentang sesuatu fakta, saya patut mengakuinya daripada mereka jawapan.',True),
('EQ','criticism_reaction','Jika seseorang mengkritik kerja saya, cara terbaik ialah terus mempertahankan diri sebelum mendengar penjelasannya.',False),
('SSQ','evidence_choice','Keputusan kumpulan lebih kukuh apabila alasan dan bukti dipertimbangkan, bukan hanya bilangan orang yang menyokong.',True),
('SQ','property_respect','Barang sekolah yang tidak bertanda boleh dianggap milik sesiapa yang menemuinya.',False),
('EQ','emotional_pause','Berhenti seketika sebelum bertindak ketika emosi kuat boleh membantu saya membuat pilihan yang lebih baik.',True),
('SSQ','planning_value','Membuat pelan alternatif berguna apabila sesuatu aktiviti mempunyai risiko perubahan yang munasabah.',True),
('SQ','online_responsibility','Menyebarkan khabar yang belum disahkan menjadi selamat jika saya menulis “sekadar berkongsi”.',False),
('EQ','asking_support','Meminta bantuan dengan cara yang sesuai boleh menjadi tindakan matang apabila saya sudah mencuba sendiri.',True),
('SSQ','team_dissent','Dalam kumpulan, ahli yang tidak bersetuju patut diam supaya keputusan dapat dibuat lebih cepat.',False),
('SQ','safety_priority','Jika mengejar masa, langkah keselamatan kecil boleh dilangkau selagi kita berhati-hati.',False),
]

IQ = [
spec(2,'number_pattern','Pola nombor ialah 2, 6, 12, 20, 30, __. Apakah nombor seterusnya?', '42', ['36','40','44']),
spec(1,'analogy_function','Kamus digunakan untuk mencari makna perkataan seperti peta digunakan untuk ___.', 'mencari lokasi atau arah', ['mengukur suhu','menimbang objek','mengira masa']),
spec(3,'letter_pattern','Lengkapkan pola huruf: A, D, H, M, S, ___.', 'Z', ['X','Y','A']),
spec(3,'deduction','Semua finalis pertandingan robotik mesti menyerahkan buku log. Faiz ialah seorang finalis pertandingan robotik. Apakah yang pasti benar?', 'Faiz mesti menyerahkan buku log.', ['Faiz pasti memenangi pertandingan.','Semua ahli kelab ialah finalis.','Faiz menulis buku log seorang diri.']),
spec(2,'direction_change','Lina menghadap selatan. Dia berpusing 90° ke kanan, kemudian 90° ke kiri. Ke arah manakah dia menghadap sekarang?', 'Selatan', ['Utara','Timur','Barat']),
spec(3,'letter_code','Dalam satu kod, setiap huruf ditukar kepada huruf sebelumnya dalam abjad, dengan A menjadi Z. Jika FISH menjadi EHRG, LAMP menjadi ___.', 'KZLO', ['KALO','LZLO','KZMP']),
spec(2,'ordering','Zara lebih muda daripada Nabil tetapi lebih tua daripada Imran. Nabil lebih muda daripada Suri. Siapakah paling tua?', 'Suri', ['Nabil','Zara','Imran']),
spec(2,'weekly_cycle','Satu aktiviti diadakan setiap 7 hari. Jika sesi pertama pada hari Khamis, hari apakah sesi keempat?', 'Khamis', ['Rabu','Jumaat','Sabtu']),
spec(3,'input_output_rule','Mengikut peraturan yang sama, 4 → 14, 6 → 20 dan 8 → 26. Apakah 10 → ___?', '32', ['28','30','34']),
spec(4,'seating_constraints','Empat murid — Fara, Gopal, Hana dan Iqbal — duduk sebaris. Hana mesti di sebelah kiri Iqbal. Fara mesti di sebelah kiri Hana. Gopal mesti di sebelah kanan Iqbal. Susunan manakah memenuhi semua syarat?', 'Fara, Hana, Iqbal, Gopal', ['Hana, Fara, Iqbal, Gopal','Fara, Iqbal, Hana, Gopal','Gopal, Fara, Hana, Iqbal']),
]

MAT = [
spec(3,'mixed_fraction_addition','Berapakah 1 3/4 + 2 2/3?', '4 5/12', ['3 5/7','4 1/12','4 7/12']),
spec(2,'percentage_quantity','35% daripada 240 ialah ___.', '84', ['72','80','96']),
spec(2,'ratio_partition','Nisbah bilangan pen merah kepada pen biru ialah 4:7. Jika jumlahnya 99 batang, berapakah pen merah?', '36', ['44','56','63']),
spec(1,'median','Apakah median bagi 9, 12, 15, 17 dan 21?', '15', ['12','14.8','17']),
spec(2,'time_duration','Satu aktiviti bermula pada 2:35 petang dan berlangsung selama 1 jam 50 minit. Pukul berapakah aktiviti tamat?', '4:25 petang', ['4:15 petang','4:35 petang','5:25 petang']),
spec(2,'rectangle_context','Rajah menunjukkan pelan berbentuk segi empat tepat 16 m panjang dan 7 m lebar. Jika separuh kawasan digunakan untuk tanaman, berapakah luas kawasan tanaman?', '56 m²', ['23 m²','112 m²','46 m²'], {'kind':'rectangle','length_cm':16,'width_cm':7}),
spec(2,'triangle_area','Sebuah segi tiga mempunyai tapak 12 cm dan tinggi tegak 9 cm. Berapakah luasnya?', '54 cm²', ['42 cm²','108 cm²','21 cm²']),
spec(2,'cuboid_volume','Sebuah kotak berbentuk kuboid dalam rajah berukuran 8 cm × 5 cm × 7 cm. Berapakah isipadunya?', '280 cm³', ['160 cm³','200 cm³','320 cm³'], {'kind':'cuboid','length_cm':8,'width_cm':5,'height_cm':7}),
spec(2,'capacity_subtraction','Sebuah bekas mempunyai 3.6 L air. Sebanyak 850 mL digunakan. Berapakah baki air?', '2.75 L', ['2.15 L','2.85 L','3.45 L']),
spec(3,'money_multistep','Aina membeli 5 buku nota pada harga RM7.50 setiap satu dan 2 batang pen pada harga RM3.20 setiap satu. Berapakah jumlah bayaran?', 'RM43.90', ['RM40.70','RM44.50','RM53.50']),
spec(2,'distance_from_speed','Sebuah van bergerak pada purata 72 km/j selama 2.5 jam. Berapakah jarak yang dilalui?', '180 km', ['144 km','174 km','216 km']),
spec(1,'fraction_unshaded','Rajah dibahagi kepada 10 bahagian sama dan 3 bahagian berlorek. Apakah pecahan yang tidak berlorek?', '7/10', ['3/10','7/3','10/7'], {'kind':'fraction_bar','parts':10,'selected':3}),
spec(2,'probability','Sebuah kotak mempunyai 4 kad merah, 6 kad biru dan 5 kad kuning. Kebarangkalian memilih kad merah ialah ___.', '4/15', ['4/11','6/15','1/4']),
spec(2,'decimal_division','Berapakah 7.2 ÷ 0.6?', '12', ['1.2','7.8','72']),
spec(3,'percentage_remaining','Daripada 360 tiket, 65% telah dijual. Berapakah tiket yang masih belum dijual?', '126', ['108','216','234']),
spec(3,'data_mean','Rajah data menunjukkan lima nilai: 32, 28, 35, 25 dan 30. Berapakah puratanya?', '30', ['28','29','32'], {'kind':'five_value_data','values':[32,28,35,25,30]}),
spec(2,'coordinate_translation','Titik bermula pada (7, 2). Rajah menunjukkan titik itu bergerak 4 unit ke kanan. Apakah koordinat baharu?', '(11, 2)', ['(7, 6)','(3, 2)','(11, 6)'], {'kind':'coordinate_move','start':[7,2],'move_right':4}),
spec(2,'supplementary_angle','Dua sudut bersebelahan membentuk satu garis lurus. Rajah menunjukkan salah satu sudut ialah 128°. Berapakah sudut yang satu lagi?', '52°', ['42°','62°','128°'], {'kind':'straight_line_angle','known_angle_deg':128}),
spec(3,'simple_equation','Jika 6 × n + 8 = 50, berapakah nilai n?', '7', ['6','8','9']),
spec(3,'map_scale','Pada sebuah peta, 2 cm mewakili 9 km. Jika jarak pada peta ialah 8 cm, berapakah jarak sebenar?', '36 km', ['18 km','32 km','72 km']),
]

BM = [
spec(1,'kata_sendi','Pilih kata sendi nama yang betul: “Hadiah itu diberikan ___ pemenang pertandingan.”', 'kepada', ['dari','daripada','pada']),
spec(2,'penjodoh_bilangan','Pilih penjodoh bilangan yang paling sesuai untuk “___ payung”.', 'sebatang', ['sehelai','sebuah','sekeping']),
spec(2,'kata_ganda','Pilih ayat yang menggunakan kata ganda dengan betul.', 'Kanak-kanak itu beratur di luar dewan.', ['Kanak itu-kanak beratur di luar dewan.','Kanak2 itu beratur di luar dewan.','Kanak-kanakkanak itu beratur di luar dewan.']),
spec(2,'imbuhan','Pilih perkataan yang betul: “Murid diminta ___ borang sebelum Jumaat.”', 'melengkapkan', ['lengkapan','dilengkap','pelengkapkan']),
spec(2,'simpulan_bahasa','Siti mudah memahami pelajaran dan cepat menangkap penerangan guru. Simpulan bahasa yang sesuai ialah ___.', 'terang hati', ['besar kepala','kaki bangku','panjang tangan']),
spec(3,'ayat_aktif','Pilih ayat aktif yang betul.', 'Pasukan itu membentangkan cadangan mereka dengan yakin.', ['Cadangan mereka dibentangkan oleh pasukan itu dengan yakin.','Dengan yakin dibentangkan cadangan mereka.','Pasukan itu telah dibentangkan cadangan dengan yakin.']),
spec(3,'inferens_petikan','“Bas sekolah tiba lebih lewat daripada biasa kerana satu jalan ditutup. Pemandu memilih laluan lain dan semua murid tiba sebelum kelas kedua bermula.” Apakah inferens paling munasabah?', 'Pemandu menyesuaikan laluan untuk mengurangkan kesan kelewatan.', ['Bas itu rosak sepanjang perjalanan.','Semua murid terlepas seluruh sesi sekolah.','Jalan tersebut akan ditutup selama setahun.']),
spec(2,'tanda_baca','Pilih ayat yang menggunakan tanda baca dengan betul.', '“Bila latihan bermula?” tanya Amir.', ['“Bila latihan bermula”, tanya Amir.','“Bila latihan bermula”? tanya Amir.','Bila latihan bermula? “tanya Amir.”']),
]

ENG = [
spec(1,'preposition','Choose the best preposition: “The notice is displayed ___ the wall near the office.”', 'on', ['at','into','between']),
spec(2,'comparative','Which sentence correctly compares the weight of two boxes?', 'This box is lighter than the one we carried yesterday.', ['This box is more light than the one we carried yesterday.','This box is lightest than the one we carried yesterday.','This box lighter from the one we carried yesterday.']),
spec(1,'pronoun','Choose the correct pronoun: “Farah and I prepared the poster by ___.”', 'ourselves', ['themselves','herself','itself']),
spec(2,'vocabulary_context','In the sentence “The path was narrow, so the pupils walked in a single line,” “narrow” means ___.', 'not wide', ['very long','covered with water','easy to climb']),
spec(3,'reading_inference','Arun packed an extra bottle of water before a long outdoor practice on a hot day. What can we reasonably infer?', 'He expected to need more water during the practice.', ['He planned to pour water on the field.','He had forgotten where the practice was.','He wanted the bottle to make his bag heavier.']),
spec(2,'conditional','Choose the best word: “If the rain stops, we ___ continue the activity outside.”', 'can', ['could have','had','was']),
spec(3,'sequence_instruction','Which order is most logical for borrowing a library book? (P) Return it by the due date. (Q) Choose a book. (R) Record or scan the loan.', 'Q, R, P', ['P, Q, R','R, P, Q','R, Q, P']),
spec(2,'spelling','Choose the correctly spelt word.', 'necessary', ['neccessary','necessery','necesary']),
]

SCI = [
spec(2,'states_of_matter','Air di dalam belon memenuhi ruang belon. Sifat ini menunjukkan bahawa gas ___.', 'mempunyai isi padu dan memenuhi ruang yang tersedia', ['mempunyai bentuk tetap','tidak mempunyai jisim langsung','sentiasa boleh dilihat']),
spec(2,'heat_conduction','Mengapa pemegang periuk sering dibuat daripada bahan yang kurang mengalirkan haba?', 'Untuk mengurangkan pemindahan haba ke tangan pengguna.', ['Untuk menjadikan makanan lebih berat.','Untuk meningkatkan suhu api.','Untuk menambah isi padu periuk.']),
spec(2,'magnetism','Bahan manakah paling mungkin ditarik kuat oleh magnet biasa?', 'Paku besi', ['Pembaris plastik','Getah pemadam','Kertas']),
spec(3,'earth_rotation','Kejadian siang dan malam berlaku terutamanya kerana ___.', 'Bumi berputar pada paksinya', ['Bumi berhenti bergerak pada waktu malam','Matahari mengelilingi Bumi setiap hari','Bulan menutup Matahari setiap malam']),
spec(3,'transpiration','Dua tumbuhan sama diletakkan dalam keadaan yang sama, tetapi daun satu tumbuhan disapu nipis dengan bahan yang mengurangkan kehilangan air. Apakah proses yang paling terus dipengaruhi?', 'Transpirasi', ['Percambahan','Pendebungaan','Pencernaan']),
spec(3,'fair_test','Untuk menguji kesan jumlah baja terhadap pertumbuhan pokok, pemboleh ubah manakah patut dikekalkan sama antara kumpulan?', 'Jenis pokok dan jumlah air', ['Jumlah baja sahaja','Ketinggian akhir sahaja','Bilangan daun akhir sahaja']),
spec(2,'simple_machine','Menggunakan papan condong untuk menaikkan kotak ke atas lori membantu kerana papan itu ___.', 'mengurangkan daya yang diperlukan dengan menambah jarak gerakan', ['menghapuskan graviti','menambahkan jisim kotak','menjadikan kotak tidak mempunyai geseran langsung']),
spec(3,'ecosystem_balance','Jika bilangan serangga pendebunga berkurang dengan banyak di suatu kawasan, tumbuhan berbunga tertentu mungkin ___.', 'menghasilkan kurang buah atau biji', ['sentiasa tumbuh dua kali ganda','tidak lagi memerlukan air','menjadi haiwan']),
]

RBT = [
spec(2,'design_brief','Apakah tujuan utama ringkasan reka bentuk sebelum menghasilkan produk?', 'Menjelaskan masalah, pengguna, keperluan dan batasan utama produk.', ['Menentukan pemenang pertandingan lebih awal.','Menggantikan semua proses ujian.','Menetapkan warna sahaja.']),
spec(3,'ergonomics','Sebuah pemegang alat sering menyebabkan tangan cepat lenguh. Penambahbaikan yang paling berkaitan dengan ergonomik ialah ___.', 'mengubah bentuk dan saiz pemegang supaya lebih selesa digenggam', ['menambah hiasan pada pembungkus','menukar nama produk','menambah harga jualan']),
spec(2,'tool_safety','Sebelum menggunakan alat pemotong tangan, apakah tindakan keselamatan yang paling penting?', 'Periksa keadaan alat dan gunakan mengikut cara serta arah pemotongan yang betul.', ['Uji ketajaman dengan menyentuh mata alat.','Gunakan alat sambil berjalan.','Pegang bahan tanpa memastikan kedudukannya stabil.']),
spec(2,'switch_function','Dalam litar mudah, apakah fungsi utama suis?', 'Membuka atau menutup laluan arus elektrik.', ['Menambah saiz bateri.','Menukar wayar menjadi magnet kekal.','Menghasilkan elektrik tanpa sumber kuasa.']),
spec(3,'prototype_testing','Prototaip rak telefon mudah tumbang apabila telefon diletakkan tegak. Apakah langkah seterusnya yang terbaik?', 'Kenal pasti punca kestabilan, ubah suai tapak atau sudut sokongan dan uji semula.', ['Terus hasilkan banyak unit.','Tukar logo tanpa menguji struktur.','Minta pengguna memegang rak semasa digunakan.']),
spec(3,'packaging_evaluation','Pembungkusan baharu perlu melindungi produk rapuh semasa penghantaran. Ujian manakah paling relevan?', 'Ujian hentakan terkawal yang menyerupai keadaan penghantaran.', ['Mengira jumlah warna pada label.','Menilai tulisan jenama sahaja.','Membandingkan saiz logo pesaing.']),
]

GK = [
spec(1,'rukun_negara','Apakah prinsip pertama Rukun Negara?', 'Kepercayaan kepada Tuhan', ['Kesetiaan kepada Raja dan Negara','Keluhuran Perlembagaan','Kesopanan dan Kesusilaan']),
spec(1,'hari_malaysia','Hari Malaysia disambut pada ___.', '16 September', ['31 Ogos','1 Mei','25 Disember']),
spec(1,'bahasa_kebangsaan','Bahasa kebangsaan Malaysia ialah ___.', 'Bahasa Melayu', ['Bahasa Inggeris','Bahasa Mandarin','Bahasa Tamil']),
spec(2,'regional_location','Malaysia terletak di rantau ___.', 'Asia Tenggara', ['Asia Tengah','Eropah Barat','Amerika Selatan']),
spec(2,'flag_colour_meaning','Pada Jalur Gemilang, warna biru melambangkan ___.', 'perpaduan melalui keamanan dan kepatuhan', ['hasil pertanian negara','sumber mineral utama','bilangan negeri']),
spec(2,'federal_territories','Kumpulan manakah terdiri daripada tiga Wilayah Persekutuan Malaysia?', 'Kuala Lumpur, Labuan dan Putrajaya', ['Kuala Lumpur, Melaka dan Putrajaya','Labuan, Sabah dan Sarawak','Putrajaya, Selangor dan Perlis']),
]

PS = [
spec(4,'resource_allocation','Sebuah program mempunyai 24 kerusi. Setiap meja perlu 4 kerusi dan sekurang-kurangnya 2 meja mesti dikhaskan untuk tetamu. Jika 3 meja digunakan untuk peserta, berapakah kerusi masih ada selepas semua 5 meja disediakan?', '4 kerusi', ['0 kerusi','8 kerusi','12 kerusi']),
spec(3,'schedule_constraint','Tugas A mengambil 20 minit. Tugas B hanya boleh bermula selepas A dan mengambil 30 minit. Tugas C boleh dibuat serentak dengan B dan mengambil 15 minit. Jika bermula 9:00 pagi, masa paling awal semua tugas selesai ialah ___.', '9:50 pagi', ['9:35 pagi','10:05 pagi','10:15 pagi']),
spec(4,'decision_constraints','Sebuah kumpulan mahu memilih lokasi aktiviti. P berharga RM80 dan muat 20 orang; Q RM110 dan muat 35 orang; R RM140 dan muat 50 orang. Mereka mempunyai 32 peserta dan bajet maksimum RM120. Pilihan yang memenuhi kedua-dua syarat ialah ___.', 'Lokasi Q', ['Lokasi P','Lokasi R','Tiada lokasi']),
spec(4,'data_anomaly','Empat bacaan suhu ialah 27°C, 28°C, 27°C dan 41°C dalam keadaan yang sepatutnya sama. Apakah tindakan terbaik sebelum membuat kesimpulan?', 'Semak bacaan 41°C dan ulang ukuran kerana ia jauh berbeza daripada bacaan lain.', ['Buang semua bacaan dan gunakan 0°C.','Anggap 41°C pasti betul kerana paling tinggi.','Jumlahkan semua bacaan tanpa menyemak alat.']),
]

QUEUES={'IQ':deque(IQ),'Matematik':deque(MAT),'Bahasa Melayu':deque(BM),'English':deque(ENG),'Sains':deque(SCI),'Teknologi/RBT':deque(RBT),'Pengetahuan Am':deque(GK),'Penyelesaian Masalah':deque(PS)}
C1=['IQ','Matematik','Bahasa Melayu','Matematik','English','Sains','Matematik','Teknologi/RBT','Pengetahuan Am','Penyelesaian Masalah']
C2=['Matematik','IQ','Sains','Bahasa Melayu','Matematik','English','Teknologi/RBT','Matematik','Pengetahuan Am','IQ']
C3=['Matematik','IQ','Bahasa Melayu','English','Sains']
# Locked interleave preserves the 70-item blueprint while mixing domains.
B_ORDER = C1 * 4 + C2 * 2 + C3 * 2

WRITING=[
{'id':'C01','title':'Mengurangkan pembaziran makanan di kantin','prompt':'Kantin sekolah mendapati banyak makanan yang masih elok dibuang setiap hari. Cadangkan satu rancangan untuk mengurangkan pembaziran tanpa menjejaskan kebersihan dan keselamatan makanan. Huraikan langkah, pihak yang terlibat dan cara mengukur keberkesanannya.','min_words':100,'plannedLevel':2,'constructFamily':'canteen_food_waste','levelSignal':2,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'},
{'id':'C02','title':'Mengurus penggunaan skrin dengan seimbang','prompt':'Ramai murid menggunakan telefon atau tablet untuk belajar, hiburan dan berhubung dengan orang lain. Huraikan cara seorang murid boleh mengurus masa skrin dengan seimbang tanpa mengabaikan pembelajaran, rehat, aktiviti fizikal dan hubungan keluarga. Berikan alasan bagi cadangan kamu.','min_words':100,'plannedLevel':3,'constructFamily':'balanced_screen_time','levelSignal':3,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'},
{'id':'C03','title':'Menjaga kawasan rekreasi bersama komuniti','prompt':'Sebuah kawasan rekreasi berhampiran tempat tinggal kamu semakin kotor dan kurang selesa digunakan. Cadangkan program bersama komuniti untuk memperbaiki keadaan itu. Huraikan pembahagian tugas, cara menggalakkan penyertaan dan langkah memastikan perubahan dapat dikekalkan.','min_words':100,'plannedLevel':4,'constructFamily':'community_recreation_care','levelSignal':4,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'},
]


def build():
    qs=[]
    for i,row in enumerate(A_SITU,1): qs.append(situ(*row,i))
    for i,row in enumerate(A_DIRECT,21): qs.append(direct(*row,i))
    queues={k:deque(v) for k,v in QUEUES.items()}
    counts=Counter(B_ORDER)
    expected={'IQ':10,'Matematik':20,'Bahasa Melayu':8,'English':8,'Sains':8,'Teknologi/RBT':6,'Pengetahuan Am':6,'Penyelesaian Masalah':4}
    if counts != Counter(expected): raise SystemExit(f'B order mismatch: {dict(counts)}')
    for i,(cat,slot) in enumerate(zip(B_ORDER,ANSWER_SLOTS),1): qs.append(make_b(i,cat,queues[cat].popleft(),slot))
    if any(queues[k] for k in queues): raise SystemExit({k:len(v) for k,v in queues.items()})
    return {'set':3,'questions':qs,'writing':WRITING,'difficulty':3,'rebuildVersion':'GOLD_V1_SET03','source':'human_authored_gold_standard','legacy_content_used':False,'qualityStatus':'CANDIDATE_REVIEW'}


def main():
    data=build()
    TARGET.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'scripts/validate_pksk_gold_bank.py')],cwd=ROOT,check=True)
    print('WROTE',TARGET.relative_to(ROOT))

if __name__=='__main__': main()
