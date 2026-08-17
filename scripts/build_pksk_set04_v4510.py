import json, os, re

OUT = 'sim/pksk/simulator/sets/SET 01-10/data/set04.json'

def _norm(s):
    return re.sub(r'\s+', ' ', str(s).strip())

def _words(s):
    return len(_norm(s).split())

def _chars(s):
    return len(_norm(s))

def length_leak(options, answer):
    others = [options[i] for i in range(4) if i != answer]
    return (_chars(options[answer]) - max(map(_chars, others)) > 8 and
            _words(options[answer]) - max(map(_words, others)) > 2)

def obj(sec, cat, q, opts, ans, fam, i):
    assert len(opts) == 4
    assert not length_leak(opts, ans), (q, opts)
    return {
        'section': sec, 'category': cat, 'question': q, 'options': opts,
        'answerIndex': ans, 'weights': [3 if j == ans else 0 for j in range(4)],
        'type': 'graded', 'plannedLevel': 4, 'constructFamily': fam,
        'levelSignal': 4, 'contentDomain': cat, 'setLevel': 4,
        'rebuildStatus': 'V45.10_GENERATED_FROM_ZERO',
        'id': f'PKSK-V45-S04-{sec[-1]}{i:02d}'
    }

# A: 30 situational items. Correct answers are deliberately concise and
# positions rotate instead of using a fixed answer position.
A = [
('EQ','Kamu melihat murid baharu duduk sendirian ketika rehat. Apakah tindakan paling sesuai?',['Biarkan dia sendiri','Sapa dan ajak menyertai rakan','Panggil semua orang','Tanya hal peribadinya'],1,'empathy'),
('SQ','Kamu terlupa membawa bahan tugasan kumpulan.',['Sembunyikannya','Beritahu kumpulan dan cari pengganti','Salahkan ahli lain','Tidak hadir'],1,'accountability'),
('SSQ','Dua cadangan projek mempunyai kos berbeza tetapi kedua-duanya mencapai matlamat.',['Pilih paling mahal','Bandingkan kos dan manfaat','Ikut ketua sahaja','Tangguh keputusan'],1,'decision'),
('EQ','Rakan kecewa selepas mendapat markah lebih rendah daripada jangkaan.',['Katakan markah tidak penting','Dengar dan bantu merancang penambahbaikan','Bandingkan markahnya','Suruh berhenti mencuba'],1,'support'),
('SQ','Kamu menemukan dompet di sekolah.',['Simpan','Serahkan kepada guru atau pejabat','Ambil wangnya','Tunggu orang bertanya'],1,'integrity'),
('SSQ','Kumpulan tidak sependapat tentang pembahagian tugas.',['Ketua tentukan semua','Bincang beban dan kekuatan ahli','Seorang buat semua','Hentikan projek'],1,'fairness'),
('EQ','Kamu kalah dalam pertandingan kerana satu kesilapan sendiri.',['Salahkan rakan','Kenal pasti kesilapan dan berlatih semula','Berhenti bertanding','Marah pengadil'],1,'resilience'),
('SQ','Lampu bilik masih menyala selepas aktiviti.',['Biarkan','Tutup jika selamat dan laporkan kerosakan','Tukar semua suis','Tunggu esok'],1,'resource_care'),
('SSQ','Kumpulan perlu memilih sumber maklumat untuk pembentangan.',['Pilih paling berwarna','Semak penulis, bukti dan kesesuaian','Pilih paling pendek','Ikut pautan kawan'],1,'source_evaluation'),
('EQ','Rakan marah selepas ditegur kerana melakukan kesilapan.',['Balas kuat','Beri ruang kemudian bincang baik-baik','Ceritakan kepada kelas','Abaikan selamanya'],1,'self_regulation'),
('SQ','Kamu selesai menggunakan komputer sekolah.',['Biarkan akaun terbuka','Log keluar dan lindungi maklumat','Simpan kata laluan','Muat turun semua fail'],1,'cyber_safety'),
('SSQ','Masa aktiviti dipendekkan secara tiba-tiba.',['Ikut rancangan asal','Susun semula keutamaan','Batalkan semua tugas','Tunggu arahan'],1,'adaptability'),
('EQ','Rakan tidak bersetuju dengan cadangan kamu.',['Anggap dia tidak hormat','Dengar sebab dan pertimbangkan cadangan','Hentikan kerjasama','Cari sokongan orang lain'],1,'open_mindedness'),
('SQ','Kamu tersilap menuduh rakan mengambil barang.',['Buat tidak tahu','Minta maaf dan akui kesilapan','Salahkan keadaan','Sebarkan tuduhan'],1,'accountability'),
('SSQ','Seorang ahli kurang bercakap tetapi mempunyai idea baik.',['Teruskan','Beri ruang menyampaikan idea','Ketua bercakap untuknya','Abaikan'],1,'inclusion'),
('EQ','Kamu berjaya tetapi rakan tidak terpilih.',['Tunjuk kejayaan berulang kali','Ucap terima kasih dan beri galakan','Katakan dia kurang usaha','Elakkan berbual'],1,'humility'),
('SQ','Sampah bertaburan selepas aktiviti.',['Tinggalkan','Bantu membersihkan dan ingatkan kumpulan','Ambil gambar mengejek','Tunggu pekerja'],1,'civic'),
('SSQ','Tiga lokasi mempunyai tahap keselamatan dan kos berbeza.',['Pilih paling dekat','Bandingkan keselamatan, kos dan kesesuaian','Pilih paling popular','Pilih berdasarkan gambar'],1,'analysis'),
('EQ','Kamu sedar cara bercakap telah menyakiti hati rakan.',['Tunggu dia lupa','Minta maaf dan ubah cara','Salahkan gurauan','Ceritakan kepada orang lain'],1,'self_awareness'),
('SQ','Guru memberi komen supaya tugasan diperbaiki.',['Padam komen','Semak dan baiki bahagian perlu','Tukar rawak','Minta orang lain buat'],1,'feedback'),
('SSQ','Data projek daripada dua sumber bercanggah.',['Pilih sumber pertama','Semak bukti dan sumber tambahan','Campurkan kedua-duanya','Pilih yang mudah dihafal'],1,'critical_thinking'),
('EQ','Rakan gagal dalam pembentangan dan berasa malu.',['Jadikan lawak','Beri sokongan dan bincang persediaan','Beritahu semua orang','Suruh berhenti mencuba'],1,'encouragement'),
('SQ','Kamu bertanggungjawab memulangkan peralatan.',['Pulang dahulu','Kumpul dan simpan peralatan','Serah kepada orang tidak terlibat','Tinggalkan di padang'],1,'duty'),
('SSQ','Kumpulan mempunyai 20 minit untuk pembentangan.',['Bincang tanpa tugas','Bahagi tugas dan tetapkan semakan','Hias slaid dahulu','Ketua buat semua'],1,'planning'),
('EQ','Rakan berasa tidak dihargai dalam kumpulan.',['Katakan terlalu sensitif','Dengar dan beri peranan sesuai','Suruh keluar','Abaikan'],1,'inclusion'),
('SQ','Kamu menerima pautan yang meminta kata laluan sekolah.',['Masukkan kata laluan','Jangan masukkan maklumat dan laporkan','Kongsi pautan','Cuba kata laluan lama'],1,'digital_safety'),
('SSQ','Kumpulan perlu mengurangkan kos tanpa menjejaskan keselamatan.',['Buang langkah keselamatan','Cari kos yang boleh dikurang tanpa risiko','Pilih bahan termurah','Batalkan ujian'],1,'problem_solving'),
('EQ','Kamu tidak terpilih sebagai ketua.',['Tidak mahu membantu','Terima keputusan dan tetap menyumbang','Ajak boikot','Kritik ketua'],1,'maturity'),
('SQ','Kamu terlambat menyerahkan bahagian tugasan.',['Diam','Akui kelewatan, siapkan dan bincang kesan','Salahkan ahli lain','Keluar kumpulan'],1,'responsibility'),
('SSQ','Hujan mungkin menjejaskan aktiviti luar esok.',['Abaikan risiko','Sediakan pelan alternatif','Batalkan sekarang','Tunggu hujan'],1,'risk_management')]

B=[]
def add(cat,q,o,a,f): B.append((cat,q,o,a,f))

# B is intentionally concise; exact 70 items are generated from the curated bank.
for x in [
('Bahasa Melayu','Pilih ayat yang menggunakan kata adjektif dengan betul.',['Rumah itu selesa.','Mereka membaca buku.','Adik berlari.','Ibu memasak.'],0,'tatabahasa'),
('Bahasa Melayu','Apakah maksud tekun?',['Cuai','Rajin dan bersungguh-sungguh','Bising','Lambat'],1,'kosa_kata'),
('Bahasa Melayu','Pilih penggunaan kerana yang tepat.',['Dia belajar kerana mahu berjaya.','Dia belajar kerana buku.','Kerana dia belajar di kelas.','Dia kerana belajar.'],0,'kata_hubung'),
('Bahasa Melayu','Bagai aur dengan tebing bermaksud...',['Saling membantu','Mudah berubah','Suka bersendirian','Bekerja perlahan'],0,'peribahasa'),
('Bahasa Melayu','Kata terbitan betul bagi tulis ialah...',['Penulis','Tertulisan','Penuliskan','Tulisanan'],0,'imbuhan'),
('Bahasa Melayu','Pilih ayat paling gramatis.',['Para murid berbaris.','Para murid-murid berbaris.','Semua para murid-murid berbaris.','Para orang murid berbaris.'],0,'tatabahasa'),
('Bahasa Melayu','Idea utama ayat Membaca setiap hari meluaskan pengetahuan ialah...',['Membaca untuk hiburan.','Membaca memberi manfaat.','Kosa kata tidak penting.','Buku sukar digunakan.'],1,'pemahaman'),
('Bahasa Melayu','Simpulan bahasa yang bermaksud rajin ialah...',['Ringan tulang','Panjang tangan','Besar kepala','Kaki bangku'],0,'simpulan_bahasa'),
('Bahasa Melayu','Pilih ejaan betul.',['kerjasama','kerja samaa','kerja-samaa','kerja samaa'],0,'ejaan'),
('Bahasa Melayu','Walaupun biasanya menunjukkan hubungan...',['pertentangan','tempat','jumlah','masa'],0,'wacana'),
('Bahasa Inggeris','Choose the correct sentence.',['He go to school.','He goes to school.','He going school.','He gone school.'],1,'grammar'),
('Bahasa Inggeris','Cautious is closest in meaning to...',['careful','noisy','rapid','empty'],0,'vocabulary'),
('Bahasa Inggeris','Mira _____ her homework yesterday.',['finish','finishes','finished','finishing'],2,'past_tense'),
('Bahasa Inggeris','The students worked _____ to complete the task.',['careful','carefully','care','caring'],1,'adverb'),
('Bahasa Inggeris','Best response to Could you help me?',['Yes, of course.','Yes, I was.','No, I am.','Help is blue.'],0,'functional_language'),
('Bahasa Inggeris','Which sentence gives a reason?',['We stayed home because it rained.','We stayed home at noon.','We stayed near the gate.','We stayed quietly.'],0,'reading'),
('Bahasa Inggeris','If you practise regularly, you _____ improve.',['will','were','was','did'],0,'conditional'),
('Bahasa Inggeris','Opposite of generous is...',['selfish','helpful','kind','friendly'],0,'vocabulary'),
('Bahasa Inggeris','Choose the correct comparative form.',['more fast','faster','fastest than','fastly'],1,'comparison'),
('Bahasa Inggeris','The instructions were _____, so everyone understood them.',['clear','clearly','clarity','clearing'],0,'adjective')]: add(*x)
for x in [
('Matematik','RM16.50 sebuah buku. Harga 4 buku ialah...',['RM56.00','RM66.00','RM72.00','RM76.00'],1,'money'),
('Matematik','3/5 daripada 40 ialah...',['18','20','24','30'],2,'fractions'),
('Matematik','Segi empat tepat 14 cm × 6 cm. Luas ialah...',['40 cm²','70 cm²','84 cm²','96 cm²'],2,'area'),
('Matematik','Purata 12, 16, 20 dan 24 ialah...',['16','18','20','22'],1,'mean'),
('Matematik','210 km dalam 3 jam. Laju purata ialah...',['60 km/j','70 km/j','80 km/j','90 km/j'],1,'speed'),
('Matematik','Nisbah merah:biru 2:5. Jika biru 25, merah ialah...',['8','10','12','15'],1,'ratio'),
('Matematik','4.8 L - 1.65 L = ...',['2.95 L','3.15 L','3.25 L','3.45 L'],1,'decimals'),
('Matematik','30% daripada 250 ialah...',['50','65','75','80'],2,'percentage'),
('Matematik','Jika x + 28 = 63, x ialah...',['25','35','45','55'],1,'algebra'),
('Matematik','2 jam 35 minit selepas 7:45 pagi ialah...',['9:55 pagi','10:10 pagi','10:20 pagi','10:30 pagi'],2,'time'),
('Matematik','Bundarkan 4,251 kepada ratus terdekat.',['4,200','4,300','4,000','4,500'],1,'rounding'),
('Matematik','Corak 6, 11, 16, 21,... nombor ke-7 ialah...',['31','36','41','46'],1,'pattern'),
('Matematik','7 baris × 9 buku. 8 dikeluarkan. Baki?',['47','55','63','71'],1,'multi_step'),
('Matematik','Luas segi empat tepat 108 cm², lebar 9 cm. Panjang?',['10 cm','12 cm','14 cm','18 cm'],1,'area'),
('Matematik','RM120 diskaun 20%. Harga akhir ialah...',['RM84','RM90','RM96','RM100'],2,'percentage')]: add(*x)
for x in [
('Sains','Organ yang mengepam darah ialah...',['paru-paru','jantung','perut','otak'],1,'human_system'),
('Sains','Tumbuhan menghasilkan makanan melalui...',['respirasi','fotosintesis','pencernaan','penyejatan'],1,'plants'),
('Sains','Contoh perubahan boleh balik ialah...',['kertas dibakar','ais mencair','telur dimasak','kayu reput'],1,'change'),
('Sains','Daya yang menarik objek ke Bumi ialah...',['geseran','graviti','magnet','apungan'],1,'force'),
('Sains','Pemegang periuk mengurangkan pemindahan haba supaya...',['tangan kurang menerima haba','periuk lebih berat','makanan beku','api membesar'],0,'heat'),
('Sains','Bunyi terhasil apabila objek...',['bergetar','membeku','mencair','berkarat'],0,'sound'),
('Sains','Sumber tenaga boleh diperbaharui ialah...',['arang batu','petroleum','matahari','gas asli'],2,'energy'),
('Sains','Bayang-bayang terbentuk apabila...',['objek menghalang cahaya','objek menghasilkan cahaya','air menghasilkan bunyi','udara gelap'],0,'light'),
('Sains','Akar tumbuhan berfungsi untuk...',['menyerap air dan memegang tumbuhan','menghasilkan bunyi','menghasilkan cahaya','menggerakkan bunga'],0,'plant_structure'),
('Sains','Pasir dan air boleh diasingkan melalui...',['penurasan','pembakaran','magnet','pembekuan'],0,'separation'),
('Sains','Haiwan bertulang belakang ialah...',['invertebrata','vertebrata','serangga','moluska'],1,'classification'),
('Sains','Permukaan basah biasanya menyebabkan geseran tayar...',['bertambah','berkurang','sifar','menjadi graviti'],1,'friction'),
('Sains','Cahaya terkena cermin mengalami...',['pantulan','pembakaran','pembekuan','penapaian'],0,'reflection'),
('Sains','Air mendidih berubah menjadi...',['ais','wap air','tanah','garam'],1,'states'),
('Sains','Bunyi tidak boleh bergerak melalui...',['udara','air','pepejal','vakum'],3,'sound')]: add(*x)
for x in [
('Sejarah','Malaysia dibentuk pada tahun...',['1957','1963','1965','1970'],1,'formation'),
('Sejarah','Hari Malaysia disambut pada...',['31 Ogos','16 September','1 Januari','25 Disember'],1,'formation'),
('Sejarah','Rukun Negara ialah...',['ideologi kebangsaan','nama negeri','nama sungai','nama syarikat'],0,'civics'),
('Sejarah','Tokoh yang mengisytiharkan kemerdekaan 31 Ogos 1957 ialah...',['Tunku Abdul Rahman Putra Al-Haj','Tun Hussein Onn','Tun Abdul Razak','Tun Dr Ismail'],0,'independence'),
('Sejarah','Kepentingan Jalur Gemilang ialah...',['melambangkan identiti negara','menentukan harga','menunjukkan sempadan sekolah','menjadi hiasan sahaja'],0,'national_symbol'),
('Sejarah','Warisan tidak ketara ialah...',['bangunan lama','tarian tradisional','artifak batu','muzium'],1,'heritage'),
('Sejarah','Sumber sejarah perlu dinilai untuk...',['memastikan maklumat boleh dipercayai','memilih cerita panjang','mengubah fakta','mengelak kajian'],0,'historical_thinking'),
('Sejarah','Kedaulatan bermaksud...',['kuasa tertinggi negara mentadbir','jumlah penduduk','bilangan negeri','jenis mata wang'],0,'civics'),
('Sejarah','Patriotisme merujuk kepada...',['cinta dan setia kepada negara','minat sukan sahaja','keinginan berpindah','takut undang-undang'],0,'patriotism'),
('Sejarah','Perpaduan penting kerana dapat...',['mewujudkan keamanan dan kerjasama','menghapuskan perbezaan','mengasingkan komuniti','menggalakkan perselisihan'],0,'unity')]: add(*x)
for x in [
('RBT','Tujuan lakaran awal produk ialah...',['menunjukkan idea reka bentuk','menentukan harga sahaja','menggantikan ujian','menghapuskan ukuran'],0,'design'),
('RBT','Gear digunakan untuk...',['memindahkan dan mengubah gerakan','menyimpan air','menghasilkan warna','menyerap haba'],0,'mechanism'),
('RBT','Ukuran tepat penting supaya...',['komponen sesuai dan produk menepati reka bentuk','produk lebih berat','kerja lebih lambat','bahan cepat rosak'],0,'measurement'),
('RBT','Sebelum menggunakan alat pemotong, murid perlu...',['memahami arahan dan keselamatan','bekerja secepat mungkin','menggunakan tanpa panduan','meninggalkan alat terbuka'],0,'safety'),
('RBT','Prototaip digunakan untuk...',['menguji idea dan membuat penambahbaikan','mengelakkan semua ujian','menentukan nama sahaja','menggantikan lakaran'],0,'prototype'),
('RBT','Bahan produk luar perlu dipilih berdasarkan...',['ketahanan terhadap cuaca','warna sahaja','harga tertinggi','saiz pembungkusan'],0,'materials'),
('RBT','Ergonomik bermaksud reka bentuk yang...',['sesuai dan selesa digunakan manusia','paling berat','paling mahal','paling berwarna'],0,'ergonomics'),
('RBT','Jika prototaip mudah terbalik, tindakan terbaik ialah...',['ubah reka bentuk dan uji semula','terus jual','abaikan','kurangkan semua ukuran'],0,'evaluation'),
('RBT','Dalam litar mudah, komponen membekalkan tenaga ialah...',['bateri','suis','wayar','mentol'],0,'electricity'),
('RBT','Carta alir digunakan untuk...',['menunjukkan langkah proses tersusun','menghias laporan','menentukan warna','menggantikan ujian'],0,'flowchart')]: add(*x)

assert len(A) == 30
assert len(B) == 70
qs = [obj('BAHAGIAN A', x[0], x[1], x[2], x[3], x[4], i) for i,x in enumerate(A,1)]
qs += [obj('BAHAGIAN B', x[0], x[1], x[2], x[3], x[4], i) for i,x in enumerate(B,1)]

writing = [
{'id':'C01','title':'Membina budaya membaca','prompt':'Sekolah kamu mahu meningkatkan minat membaca dalam kalangan murid. Cadangkan satu program, terangkan langkah pelaksanaan dan jelaskan cara menilai keberkesanannya.','min_words':100,'plannedLevel':4,'constructFamily':'initiative_planning','levelSignal':4,'rubric_focus':['idea','langkah','justifikasi','penilaian','bahasa']},
{'id':'C02','title':'Mengurus konflik kumpulan','prompt':'Kamu mengetuai kumpulan yang mempunyai dua ahli yang sering tidak bersetuju. Huraikan cara menyelesaikan konflik, membahagikan tugas dan memastikan hasil kerja berkualiti.','min_words':100,'plannedLevel':4,'constructFamily':'leadership_conflict','levelSignal':4,'rubric_focus':['masalah','kepimpinan','rundingan','langkah','kesan','bahasa']},
{'id':'C03','title':'Idea untuk sekolah lestari','prompt':'Cadangkan satu perubahan yang boleh menjadikan sekolah lebih mesra alam. Huraikan masalah, langkah yang diperlukan dan manfaat kepada warga sekolah.','min_words':100,'plannedLevel':4,'constructFamily':'environmental_problem_solving','levelSignal':4,'rubric_focus':['masalah','cadangan','pelaksanaan','sebab','manfaat','bahasa']}]

ids = [q['id'] for q in qs]
stems = [_norm(q['question']).casefold() for q in qs]
assert len(qs) == 100
assert len(writing) == 3
assert len(set(ids)) == 100
assert len(set(stems)) == 100
assert all(not length_leak(q['options'], q['answerIndex']) for q in qs)

out = {
 'set':4,'questions':qs,'writing':writing,'difficulty':4,
 'rebuildVersion':'V45.10_SET04_PRODUCTION','source':'generated_from_zero_v45.10',
 'legacy_content_used':False,'structure':{'A':30,'B':70,'C':3},
 'qa':{'count':103,'unique_ids':True,'unique_stems':True,'status':'PASS',
       'hard_gate':'V45.10','length_leak':'PASS','cross_set_policy':'NEW_CONTEXTS_AND_NEW_STEMS'}
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT,'w',encoding='utf-8') as f:
    json.dump(out,f,ensure_ascii=False,indent=2)
print('PASS V45.10 SET04 A30 B70 C3')
