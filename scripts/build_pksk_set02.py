import json, os
OUT='sim/pksk/simulator/sets/SET 01-10/data/set02.json'
A='''EQ|Kamu melihat rakan baharu duduk seorang diri ketika aktiviti kelas.|Biarkan kerana dia mungkin mahu bersendirian|Ajak berbual dan sertakan dia dalam aktiviti tanpa memaksa|Suruh rakan lain pergi menemaninya|Tanya semua orang mengapa dia bersendirian|1|empathy_inclusion
SQ|Kamu terlupa membawa bahan yang diperlukan untuk tugasan kumpulan.|Diam dan biarkan ahli lain menyelesaikannya|Beritahu kumpulan dengan jujur dan cari cara menggantikan bahan itu|Salahkan ibu bapa kerana tidak mengingatkan|Tidak hadir ketika tugasan dibuat|1|responsibility
SSQ|Dalam mesyuarat kelab, dua cadangan mempunyai kelebihan yang berbeza.|Pilih cadangan ketua tanpa menilai|Bandingkan kelebihan kedua-duanya berdasarkan matlamat aktiviti|Pilih cadangan rakan paling rapat|Tangguhkan keputusan tanpa sebab|1|decision_making
EQ|Seorang rakan kecewa kerana markahnya lebih rendah daripada jangkaan.|Katakan markah itu tidak penting|Dengar perasaannya dan bincangkan langkah untuk memperbaiki kelemahan|Bandingkan markahnya dengan murid lain|Suruh dia berhenti mencuba|1|emotional_support
SQ|Kamu nampak peralatan sukan sekolah dibiarkan selepas latihan.|Tinggalkan kerana bukan kamu yang menggunakannya|Susun dan pulangkan peralatan ke tempat yang ditetapkan|Sembunyikan peralatan supaya tidak hilang|Tunggu pekerja sekolah menguruskannya|1|responsibility
SSQ|Kumpulan kamu tidak sempat menyiapkan semua bahagian projek.|Padam bahagian yang belum siap|Kenal pasti bahagian paling penting dan bahagikan kerja semula mengikut masa|Tunggu sehingga guru datang|Biarkan seorang ahli menyiapkan semuanya|1|prioritisation
EQ|Kamu tersalah faham arahan rakan lalu berlaku pertengkaran kecil.|Terus mempertahankan diri|Tenangkan keadaan dan minta penjelasan tentang apa yang berlaku|Beritahu rakan lain tentang pertengkaran itu|Tidak bercakap lagi dengan rakan|1|conflict_resolution
SQ|Kamu menerima wang lebihan selepas membeli makanan di kantin.|Simpan kerana tiada siapa tahu|Semak resit dan pulangkan lebihan kepada penjual|Berikan kepada rakan|Belanjakan sebelum kelas bermula|1|integrity
SSQ|Semasa perbincangan, seorang ahli kurang bercakap tetapi mempunyai idea yang baik.|Teruskan tanpa bertanya|Beri peluang kepadanya menyampaikan pandangan|Minta ketua bercakap bagi pihaknya|Abaikan kerana dia pendiam|1|inclusive_leadership
EQ|Rakan kamu marah selepas ditegur guru.|Suruh dia membalas guru|Beri masa untuk bertenang dan bercakap apabila dia bersedia|Ketawakan reaksinya|Sebarkan cerita kepada kelas|1|self_regulation
SQ|Kamu mendapati fail kumpulan tersimpan pada komputer yang dikongsi.|Padam fail supaya ruang kosong|Jangan ubah fail orang lain dan maklumkan pemilik jika perlu|Salin fail untuk kegunaan sendiri|Tukar nama fail tanpa memberitahu|1|digital_responsibility
SSQ|Kamu diminta memilih ketua aktiviti tetapi dua calon sama-sama sesuai.|Pilih kawan sendiri|Gunakan kriteria yang dipersetujui dan nilai kedua-dua calon secara adil|Pilih calon paling popular|Undi tanpa mengetahui tugas ketua|1|fairness
EQ|Kamu kalah dalam pertandingan selepas membuat kesilapan pada akhir permainan.|Salahkan rakan|Akui kesilapan, belajar daripadanya dan terus menyokong pasukan|Berhenti sebelum keputusan diumumkan|Marah kepada pengadil|1|resilience
SQ|Kamu terlihat buku perpustakaan tercicir di luar kelas.|Bawa pulang|Pulangkan ke perpustakaan atau serahkan kepada guru|Tinggalkan di tempat yang sama|Tulis nama sendiri pada buku|1|care_for_property
SSQ|Guru meminta kumpulan menilai hasil kerja sendiri.|Mencari siapa yang patut dipersalahkan|Mengenal pasti kekuatan dan perkara yang boleh diperbaiki|Mendapat markah lebih tinggi secara automatik|Menggantikan penilaian guru|1|reflection
EQ|Rakan kamu tidak setuju dengan cadangan kamu.|Anggap dia tidak menghormati kamu|Dengar alasan dan pertimbangkan jika cadangannya lebih sesuai|Berhenti bekerjasama|Minta rakan lain menyokong kamu|1|open_mindedness
SQ|Kamu terlambat ke kelas kerana membantu murid yang memerlukan bantuan.|Masuk tanpa penjelasan|Masuk dengan tertib dan terangkan keadaan kepada guru jika ditanya|Salahkan murid itu|Tidak masuk kelas|1|accountability
SSQ|Kumpulan mempunyai masa 20 minit untuk menyiapkan pembentangan.|Bincang tajuk tanpa membahagi tugas|Bahagi tugas mengikut kekuatan ahli dan tetapkan masa semakan|Biarkan ketua buat semua|Hias slaid dahulu sebelum isi|1|planning
EQ|Kamu mendengar rakan mengkritik diri sendiri kerana tidak pandai dalam satu subjek.|Setuju dengannya|Bantu dia melihat perkara yang boleh diperbaiki dan tawarkan sokongan|Bandingkan dengan murid terbaik|Katakan dia memang tidak sesuai belajar|1|encouragement
SQ|Kamu menerima pautan yang meminta kata laluan akaun sekolah.|Masukkan kata laluan untuk mencuba|Jangan masukkan maklumat dan laporkan pautan itu|Kongsi pautan dengan rakan|Gunakan kata laluan lama|1|cyber_safety
SSQ|Dalam tugasan, seorang ahli tidak bersetuju dengan pembahagian kerja.|Paksa dia menerima|Tanya sebab dan runding pembahagian yang munasabah|Keluarkan dia daripada kumpulan|Serahkan semua kerja kepadanya|1|negotiation
EQ|Kamu sedar kamu telah bercakap terlalu kasar kepada rakan.|Tunggu sehingga dia lupa|Minta maaf dengan ikhlas dan ubah cara berkomunikasi|Salahkan keadaan|Buat lawak tentangnya|1|self_awareness
SQ|Kamu bertanggungjawab menjaga kelas selepas aktiviti tetapi rakan mengajak pulang awal.|Ikut sahaja|Selesaikan tanggungjawab dahulu kemudian pulang|Suruh rakan lain buat|Tinggalkan kelas berselerak|1|duty
SSQ|Semasa memilih reka bentuk poster, tiga ahli memberi idea berbeza.|Pilih idea orang paling tua|Gunakan kriteria seperti kejelasan, ketepatan dan kesesuaian sasaran|Pilih idea paling berwarna|Gabungkan semua idea walaupun bercanggah|1|criteria_based_choice
EQ|Rakan kamu berjaya dalam pertandingan sedangkan kamu tidak terpilih.|Elakkan rakan itu|Ucap tahniah dan gunakan pengalaman itu untuk memperbaiki diri|Katakan kemenangan itu bernasib baik|Minta dia tidak bercakap tentang pertandingan|1|sportsmanship
SQ|Kamu sedar maklumat pada tugasan kumpulan mungkin tidak tepat.|Biarkan kerana tugasan hampir siap|Semak sumber dan betulkan maklumat sebelum dihantar|Padam bahagian tersebut tanpa berbincang|Tukar nama penulis sumber|1|accuracy
SSQ|Kumpulan kamu menerima komen bahawa projek kurang jelas.|Abaikan kerana projek sudah siap|Gunakan komen itu untuk mengenal pasti bahagian yang perlu diperjelas|Salahkan orang yang memberi komen|Ubah semua perkara tanpa menilai|1|feedback
EQ|Seorang rakan gagal dalam pemilihan pasukan dan mula menyalahkan dirinya.|Katakan dia memang tidak cukup bagus|Dengar perasaannya dan bantu dia mengenal pasti perkara yang boleh dilatih|Ajak dia mengkritik jurulatih|Suruh dia melupakan minatnya|1|resilience
SQ|Kamu nampak lampu bilik darjah masih menyala ketika kelas sudah kosong.|Biarkan kerana bukan tanggungjawab kamu|Jika selamat, tutup lampu dan maklumkan guru jika perlu|Tunggu sehingga esok|Tukar semua suis elektrik|1|resource_care
SSQ|Kamu perlu memilih antara dua sumber maklumat untuk projek.|Pilih yang mempunyai gambar paling menarik|Bandingkan penulis, bukti, tarikh dan kesesuaian maklumat|Pilih sumber paling panjang|Pilih yang muncul paling awal|1|source_evaluation'''
B='''Bahasa Melayu|Ayat manakah menggunakan kata adjektif dengan betul?|Adik membaca buku dengan pantas.|Rumah itu sangat cantik.|Mereka berlari ke padang.|Ibu memasak nasi.|1|tatabahasa
Bahasa Melayu|Pilih perkataan yang paling hampir maksudnya dengan gigih.|Malas|Tekun|Leka|Lemah|1|sinonim
Bahasa Melayu|Apakah simpulan bahasa yang sesuai bagi seseorang yang cepat berputus asa?|Ringan tulang|Panjang akal|Hati kecil|Kecil hati|3|simpulan_bahasa
Bahasa Melayu|Pilih ayat yang menggunakan penjodoh bilangan dengan betul.|Seutas burung terbang di langit.|Sebatang pensel itu patah.|Sehelai kereta diletakkan di garaj.|Seekor bunga berkembang.|1|penjodoh_bilangan
Bahasa Melayu|Walaupun hujan turun dengan lebat, pasukan itu meneruskan latihan. Hubungan antara bahagian ayat ialah...|sebab|pertentangan|tujuan|masa|1|kata_hubung
Bahasa Melayu|Apakah maksud peribahasa bagai aur dengan tebing?|Hidup sendirian|Saling membantu|Bekerja dengan tergesa-gesa|Tidak mahu bekerjasama|1|peribahasa
Bahasa Melayu|Pilih ayat yang paling gramatis.|Para-para murid sedang beratur.|Para murid-murid sedang beratur.|Para murid sedang beratur.|Para orang murid sedang beratur.|2|tatabahasa
Bahasa Melayu|Kata dasar bagi menyediakan ialah...|sedia|sedian|penyedia|tersedia|0|imbuhan
Bahasa Melayu|Apakah idea utama ayat Menanam pokok di kawasan sekolah dapat mengurangkan haba dan mencantikkan persekitaran?|Sekolah perlu dicat.|Pokok memberi manfaat kepada persekitaran sekolah.|Haba hanya berlaku di sekolah.|Pokok sukar dijaga.|1|pemahaman
Bahasa Melayu|Pilih peribahasa paling sesuai untuk usaha sedikit demi sedikit sehingga berjaya.|Seperti katak di bawah tempurung|Sedikit-sedikit, lama-lama menjadi bukit|Bagai menatang minyak yang penuh|Harapkan pagar, pagar makan padi|1|peribahasa
Bahasa Inggeris|Choose the correct sentence.|She go to school every day.|She goes to school every day.|She going to school every day.|She gone to school every day.|1|subject_verb_agreement
Bahasa Inggeris|Which word is closest in meaning to careful?|Cautious|Noisy|Rapid|Empty|0|vocabulary
Bahasa Inggeris|Ali _____ his homework before dinner yesterday.|finish|finishes|finished|finishing|2|past_tense
Bahasa Inggeris|The children were excited _____ the science fair.|about|at|from|under|0|preposition
Bahasa Inggeris|Choose the best response to Would you like some water?|Yes, please.|Yes, I am.|No, I don't.|Water is blue.|0|functional_language
Bahasa Inggeris|Which sentence is in the future tense?|Mira visited the museum.|Mira visits the museum.|Mira will visit the museum.|Mira is visiting yesterday.|2|future_tense
Bahasa Inggeris|The word enormous means...|very small|very large|very fast|very old|1|vocabulary
Bahasa Inggeris|Choose the correct plural form of child.|childs|childes|children|childrens|2|plural
Bahasa Inggeris|If it rains, we _____ the activity indoors.|move|moved|will move|moving|2|conditional
Bahasa Inggeris|Which sentence shows a reason?|I stayed home because I was ill.|I stayed home at noon.|I stayed home near the gate.|I stayed home quietly.|0|reading_language
Matematik|Sebuah buku berharga RM18.50. Berapakah harga 3 buah buku?|RM37.00|RM45.50|RM55.50|RM58.50|2|money_multiplication
Matematik|3/4 daripada 28 ialah...|7|14|21|24|2|fractions
Matematik|Segi empat tepat panjang 12 cm dan lebar 7 cm. Luasnya ialah...|38 cm²|84 cm²|96 cm²|168 cm²|1|rectangle_area
Matematik|Purata bagi 8, 10, 12 dan 14 ialah...|10|11|12|13|1|mean
Matematik|Sebuah kereta bergerak 180 km dalam 3 jam. Purata lajunya ialah...|50 km/j|60 km/j|70 km/j|90 km/j|1|speed
Matematik|Nisbah guli merah kepada biru ialah 2:3. Jika terdapat 15 guli biru, berapakah guli merah?|6|8|10|12|2|ratio
Matematik|Tangki mengandungi 5.5 L air. Sebanyak 1.75 L digunakan. Berapakah baki?|2.75 L|3.25 L|3.75 L|4.25 L|1|decimal_subtraction
Matematik|Sebuah sudut berukuran 125°. Sudut itu ialah...|tirus|tegak|cakah|lurus|2|angles
Matematik|Corak nombor 4, 9, 14, 19, ... Apakah nombor seterusnya?|22|23|24|25|3|number_pattern
Matematik|Kotak mempunyai 6 baris dengan 8 botol setiap baris. Jika 7 botol dikeluarkan, berapa tinggal?|41|48|49|55|0|multi_step
Matematik|25% daripada 240 ialah...|40|50|60|80|2|percentage
Matematik|Jika x + 17 = 45, nilai x ialah...|18|28|32|62|1|algebra
Matematik|Segi tiga mempunyai tapak 10 cm dan tinggi 8 cm. Luasnya ialah...|18 cm²|40 cm²|80 cm²|160 cm²|1|triangle_area
Matematik|Masa 2:35 petang ditambah 1 jam 45 minit menjadi...|3:50 petang|4:10 petang|4:20 petang|4:30 petang|2|time
Matematik|Nombor dibundarkan kepada puluh terdekat menjadi 4,760. Yang mungkin ialah...|4,704|4,754|4,806|4,851|1|rounding
Sains|Apakah organ utama yang mengepam darah ke seluruh badan?|paru-paru|jantung|perut|buah pinggang|1|human_system
Sains|Tumbuhan memerlukan cahaya matahari terutamanya untuk...|menghasilkan makanan|menyerap bunyi|menghasilkan tanah|menyejukkan akar|0|photosynthesis
Sains|Yang manakah contoh perubahan boleh balik?|kertas dibakar|ais mencair|telur dimasak|kayu reput|1|reversible_change
Sains|Daya yang menarik objek ke arah Bumi ialah...|geseran|graviti|magnet|apungan|1|force
Sains|Mengapakah pemegang periuk dibuat daripada bahan yang kurang mengalirkan haba?|Supaya periuk lebih berat|Supaya haba kurang berpindah ke tangan|Supaya makanan cepat sejuk|Supaya periuk menghasilkan haba|1|heat_transfer
Sains|Bunyi terhasil apabila sesuatu objek...|membeku|bergetar|mencair|berkarat|1|sound
Sains|Apakah sumber tenaga yang boleh diperbaharui?|arang batu|minyak petroleum|cahaya matahari|gas asli|2|energy
Sains|Bayang-bayang terbentuk apabila...|cahaya dibelokkan oleh air|objek menghalang laluan cahaya|objek menghasilkan cahaya sendiri|udara menjadi gelap|1|light
Sains|Apakah fungsi akar tumbuhan?|menghasilkan bunga sahaja|menyerap air dan memegang tumbuhan|menghasilkan bunyi|menghasilkan biji tanpa daun|1|plant_structure
Sains|Campuran pasir dan air boleh diasingkan dengan kaedah...|penurasan|pembekuan|penyejatan terus|pembakaran|0|separation
Sains|Haiwan yang mempunyai tulang belakang dikenali sebagai...|invertebrata|vertebrata|serangga|moluska|1|classification
Sains|Apabila permukaan jalan menjadi basah, geseran antara tayar dan jalan biasanya...|bertambah banyak|berkurang|menjadi sifar sentiasa|bertukar menjadi graviti|1|friction
Sains|Yang manakah menunjukkan pantulan cahaya?|cahaya menembusi kaca jernih|cahaya memantul daripada cermin|air bertukar menjadi wap|bayang-bayang hilang|1|reflection
Sains|Apakah yang berlaku kepada air apabila dipanaskan sehingga mendidih?|menjadi ais|bertukar menjadi wap air|bertukar menjadi tanah|menjadi lebih berat|1|states_of_matter
Sains|Apakah amalan paling membantu mengurangkan sisa plastik?|Menggunakan beg pakai buang lebih banyak|Menggunakan bekas boleh guna semula|Membakar semua plastik|Membuang plastik ke longkang|1|environment
Sejarah|Apakah maksud Rukun Negara?|Slogan sebuah syarikat|Ideologi kebangsaan Malaysia|Nama sebuah negeri|Nama sebuah sungai|1|civics
Sejarah|Malaysia dibentuk pada tahun...|1957|1963|1965|1970|1|formation
Sejarah|Tujuan utama bendera Malaysia sebagai simbol negara ialah...|Menunjukkan harga barang|Melambangkan identiti dan kedaulatan negara|Menentukan sempadan sekolah|Menjadi hiasan sahaja|1|national_symbols
Sejarah|Siapakah yang mengisytiharkan kemerdekaan Persekutuan Tanah Melayu pada 31 Ogos 1957?|Tunku Abdul Rahman Putra Al-Haj|Tun Hussein Onn|Tun Abdul Razak|Tun Dr Ismail|0|independence
Sejarah|Apakah nama bandar yang menjadi pusat pentadbiran Kesultanan Melaka?|Melaka|Kuala Lumpur|Kuching|Kota Bharu|0|malacca
Sejarah|Apakah kepentingan mempelajari sejarah negara?|Menghafal semua tarikh tanpa memahami sebab|Memahami perkembangan negara dan mengambil iktibar|Mengelakkan penggunaan teknologi|Menentukan pekerjaan seseorang|1|historical_thinking
Sejarah|Prinsip Rukun Negara yang menekankan kesopanan ialah...|Keluhuran Perlembagaan|Kedaulatan Undang-undang|Kesopanan dan Kesusilaan|Kepercayaan kepada Tuhan|2|rukun_negara
Sejarah|Apakah tujuan utama pembentukan Malaysia pada tahun 1963?|Menggabungkan beberapa wilayah dalam sebuah persekutuan|Menukar nama semua negeri|Menghapuskan semua budaya tempatan|Menjadikan Kuala Lumpur ibu negara dunia|0|formation
Sejarah|Apakah maksud warisan ketara?|Warisan berupa objek atau bangunan yang boleh dilihat|Cerita yang hanya disampaikan secara lisan|Perasaan seseorang|Perancangan masa depan|0|heritage
Sejarah|Mengapakah tokoh kemerdekaan dikaji dalam sejarah?|Untuk mengetahui usaha dan sumbangan mereka kepada negara|Untuk menentukan siapa paling kaya|Untuk memilih ketua kelas|Untuk membandingkan hobi mereka|0|historical_figures
RBT|Apakah tujuan lakaran awal sesuatu produk?|Menghasilkan produk akhir tanpa perubahan|Menunjukkan idea dan membantu merancang reka bentuk|Mengira harga elektrik sahaja|Menggantikan semua bahan|1|design_process
RBT|Antara berikut, bahan yang sesuai untuk struktur ringan ialah...|kadbod tebal|air|pasir longgar|minyak masak|0|materials
RBT|Apakah fungsi gear dalam sesuatu mekanisme?|Menghasilkan warna|Memindahkan dan mengubah gerakan|Menyimpan air|Menghasilkan cahaya matahari|1|mechanism
RBT|Sebelum menggunakan alat pemotong, tindakan paling penting ialah...|Bekerja secepat mungkin|Memastikan alat sesuai dan mengikuti langkah keselamatan|Meninggalkan alat terbuka|Menggunakan alat tanpa arahan|1|safety
RBT|Apakah tujuan prototaip?|Menguji dan menambah baik idea sebelum produk akhir|Mengelakkan semua ujian|Menentukan nama produk sahaja|Menggantikan lakaran|0|prototype
RBT|Dalam sistem elektrik mudah, suis digunakan untuk...|membuka atau menutup litar|menambahkan saiz wayar|menukar plastik menjadi logam|menghasilkan bahan api|0|electricity
RBT|Apakah ciri utama reka bentuk yang baik?|Hanya cantik|Memenuhi keperluan pengguna, selamat dan berfungsi|Mahal tanpa sebab|Sukar digunakan|1|design_criteria
RBT|Jika satu bahan mudah berkarat, bahan itu kurang sesuai digunakan di tempat yang...|kering|sentiasa terdedah kepada air|berbumbung|berhawa dingin|1|material_selection
RBT|Apakah langkah yang wajar selepas produk diuji?|Catat kelemahan dan cadangkan penambahbaikan|Terus buang produk|Abaikan maklum balas|Ulang kesilapan yang sama|0|evaluation
RBT|Apakah tujuan ukuran yang tepat dalam pembinaan produk?|Memastikan komponen sesuai dan produk menepati reka bentuk|Membuat produk lebih berat|Mengurangkan keselamatan|Mengelakkan penggunaan alat|0|measurement'''
def parse(block,sec):
    out=[]
    for line in block.splitlines():
        p=line.split('|')
        if len(p)!=8: raise ValueError(line)
        cat,q,*rest=p; opts=rest[:4]; ans=int(rest[4]); fam=rest[5]
        base=[3,2,1,0]; w=[base[(i-ans)%4] for i in range(4)]
        out.append((sec,cat,q,opts,w,fam))
    return out
items=parse(A,'BAHAGIAN A')+parse(B,'BAHAGIAN B')
assert len(items)==100
qs=[]
for i,(sec,cat,q,opts,w,fam) in enumerate(items,1):
    prefix='A' if sec.endswith('A') else 'B'
    n=sum(1 for x in items[:i] if x[0]==sec)
    qs.append({'section':sec,'category':cat,'question':q,'options':opts,'weights':w,'type':'graded','plannedLevel':2,'constructFamily':fam,'levelSignal':2,'contentDomain':cat,'setLevel':2,'rebuildStatus':'V45.9_GENERATED_FROM_ZERO','scoringNote':'3/2/1/0 scoring approximation: strongest / constructive alternative / limited response / inappropriate response.','id':f'PKSK-V45-S02-{prefix}{n:02d}'})
writing=[{'id':'C01','title':'Projek membantu murid baharu','prompt':'Bayangkan kamu dilantik mengetuai satu projek untuk membantu murid baharu menyesuaikan diri di sekolah. Terangkan perancangan kamu, pembahagian tugas dan sebab projek itu boleh membantu mereka.','min_words':100,'plannedLevel':2,'constructFamily':'leadership_initiative','levelSignal':2,'rubric_focus':['perancangan','kepimpinan','sebab','kesan','bahasa']},{'id':'C02','title':'Masalah kebersihan sekolah','prompt':'Sekolah kamu menghadapi masalah sampah selepas waktu rehat. Cadangkan satu pelan yang boleh dilakukan oleh murid dan pihak sekolah untuk mengurangkan masalah tersebut. Huraikan sebab dan kesannya.','min_words':100,'plannedLevel':2,'constructFamily':'problem_solving','levelSignal':2,'rubric_focus':['masalah','cadangan','langkah','sebab','kesan','bahasa']},{'id':'C03','title':'Belajar daripada kegagalan','prompt':'Ceritakan satu situasi apabila kamu gagal mencapai sesuatu yang kamu sasarkan. Terangkan bagaimana kamu bertindak selepas itu dan apakah perkara yang kamu pelajari daripada pengalaman tersebut.','min_words':100,'plannedLevel':2,'constructFamily':'reflection_resilience','levelSignal':2,'rubric_focus':['situasi','tindakan','refleksi','pengajaran','bahasa']}]
out={'set':2,'questions':qs,'writing':writing,'difficulty':2,'rebuildVersion':'V45.9_SET02_PRODUCTION','source':'generated_from_zero_v45.9','legacy_content_used':False,'structure':{'A':30,'B':70,'C':3},'qa':{'count':103,'unique_ids':True,'status':'BUILT_FROM_ZERO','cross_set_policy':'NEW_CONTEXTS_AND_NEW_STEMS'}}
os.makedirs(os.path.dirname(OUT),exist_ok=True)
json.dump(out,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
assert len(qs)==100 and len({x['id'] for x in qs})==100
assert sum(x['section']=='BAHAGIAN A' for x in qs)==30 and sum(x['section']=='BAHAGIAN B' for x in qs)==70
assert len(writing)==3
print('PASS SET02 A30 B70 C3')
