from __future__ import annotations

import json
import re
from collections import Counter, defaultdict, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'sim/pksk/simulator/sets/SET 01-10/data/set02.json'
SET01 = ROOT / 'sim/pksk/simulator/sets/SET 01-10/data/set01.json'

LOCKED_B = {
    'IQ': 10,
    'Matematik': 20,
    'Bahasa Melayu': 8,
    'English': 8,
    'Sains': 8,
    'Teknologi/RBT': 6,
    'Pengetahuan Am': 6,
    'Penyelesaian Masalah': 4,
}
LOCKED_A_LEVELS = {1: 8, 2: 10, 3: 8, 4: 4}
LOCKED_B_ANSWERS = {0: 18, 1: 18, 2: 17, 3: 17}
VISUAL_KINDS = {
    'fraction_bar', 'five_value_data', 'rectangle',
    'cuboid', 'straight_line_angle', 'coordinate_move',
}
A_LEVELS = [1,2,2,3,1,3,2,4,2,3,1,4,2,3,2,3,1,2,3,2,1,2,3,4,2,1,1,3,1,4]
ANSWER_SLOTS = [0,1,2,3] * 17 + [0,1]
SCORING_NOTE = 'Bahagian A ialah respons berprofil; skor mencerminkan kekuatan respons latihan, bukan label betul/salah mutlak.'


def situ(cat, construct, question, options, weights, idx):
    return {
        'id': f'A{idx:02d}', 'section': 'BAHAGIAN A', 'category': cat,
        'format': 'SITUATIONAL', 'question': question, 'options': options,
        'weights': weights, 'type': 'graded', 'plannedLevel': A_LEVELS[idx-1],
        'constructFamily': construct, 'levelSignal': A_LEVELS[idx-1],
        'contentDomain': cat, 'setLevel': 2,
        'rebuildStatus': 'GOLD_V1_HUMAN_AUTHORED', 'scoringNote': SCORING_NOTE,
    }


def direct(cat, construct, statement, agree_is_stronger, idx):
    return {
        'id': f'A{idx:02d}', 'section': 'BAHAGIAN A', 'category': cat,
        'format': 'AGREE_DISAGREE', 'question': statement,
        'options': ['Setuju', 'Tidak setuju'],
        'weights': [3,0] if agree_is_stronger else [0,3],
        'type': 'graded', 'plannedLevel': A_LEVELS[idx-1],
        'constructFamily': construct, 'levelSignal': A_LEVELS[idx-1],
        'contentDomain': cat, 'setLevel': 2,
        'rebuildStatus': 'GOLD_V1_HUMAN_AUTHORED', 'scoringNote': SCORING_NOTE,
    }


def spec(level, construct, question, correct, distractors, visual=None):
    return (level, construct, question, correct, distractors, visual)


def make_b(idx, category, item, answer_slot):
    level, construct, question, correct, distractors, visual = item
    if len(distractors) != 3:
        raise ValueError(f'B{idx:02d}: need exactly 3 distractors')
    options = list(distractors)
    options.insert(answer_slot, correct)
    q = {
        'id': f'B{idx:02d}', 'section': 'BAHAGIAN B', 'category': category,
        'format': 'MCQ', 'question': question, 'options': options,
        'answerIndex': answer_slot,
        'weights': [3 if i == answer_slot else 0 for i in range(4)],
        'type': 'graded', 'plannedLevel': level, 'constructFamily': construct,
        'levelSignal': level, 'contentDomain': category, 'setLevel': 2,
        'rebuildStatus': 'GOLD_V1_HUMAN_AUTHORED',
    }
    if visual:
        q['visual'] = visual
    return q


A_SITU = [
    ('EQ','team_emotion','Dalam perlawanan antara rumah sukan, seorang rakan melakukan kesilapan pada saat akhir lalu menyalahkan dirinya sendiri. Apakah respons kamu?',
     ['Beritahu dia kesilapan itu memang menyebabkan pasukan kalah','Tenangkan dia, akui kekecewaannya dan ajak pasukan bincang perkara yang boleh diperbaiki bersama','Tukar topik supaya dia tidak memikirkan kesilapan itu','Minta dia berehat dahulu, kemudian tawarkan untuk berlatih bersama selepas emosinya reda'], [0,3,1,2]),
    ('SQ','integrity_found_property','Kamu menemui sampul berisi wang di bawah meja selepas kelas dan tiada nama pada sampul itu. Apakah tindakan paling bertanggungjawab?',
     ['Simpan dahulu sehingga ada orang bertanya','Serahkan kepada guru atau pejabat sekolah dan terangkan tempat kamu menemuinya','Tanya beberapa rakan sama ada wang itu milik mereka sebelum menyerahkannya','Ambil sedikit untuk memastikan jumlahnya sebelum diserahkan'], [1,3,2,0]),
    ('SSQ','deadline_replanning','Seorang ahli kumpulan tidak hadir pada hari akhir menyiapkan pembentangan. Bahagian penting yang diberi kepadanya belum siap. Apakah tindakan terbaik?',
     ['Tunggu sehingga dia hadir kerana itu tanggungjawabnya','Bahagikan semula bahagian penting mengikut kemampuan ahli yang ada dan maklumkan perubahan kepadanya','Siapkan semua bahagiannya sendiri supaya lebih cepat','Buang bahagian itu walaupun isi pembentangan menjadi tidak lengkap'], [1,3,2,0]),
    ('EQ','social_inclusion','Kamu sedar seorang rakan tidak dimasukkan ke dalam kumpulan sembang kelas yang digunakan untuk berkongsi maklumat tugasan. Apakah tindakan kamu?',
     ['Diam kerana kamu bukan pentadbir kumpulan','Tanya secara baik sama ada dia mahu dimasukkan dan maklumkan kepada pentadbir jika dia tertinggal','Hantar semua mesej kepadanya secara peribadi tanpa bertanya','Tegur pentadbir dalam kumpulan besar dengan bahasa yang keras'], [1,3,2,0]),
    ('SQ','privacy_judgement','Rakan menghantar tangkap layar borang yang memaparkan nombor telefon beberapa murid dan meminta kamu berkongsi dalam kumpulan lain. Apakah tindakan paling wajar?',
     ['Kongsi kerana maklumat itu datang daripada rakan sendiri','Padam bahagian yang sensitif atau minta versi selamat sebelum berkongsi, dan ingatkan rakan tentang privasi','Kongsi kepada rakan rapat sahaja','Simpan gambar itu sebagai rujukan walaupun tidak diperlukan'], [0,3,2,1]),
    ('SSQ','budget_prioritisation','Kelas kamu mempunyai RM120 untuk menghias sudut bacaan. Dua cadangan menarik berjumlah RM180. Apakah cara membuat keputusan yang paling baik?',
     ['Pilih cadangan yang paling cantik walaupun melebihi bajet','Bandingkan keperluan, kos dan manfaat setiap item lalu pilih gabungan yang tidak melebihi RM120','Minta seorang murid menambah wang sendiri','Beli dahulu dan fikir cara membayar baki kemudian'], [1,3,2,0]),
    ('EQ','online_self_regulation','Kamu menerima komen yang kasar pada hasil kerja yang kamu muat naik untuk aktiviti sekolah. Apakah respons paling matang?',
     ['Balas dengan komen yang sama keras','Berhenti seketika, nilai sama ada komen itu mengandungi maklum balas berguna dan jawab dengan tenang jika perlu','Padam semua hasil kerja kamu serta-merta','Hantar tangkap layar kepada ramai rakan supaya mereka membalas orang itu'], [0,3,2,1]),
    ('SQ','academic_integrity','Semasa kuiz individu, rakan di sebelah menunjukkan jawapannya kepada kamu tanpa diminta. Apakah tindakan kamu?',
     ['Lihat sekali sahaja kerana dia yang menunjukkannya','Teruskan menjawab sendiri dan elakkan menggunakan jawapan yang ditunjukkan','Gunakan jawapan itu hanya jika kamu benar-benar tidak tahu','Tunjukkan jawapan kamu pula supaya adil'], [1,3,2,0]),
    ('SSQ','risk_decision','Aktiviti luar kelas dirancang pada petang hari, tetapi ramalan cuaca menunjukkan kemungkinan ribut petir. Apakah tindakan kumpulan yang paling wajar?',
     ['Teruskan kerana ramalan cuaca mungkin salah','Sediakan pilihan aktiviti di tempat selamat dan semak arahan guru serta keadaan cuaca sebelum membuat keputusan akhir','Batalkan semua aktiviti untuk minggu itu tanpa berbincang','Tunggu sehingga hujan turun baru fikir tindakan'], [1,3,2,0]),
    ('EQ','performance_anxiety','Beberapa minit sebelum pembentangan, kamu berasa sangat gementar dan sukar mengingat isi utama. Apakah tindakan yang paling membantu?',
     ['Beritahu kumpulan bahawa kamu tidak mahu bercakap langsung','Tarik nafas, semak tiga isi utama dan minta rakan memberi isyarat jika kamu terlupa','Baca semua teks dengan sangat laju supaya cepat selesai','Tukar bahagian dengan rakan pada saat akhir tanpa berbincang'], [1,3,2,0]),
    ('SQ','accountability_borrowed_item','Buku perpustakaan yang kamu pinjam terkoyak sedikit ketika berada dalam beg kamu. Kamu tidak pasti bila ia berlaku. Apakah tindakan kamu?',
     ['Pulangkan seperti biasa kerana kamu tidak pasti puncanya','Maklumkan kepada petugas perpustakaan tentang kerosakan dan ikut arahan untuk penyelesaiannya','Tampal sendiri tanpa memberitahu sesiapa','Minta rakan memulangkan buku itu bagi pihak kamu'], [1,3,2,0]),
    ('SSQ','evidence_reasoning','Satu khabar angin mengatakan aktiviti kokurikulum dibatalkan, tetapi dua sumber memberi maklumat berbeza. Apakah cara terbaik menentukan tindakan?',
     ['Ikut maklumat yang paling ramai orang percaya','Semak pengumuman rasmi atau dapatkan pengesahan guru yang bertanggungjawab sebelum membuat keputusan','Pilih maklumat yang kamu lebih suka','Sebarkan kedua-dua versi supaya orang lain menentukan sendiri'], [1,3,2,0]),
    ('EQ','assertive_communication','Seorang rakan sering memotong percakapan kamu semasa perbincangan hingga kamu sukar menyampaikan idea. Apakah respons paling sesuai?',
     ['Potong percakapannya semula setiap kali dia bercakap','Cakap dengan tenang bahawa kamu mahu menghabiskan penerangan dahulu, kemudian beri ruang kepadanya','Diam sepanjang perbincangan selepas itu','Adu kepada semua ahli bahawa dia tidak menghormati orang lain'], [0,3,2,1]),
    ('SQ','responsible_ai_use','Kamu menggunakan alat AI untuk mendapatkan idea awal bagi tugasan. Guru meminta hasil kerja sendiri dan sumber yang digunakan. Apakah tindakan paling bertanggungjawab?',
     ['Salin jawapan AI kerana kamu sendiri yang menaip arahan','Gunakan idea sebagai pencetus, semak fakta, tulis semula dengan kefahaman sendiri dan nyatakan penggunaan sumber jika diminta','Minta AI menghasilkan teks yang lebih sukar dikesan','Kongsi jawapan itu dengan rakan supaya semua menggunakan versi sama'], [1,3,0,2]),
    ('SSQ','task_allocation','Empat ahli kumpulan mempunyai kemahiran berbeza dalam menulis, melukis, mengira dan bercakap. Apakah cara membahagi tugasan yang paling berkesan?',
     ['Ketua mengambil semua tugasan penting','Padankan tugasan dengan kekuatan ahli sambil memastikan setiap orang faham matlamat dan boleh membantu antara satu sama lain','Beri tugas secara rawak supaya semuanya adil','Biarkan setiap ahli memilih tanpa melihat keperluan projek'], [1,3,2,0]),
    ('EQ','sportsmanship','Pasukan kamu kalah selepas rakan tersilap menghantar bola. Beberapa ahli mula memarahinya. Apakah tindakan kamu?',
     ['Sertai mereka supaya dia lebih berhati-hati lain kali','Hentikan sindiran, fokus pada permainan sebagai usaha pasukan dan bincang kesilapan selepas semua bertenang','Bawa rakan itu keluar daripada pasukan segera','Diam walaupun keadaan semakin tegang'], [0,3,1,2]),
    ('SQ','safety_citizenship','Kamu nampak lantai koridor basah dan murid lain mula berlari melalui kawasan itu. Apakah tindakan paling sesuai?',
     ['Jalan perlahan dan biarkan orang lain menjaga diri masing-masing','Beri amaran kepada murid berdekatan dan maklumkan kepada guru atau petugas supaya kawasan itu dikeringkan atau ditanda','Letakkan beg kamu sebagai penghadang tanpa memberitahu sesiapa','Rakam keadaan itu untuk dihantar dalam kumpulan kelas'], [1,3,2,0]),
    ('SSQ','time_planning','Kamu perlu menyiapkan tugasan esok tetapi juga telah berjanji membantu aktiviti keluarga pada malam ini. Apakah tindakan paling baik?',
     ['Batalkan janji keluarga tanpa berbincang','Susun masa, siapkan bahagian paling penting lebih awal dan bincang dengan keluarga jika jadual perlu diselaraskan','Tangguhkan tugasan sehingga lewat malam','Minta rakan menyiapkan tugasan kamu'], [1,3,2,0]),
    ('EQ','family_empathy','Adik kamu secara tidak sengaja merosakkan model yang kamu bina untuk sekolah. Kamu sangat kecewa. Apakah respons paling matang?',
     ['Marah supaya dia tahu nilai model itu','Ambil masa untuk bertenang, terangkan mengapa kamu kecewa dan cari cara membaiki model bersama jika sesuai','Tidak bercakap dengannya sepanjang hari','Minta ibu bapa menghukumnya sebelum kamu membaiki model'], [0,3,2,1]),
    ('SQ','peer_pressure','Sekumpulan rakan mengajak kamu menyebarkan gambar lucu seorang murid tanpa pengetahuannya. Apakah tindakan kamu?',
     ['Kongsi jika gambar itu tidak terlalu memalukan','Tolak untuk menyebarkannya dan jelaskan bahawa izin serta maruah orang lain perlu dihormati','Lihat dahulu reaksi orang lain sebelum membuat keputusan','Simpan gambar itu untuk kegunaan sendiri'], [1,3,2,0]),
]

A_DIRECT = [
    ('EQ','accountability','Jika saya melakukan kesilapan yang menjejaskan orang lain, saya patut mengakuinya dan membantu membetulkan keadaan.',True),
    ('SQ','integrity','Lebih baik menyembunyikan kesilapan kecil jika tiada siapa menyedarinya.',False),
    ('SSQ','open_mindedness','Saya boleh mengubah pendirian apabila bukti yang lebih baik menunjukkan keputusan asal kurang sesuai.',True),
    ('EQ','impulse_control','Apabila marah, menghantar mesej balasan dengan segera biasanya lebih baik daripada menunggu sehingga tenang.',False),
    ('SSQ','teamwork','Dalam kerja kumpulan, kejayaan bersama lebih penting daripada memastikan idea saya sahaja digunakan.',True),
    ('SQ','rule_respect','Peraturan keselamatan boleh diabaikan apabila kita yakin tiada kemalangan akan berlaku.',False),
    ('SQ','digital_consent','Saya patut meminta izin sebelum berkongsi foto rakan dalam ruang awam atau kumpulan besar.',True),
    ('EQ','fairness','Jika kawan rapat melakukan kesalahan, saya patut mempertahankannya walaupun bukti menunjukkan dia bersalah.',False),
    ('SSQ','perspective_taking','Mendengar pandangan yang berbeza boleh membantu saya membuat keputusan yang lebih baik.',True),
    ('EQ','help_seeking','Jika tugasan sangat sukar, lebih baik saya menunggu orang lain menyelesaikannya daripada meminta bantuan atau mencuba strategi lain.',False),
]

IQ = [
    spec(2,'number_pattern','Perhatikan pola nombor: 4, 9, 19, 39, __. Apakah nombor seterusnya?', '79', ['59','69','89']),
    spec(1,'analogy','Kompas berkaitan dengan arah seperti termometer berkaitan dengan ___.', 'suhu', ['masa','jarak','berat']),
    spec(3,'letter_pattern','Apakah huruf seterusnya dalam pola A, C, F, J, O, ___?', 'U', ['T','V','W']),
    spec(3,'deduction','Semua ahli Kelab Inovasi yang menyertai pertandingan mesti menghadiri latihan. Nisa menyertai pertandingan sebagai ahli Kelab Inovasi. Apakah kesimpulan yang pasti?', 'Nisa mesti menghadiri latihan.', ['Nisa pasti menjadi ketua pasukan.','Semua ahli kelab menyertai pertandingan.','Latihan hanya untuk Nisa.']),
    spec(3,'spatial_direction','Ravi menghadap timur. Dia berpusing 90° ke kiri, kemudian 180° ke kanan. Ke arah manakah dia menghadap?', 'Selatan', ['Utara','Timur','Barat']),
    spec(2,'letter_code','Dalam satu kod, setiap huruf ditukar kepada huruf selepasnya dalam abjad. CAT menjadi DBU. Apakah kod bagi DOG?', 'EPH', ['DPH','EOG','FPH']),
    spec(2,'ordering','Iman lebih tinggi daripada Farah. Farah lebih tinggi daripada Mei. Mei lebih tinggi daripada Ana. Siapakah paling tinggi?', 'Iman', ['Farah','Mei','Ana']),
    spec(2,'calendar_reasoning','Jika 1 haribulan jatuh pada hari Selasa, hari apakah pada 22 haribulan yang sama?', 'Selasa', ['Isnin','Rabu','Khamis']),
    spec(4,'rule_discovery','Jika 3 → 10, 5 → 26 dan 7 → 50 mengikut peraturan yang sama, 9 → ___.', '82', ['72','80','90']),
    spec(4,'constraint_order','Empat murid — Aina, Bala, Chong dan Devi — berbaris. Aina mesti di hadapan Bala. Chong mesti di belakang Bala. Devi mesti di hadapan Aina. Susunan manakah mungkin?', 'Devi, Aina, Bala, Chong', ['Aina, Devi, Bala, Chong','Devi, Bala, Aina, Chong','Chong, Devi, Aina, Bala']),
]

MAT = [
    spec(3,'fraction_subtraction','Berapakah 3/4 − 2/5?', '7/20', ['1/20','5/9','11/20']),
    spec(2,'percentage_discount','Harga sebuah beg ialah RM80. Kedai memberi diskaun 15%. Berapakah harga selepas diskaun?', 'RM68', ['RM65','RM72','RM74']),
    spec(2,'ratio_total','Nisbah murid lelaki kepada murid perempuan ialah 2:3. Jika jumlah murid 45 orang, berapakah murid lelaki?', '18', ['15','27','30']),
    spec(2,'mean','Purata bagi 14, 18, 22 dan 26 ialah ___.', '20', ['18','19','22']),
    spec(2,'time_duration','Sebuah bengkel bermula pada 10:45 pagi dan berlangsung selama 2 jam 35 minit. Pukul berapakah bengkel tamat?', '1:20 petang', ['12:20 tengah hari','1:10 petang','1:30 petang']),
    spec(2,'area_rectangle','Rajah menunjukkan sebuah segi empat tepat berukuran 14 cm × 9 cm. Berapakah luasnya?', '126 cm²', ['46 cm²','92 cm²','138 cm²'], {'kind':'rectangle','length_cm':14,'width_cm':9}),
    spec(2,'perimeter_rectangle','Sebuah kebun berbentuk segi empat tepat mempunyai panjang 18 m dan lebar 12 m. Berapakah perimeter kebun?', '60 m', ['30 m','216 m','72 m']),
    spec(2,'volume_cuboid','Rajah menunjukkan sebuah kuboid dengan panjang 10 cm, lebar 6 cm dan tinggi 4 cm. Berapakah isipadunya?', '240 cm³', ['120 cm³','200 cm³','320 cm³'], {'kind':'cuboid','length_cm':10,'width_cm':6,'height_cm':4}),
    spec(2,'mass_conversion','Sebuah bakul mengandungi 2.75 kg buah. Kemudian 450 g buah ditambah. Berapakah jumlah jisim?', '3.20 kg', ['2.80 kg','3.05 kg','3.65 kg']),
    spec(4,'budget_multistep','Kelab mempunyai RM200. Mereka membeli 4 buku pada RM32 sebuah dan 3 set alat tulis pada RM18 setiap set. Berapakah baki wang?', 'RM18', ['RM28','RM36','RM54']),
    spec(2,'speed','Sebuah kereta bergerak 180 km dalam 3 jam pada kelajuan purata yang sama. Berapakah kelajuan puratanya?', '60 km/j', ['55 km/j','65 km/j','90 km/j']),
    spec(1,'fraction_visual','Rajah menunjukkan 5 daripada 8 bahagian yang sama berlorek. Apakah pecahan kawasan berlorek?', '5/8', ['3/8','5/3','8/5'], {'kind':'fraction_bar','parts':8,'selected':5}),
    spec(2,'probability','Sebuah beg mengandungi 5 guli hitam, 3 putih dan 2 hijau. Kebarangkalian memilih guli putih ialah ___.', '3/10', ['1/5','1/3','1/2']),
    spec(3,'decimal_multiplication','Berapakah 2.4 × 1.5?', '3.6', ['2.9','3.0','4.1']),
    spec(3,'percentage_change','Bilangan peserta meningkat daripada 120 kepada 150 orang. Berapakah peratus peningkatan?', '25%', ['20%','30%','35%']),
    spec(3,'data_range','Carta menunjukkan lima nilai 18, 24, 20, 30 dan 28. Berapakah beza antara nilai tertinggi dengan nilai terendah?', '12', ['8','10','14'], {'kind':'five_value_data','values':[18,24,20,30,28]}),
    spec(2,'coordinate_translation','Titik bermula pada (1, 4) dan bergerak 5 unit ke kanan. Apakah koordinat baharu?', '(6, 4)', ['(5, 4)','(6, 9)','(1, 9)'], {'kind':'coordinate_move','start':[1,4],'move_right':5}),
    spec(3,'straight_line_angle','Rajah menunjukkan satu sudut 74° pada garis lurus. Berapakah nilai x?', '106°', ['96°','104°','116°'], {'kind':'straight_line_angle','known_angle_deg':74}),
    spec(3,'order_operations','Berapakah nilai 360 ÷ 12 + 7 × 8?', '86', ['58','72','112']),
    spec(3,'scale_distance','Pada sebuah peta, 1 cm mewakili 5 km. Jarak antara dua tempat pada peta ialah 7.5 cm. Berapakah jarak sebenar?', '37.5 km', ['12.5 km','35 km','42.5 km']),
]

BM = [
    spec(1,'kata_hubung','Pilih kata hubung yang paling sesuai: “Nadia tetap menghadiri latihan ___ hujan turun dengan lebat.”', 'walaupun', ['kerana','supaya','sementara']),
    spec(2,'imbuhan','Pilih perkataan berimbuhan yang betul: “Pihak sekolah akan ___ jadual baharu kepada semua murid.”', 'mengumumkan', ['diumum','pengumuman','mengumum']),
    spec(2,'peribahasa','Rina belajar sedikit demi sedikit setiap hari sehingga mahir. Peribahasa yang paling sesuai ialah ___.', 'sedikit-sedikit, lama-lama menjadi bukit', ['bagai aur dengan tebing','bagai melepaskan batuk di tangga','sudah terhantuk baru tengadah']),
    spec(2,'makna_konteks','Dalam ayat “Cadangan itu wajar dipertimbangkan sebelum keputusan dibuat”, perkataan “wajar” paling hampir bermaksud ___.', 'patut', ['pelik','cepat','sukar']),
    spec(1,'ejaan','Pilih ejaan yang betul.', 'tanggungjawab', ['tanggung jawab','tanggongjawab','tanggung-jawap']),
    spec(3,'ayat_pasif','Pilih ayat pasif yang betul bagi ayat “Murid-murid membersihkan makmal itu semalam.”', 'Makmal itu dibersihkan oleh murid-murid semalam.', ['Makmal itu membersihkan murid-murid semalam.','Murid-murid dibersihkan oleh makmal itu semalam.','Semalam makmal itu sedang membersih murid-murid.']),
    spec(3,'idea_utama','Baca ayat berikut: “Program sarapan sekolah membantu murid memulakan hari dengan tenaga yang cukup. Murid juga lebih mudah memberi tumpuan apabila tidak lapar.” Apakah idea utama?', 'Sarapan yang mencukupi membantu tenaga dan tumpuan murid.', ['Semua murid mesti makan makanan yang sama.','Program sekolah hanya sesuai dijalankan pada waktu pagi.','Murid tidak boleh belajar selepas sarapan.']),
    spec(3,'functional_writing','Pilih ayat yang paling sesuai sebagai penutup laporan lawatan sambil belajar.', 'Secara keseluruhannya, lawatan ini mencapai objektif kerana murid memperoleh pengalaman dan pengetahuan baharu.', ['Bas tiba di sekolah pada pukul 7.30 pagi.','Kami membawa buku nota dan bekal makanan.','Tempat itu mempunyai banyak ruang untuk pengunjung.']),
]

ENG = [
    spec(1,'past_tense','Which sentence correctly describes a completed museum visit that happened yesterday?', 'The pupils visited the museum yesterday.', ['The pupils visit the museum yesterday.','The pupils visits the museum yesterday.','The pupils visiting the museum yesterday.']),
    spec(1,'subject_verb_agreement','Choose the correct verb: “Each member of the team ___ a task.”', 'has', ['have','having','are']),
    spec(2,'vocabulary_context','In the sentence “Please handle the glass model carefully because it is fragile,” the word “fragile” means ___.', 'easily broken', ['very heavy','brightly coloured','difficult to carry']),
    spec(3,'reading_inference','Mira left home with an umbrella although the sky was bright. Later, dark clouds appeared. Why did Mira most likely bring the umbrella?', 'She expected that it might rain.', ['She wanted to block the wind.','She planned to lend it to a friend.','She was going to repair it.']),
    spec(2,'conjunction','Choose the best word: “We checked the equipment twice ___ we wanted the experiment to be safe.”', 'because', ['although','unless','while']),
    spec(2,'polite_request','Which sentence is the most polite request?', 'Could you please show me how to use this tool?', ['Show me how to use this tool.','You need to show me this tool now.','Why have you not shown me the tool?']),
    spec(3,'sequence','Choose the best order for these ideas in a short instruction: (P) Dry your hands. (Q) Wash your hands with soap. (R) Wet your hands with clean water.', 'R, Q, P', ['P, R, Q','Q, P, R','Q, R, P']),
    spec(2,'punctuation','Choose the sentence with correct capitalisation and punctuation.', 'On Monday, Aisha visited Kuching with her family.', ['on Monday, Aisha visited kuching with her family.','On monday Aisha visited Kuching with her family','On Monday, aisha visited Kuching with her family.']),
]

SCI = [
    spec(3,'food_chain','Dalam rantai makanan padi → belalang → katak → ular, bilangan katak berkurang dengan banyak. Apakah perubahan yang paling munasabah berlaku terlebih dahulu?', 'Bilangan belalang cenderung meningkat.', ['Bilangan padi terus meningkat tanpa had.','Bilangan ular pasti meningkat.','Semua belalang akan hilang.']),
    spec(2,'evaporation','Dua kain basah yang sama dijemur, satu di tempat berangin dan satu di tempat tidak berangin. Kain manakah biasanya lebih cepat kering?', 'Kain di tempat berangin kerana kadar penyejatan lebih tinggi.', ['Kain di tempat tidak berangin kerana air tidak bergerak.','Kedua-duanya sentiasa kering pada masa yang sama.','Kain di tempat berangin kerana air membeku.']),
    spec(2,'electric_circuit','Sebuah mentol dalam litar mudah tidak menyala. Bateri dan mentol disahkan baik. Apakah perkara seterusnya yang paling sesuai diperiksa?', 'Sama ada semua sambungan wayar lengkap dan bersentuhan.', ['Warna wayar yang digunakan.','Saiz meja tempat litar diletakkan.','Bilangan murid yang memerhati.']),
    spec(3,'light_shadow','Apabila objek legap digerakkan lebih dekat kepada sumber cahaya dan skrin kekal pada tempatnya, bayang-bayang biasanya menjadi ___.', 'lebih besar', ['lebih kecil','lebih cerah daripada objek','tidak wujud']),
    spec(2,'microorganisms','Mengapa makanan yang telah dimasak biasanya disimpan di dalam peti sejuk jika tidak terus dimakan?', 'Suhu rendah memperlahankan pertumbuhan banyak mikroorganisma.', ['Peti sejuk menambah vitamin kepada makanan.','Suhu rendah menghilangkan semua air serta-merta.','Makanan tidak boleh berubah langsung dalam peti sejuk.']),
    spec(3,'plant_growth','Dua anak pokok sama disiram dengan jumlah air yang sama. Satu diletakkan di tempat bercahaya dan satu lagi dalam gelap. Apakah pemboleh ubah yang sengaja diubah?', 'Keadaan cahaya', ['Jumlah air','Jenis anak pokok','Tempoh pemerhatian']),
    spec(3,'friction','Mengapa tapak kasut sukan biasanya mempunyai corak atau alur?', 'Untuk meningkatkan geseran antara kasut dengan permukaan.', ['Untuk mengurangkan jisim badan pemakai.','Untuk menjadikan graviti lebih kuat.','Untuk menghasilkan cahaya ketika berjalan.']),
    spec(2,'condensation','Titisan air terbentuk pada bahagian luar gelas yang mengandungi air sangat sejuk. Dari manakah kebanyakan titisan itu berasal?', 'Wap air di udara yang terkondensasi pada permukaan gelas.', ['Air menembusi dinding gelas yang pejal.','Ais bertukar terus menjadi gas lalu keluar.','Gelas menghasilkan air apabila disejukkan.']),
]

RBT = [
    spec(2,'design_process','Selepas mengenal pasti masalah pengguna dalam proses reka bentuk, apakah langkah yang paling sesuai seterusnya?', 'Menjana dan menilai beberapa idea penyelesaian.', ['Terus menghasilkan produk dalam jumlah banyak.','Menetapkan harga jualan sebelum ada idea.','Mengabaikan keperluan pengguna.']),
    spec(3,'material_selection','Sebuah pemegang botol perlu ringan, tahan air dan tidak mudah pecah. Apakah pertimbangan paling penting ketika memilih bahan?', 'Padankan sifat bahan dengan fungsi dan keadaan penggunaan.', ['Pilih bahan paling mahal.','Pilih bahan yang warnanya paling terang sahaja.','Gunakan bahan yang sama untuk semua produk tanpa ujian.']),
    spec(2,'circuit_safety','Semasa membina produk menggunakan litar bateri kecil, apakah amalan paling selamat?', 'Pastikan sambungan kemas dan elakkan wayar terdedah yang boleh bersentuhan sesama sendiri.', ['Sambung wayar secara rawak sehingga mentol menyala.','Gunakan bateri rosak untuk mengurangkan kos.','Pegang semua hujung wayar terbuka serentak.']),
    spec(2,'iterative_design','Pengguna mendapati penutup prototaip sukar dibuka. Apakah tindakan terbaik pereka?', 'Ubah suai reka bentuk penutup berdasarkan maklum balas dan uji semula.', ['Tukar nama produk tanpa mengubah penutup.','Abaikan komen kerana prototaip sudah siap.','Terus hasilkan produk dalam jumlah banyak.']),
    spec(3,'mechanism','Dua gear bersentuhan. Jika gear pemacu berputar mengikut arah jam, gear yang bersentuhan dengannya akan berputar ___.', 'lawan arah jam', ['mengikut arah jam juga','tanpa bergerak','ke atas sahaja']),
    spec(3,'product_evaluation','Apakah bukti paling berguna untuk menilai sama ada bekas makanan baharu benar-benar kalis bocor?', 'Keputusan ujian berulang menggunakan cecair dalam keadaan penggunaan sebenar.', ['Pendapat pereka sahaja.','Warna bekas selepas dicetak.','Bilangan iklan yang dibuat.']),
]

GK = [
    spec(1,'national_symbol','Apakah bunga kebangsaan Malaysia?', 'Bunga raya', ['Bunga melur','Bunga orkid','Bunga matahari']),
    spec(2,'jalur_gemilang','Jalur Gemilang mempunyai 14 jalur merah dan putih. Angka 14 melambangkan ___.', '13 negeri dan Kerajaan Persekutuan', ['14 daerah terbesar di Malaysia','14 bahasa rasmi','14 gunung tertinggi']),
    spec(1,'currency','Apakah mata wang rasmi Malaysia?', 'Ringgit Malaysia', ['Rupiah','Baht','Dolar Singapura']),
    spec(2,'civics','Malaysia mengamalkan sistem Raja Berperlembagaan dan Demokrasi Berparlimen. Institusi manakah menggubal undang-undang Persekutuan?', 'Parlimen', ['Mahkamah sahaja','Sekolah','Bank Negara Malaysia']),
    spec(2,'emergency_awareness','Apakah nombor kecemasan utama yang digunakan di Malaysia untuk mendapatkan bantuan agensi kecemasan?', '999', ['911','111','555']),
    spec(2,'sustainability','Sekolah mahu mengurangkan sisa melalui konsep 3R. Tindakan manakah paling tepat menunjukkan amalan “Reuse”?', 'Menggunakan semula barang yang masih boleh digunakan.', ['Membakar semua barang terpakai.','Membeli barang baharu setiap kali.','Mengasingkan barang mengikut warna sahaja.']),
]

PS = [
    spec(4,'multi_criteria_choice','Tiga pembekal menawarkan kotak projek. P: RM4 seunit, tahan 3 kg, siap 2 hari. Q: RM5 seunit, tahan 6 kg, siap 4 hari. R: RM6 seunit, tahan 8 kg, siap 7 hari. Projek memerlukan sekurang-kurangnya 5 kg dan mesti siap dalam 5 hari. Pilihan termurah yang memenuhi syarat ialah ___.', 'Pembekal Q', ['Pembekal P','Pembekal R','Semua pembekal sama sesuai']),
    spec(3,'dependency_scheduling','Sebuah projek mempunyai tiga tugas: ukur tapak, potong bahan, dan pasang model. Bahan hanya boleh dipotong selepas ukuran siap, dan pemasangan hanya boleh dibuat selepas bahan dipotong. Urutan paling logik ialah ___.', 'Ukur tapak → potong bahan → pasang model', ['Potong bahan → ukur tapak → pasang model','Pasang model → ukur tapak → potong bahan','Ukur tapak → pasang model → potong bahan']),
    spec(4,'capacity_planning','Sebuah tangki mengandungi 90 L air. Empat kumpulan masing-masing memerlukan 18 L, dan 10 L mesti disimpan sebagai simpanan. Adakah air mencukupi?', 'Ya, kerana selepas menggunakan 72 L masih berbaki 18 L.', ['Tidak, kerana empat kumpulan memerlukan 92 L.','Ya, kerana semua air boleh digunakan tanpa simpanan.','Tidak, kerana baki hanya 8 L.']),
    spec(4,'data_diagnosis','Mesin A menghasilkan 50 item dengan 1 rosak, Mesin B 40 item dengan 6 rosak, dan Mesin C 60 item dengan 2 rosak. Mesin manakah patut diperiksa dahulu jika keutamaan ialah kadar kerosakan tertinggi?', 'Mesin B', ['Mesin A','Mesin C','Semua sama']),
]

CATEGORY_QUEUES = {
    'IQ': deque(IQ), 'Matematik': deque(MAT), 'Bahasa Melayu': deque(BM),
    'English': deque(ENG), 'Sains': deque(SCI), 'Teknologi/RBT': deque(RBT),
    'Pengetahuan Am': deque(GK), 'Penyelesaian Masalah': deque(PS),
}
CYCLE1 = ['Matematik','IQ','Bahasa Melayu','English','Sains','Matematik','Teknologi/RBT','Pengetahuan Am','Matematik','Penyelesaian Masalah']
CYCLE2 = ['Matematik','IQ','Bahasa Melayu','English','Sains','Matematik','Teknologi/RBT','Pengetahuan Am','IQ','Matematik']
CYCLE3 = ['Matematik','IQ','Bahasa Melayu','English','Sains']
B_ORDER = CYCLE1 * 4 + CYCLE2 * 2 + CYCLE3 * 2

WRITING = [
    {
        'id':'C01','title':'Membina budaya membaca yang menarik',
        'prompt':'Kelas kamu mahu meningkatkan minat membaca dalam kalangan murid tanpa menjadikan aktiviti itu terasa seperti hukuman. Cadangkan satu program yang menarik. Huraikan langkah pelaksanaan, peranan murid dan cara untuk mengetahui sama ada program itu berjaya.',
        'min_words':100,'plannedLevel':2,'constructFamily':'school_reading_program','levelSignal':2,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'
    },
    {
        'id':'C02','title':'Mengurangkan kesesakan ketika waktu pulang',
        'prompt':'Kawasan hadapan sekolah sering sesak ketika waktu pulang dan keadaan itu boleh menjejaskan keselamatan. Huraikan cadangan yang boleh dilakukan oleh pihak sekolah, murid dan ibu bapa untuk menjadikan pergerakan lebih teratur dan selamat. Berikan alasan bagi cadangan kamu.',
        'min_words':100,'plannedLevel':3,'constructFamily':'traffic_safety_solution','levelSignal':3,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'
    },
    {
        'id':'C03','title':'Membantu murid baharu menyesuaikan diri',
        'prompt':'Seorang murid baharu kelihatan sukar menyesuaikan diri dan jarang menyertai aktiviti kelas. Jika kamu dan rakan-rakan mahu membantunya, huraikan tindakan yang sesuai, perkara yang perlu dielakkan dan cara memastikan bantuan itu menghormati perasaannya.',
        'min_words':100,'plannedLevel':4,'constructFamily':'inclusive_school_community','levelSignal':4,'contentDomain':'Artikulasi Penulisan','rebuildStatus':'GOLD_V1_HUMAN_AUTHORED'
    },
]


def normalise(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', ' ', str(text).casefold())).strip()


def build() -> dict:
    questions = []
    for idx, row in enumerate(A_SITU, 1):
        questions.append(situ(*row, idx))
    for offset, row in enumerate(A_DIRECT, 21):
        questions.append(direct(*row, offset))
    queues = {k: deque(v) for k,v in CATEGORY_QUEUES.items()}
    for idx, (category, slot) in enumerate(zip(B_ORDER, ANSWER_SLOTS), 1):
        questions.append(make_b(idx, category, queues[category].popleft(), slot))
    if any(queues[k] for k in queues):
        raise SystemExit(f'Unused B specs: { {k:len(v) for k,v in queues.items()} }')
    return {
        'set': 2, 'questions': questions, 'writing': WRITING, 'difficulty': 2,
        'rebuildVersion': 'GOLD_V1_SET02', 'source': 'human_authored_gold_standard',
        'legacy_content_used': False, 'qualityStatus': 'CANDIDATE_REVIEW',
    }


def validate(data: dict) -> None:
    qs = data['questions']; A = [q for q in qs if q['section']=='BAHAGIAN A']; B = [q for q in qs if q['section']=='BAHAGIAN B']
    assert data['set'] == 2 and len(qs) == 100 and len(A) == 30 and len(B) == 70 and len(data['writing']) == 3
    assert len({q['id'] for q in qs}) == 100
    assert len({normalise(q['question']) for q in qs}) == 100
    assert Counter(q['format'] for q in A) == {'SITUATIONAL':20,'AGREE_DISAGREE':10}
    assert Counter(int(q['plannedLevel']) for q in A) == LOCKED_A_LEVELS
    assert all(Counter(q['weights']) == Counter([0,1,2,3]) and len(q['options'])==4 for q in A[:20])
    assert all(q['options']==['Setuju','Tidak setuju'] and q['weights'] in ([3,0],[0,3]) for q in A[20:])
    assert all(q['category'] in {'EQ','SQ','SSQ'} for q in A)
    assert Counter(q['category'] for q in B) == LOCKED_B
    assert Counter(q['answerIndex'] for q in B) == LOCKED_B_ANSWERS
    assert all(len(q['options'])==4 and len(set(q['options']))==4 for q in B)
    assert all(q['weights']==[3 if i==q['answerIndex'] else 0 for i in range(4)] for q in B)
    assert all(q['plannedLevel'] in (1,2,3,4) for q in B)
    visuals = [q['visual'] for q in B if q.get('visual')]
    assert Counter(v['kind'] for v in visuals) == Counter({k:1 for k in VISUAL_KINDS})
    assert all(w['min_words']==100 and w['title'].strip() and w['prompt'].strip() for w in data['writing'])
    assert data['legacy_content_used'] is False and data['rebuildVersion']=='GOLD_V1_SET02'
    if SET01.exists():
        old = json.loads(SET01.read_text(encoding='utf-8'))
        old_stems = {normalise(q.get('question','')) for q in old.get('questions',[])}
        duplicates = sorted({normalise(q['question']) for q in qs} & old_stems)
        assert not duplicates, f'Exact/normalised question duplicates with Set01: {duplicates[:3]}'
    print('SET02 GOLD STRUCTURAL PASS')
    print('A levels:', dict(sorted(Counter(q['plannedLevel'] for q in A).items())))
    print('A categories:', dict(Counter(q['category'] for q in A)))
    print('B blueprint:', dict(Counter(q['category'] for q in B)))
    print('B answer positions:', dict(sorted(Counter(q['answerIndex'] for q in B).items())))
    print('Visuals:', dict(Counter(v['kind'] for v in visuals)))


def main() -> None:
    data = build()
    validate(data)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('WROTE', TARGET.relative_to(ROOT))


if __name__ == '__main__':
    main()
