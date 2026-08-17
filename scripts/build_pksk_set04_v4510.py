import json,os,re
OUT='sim/pksk/simulator/sets/SET 01-10/data/set04.json'
def obj(sec,cat,q,opts,ans,fam,i):
    # V45.10 hard gate: no obvious longest correct answer.
    lens=[len(re.sub(r'\s+',' ',x.strip())) for x in opts]; wl=[len(x.split()) for x in opts]
    other_c=max(lens[j] for j in range(4) if j!=ans); other_w=max(wl[j] for j in range(4) if j!=ans)
    assert not (lens[ans]>other_c+8 and wl[ans]>other_w+2), (q,opts)
    return {'section':sec,'category':cat,'question':q,'options':opts,'answer':ans,'type':'graded','plannedLevel':4,'constructFamily':fam,'levelSignal':4,'contentDomain':cat,'setLevel':4,'rebuildStatus':'V45.10_GENERATED_FROM_ZERO','id':f'PKSK-V45-S04-{sec[-1]}{i:02d}'}
A=[
('EQ','Kamu melihat murid baharu duduk sendirian ketika waktu rehat. Apakah tindakan paling sesuai?',['Biarkan dia sendiri sepanjang masa','Sapa dengan mesra dan beri peluang menyertai rakan','Panggil semua orang supaya melihatnya','Tanya hal peribadinya di hadapan ramai'],1,'empathy'),
('SQ','Kamu sedar kamu terlupa membawa bahan tugasan kumpulan.',['Sembunyikan perkara itu','Beritahu kumpulan dan cari pengganti yang sesuai','Salahkan ahli lain','Tidak hadir ketika tugasan'],1,'accountability'),
('SSQ','Dua cadangan projek mempunyai kos yang berbeza tetapi kedua-duanya boleh mencapai matlamat.',['Pilih yang paling mahal','Bandingkan kos, manfaat dan keperluan sebelum memilih','Pilih cadangan ketua sahaja','Tangguhkan keputusan'],1,'decision'),
('EQ','Rakan kecewa selepas mendapat markah lebih rendah daripada jangkaan.',['Katakan markah tidak penting','Dengar perasaannya dan bantu merancang penambahbaikan','Bandingkan markahnya dengan orang lain','Suruh dia berhenti mencuba'],1,'support'),
('SQ','Kamu menemukan dompet di kawasan sekolah.',['Simpan kerana kamu yang menjumpainya','Serahkan kepada guru atau pejabat sekolah','Ambil wang dan tinggalkan dompet','Tunggu sehingga ada orang bertanya'],1,'integrity'),
('SSQ','Kumpulan kamu tidak sependapat tentang pembahagian tugas.',['Ketua menentukan semuanya','Bincang beban kerja dan kekuatan setiap ahli','Biarkan seorang ahli mengambil semua tugas','Hentikan projek'],1,'fairness'),
('EQ','Kamu kalah dalam pertandingan kerana satu kesilapan sendiri.',['Salahkan rakan','Kenal pasti kesilapan dan gunakan pengalaman itu untuk berlatih','Berhenti menyertai pertandingan','Marah kepada pengadil'],1,'resilience'),
('SQ','Selepas aktiviti, lampu bilik masih menyala walaupun tiada orang.',['Biarkan sahaja','Tutup jika selamat dan laporkan kerosakan jika ada','Tukar semua suis','Tunggu esok'],1,'resource_care'),
('SSQ','Kumpulan perlu memilih sumber maklumat untuk pembentangan.',['Pilih sumber paling berwarna','Semak penulis, bukti dan kesesuaian maklumat','Pilih sumber paling pendek','Pilih pautan yang dihantar kawan'],1,'source_evaluation'),
('EQ','Rakan kamu marah selepas ditegur kerana melakukan kesilapan.',['Balas dengan suara lebih kuat','Beri ruang untuk bertenang kemudian bincang dengan baik','Ceritakan kemarahannya kepada kelas','Abaikan masalah selamanya'],1,'self_regulation'),
('SQ','Kamu menggunakan komputer sekolah dan selesai bekerja.',['Biarkan akaun terbuka','Log keluar dan pastikan maklumat peribadi tidak terdedah','Simpan kata laluan pada komputer','Muat turun semua fail'],1,'cyber_safety'),
('SSQ','Masa aktiviti dipendekkan secara tiba-tiba.',['Ikut rancangan asal tanpa berubah','Susun semula keutamaan berdasarkan masa yang tinggal','Batalkan semua tugas','Tunggu arahan tanpa membuat persediaan'],1,'adaptability'),
('EQ','Rakan tidak bersetuju dengan cadangan kamu.',['Anggap dia tidak menghormati kamu','Dengar sebabnya dan pertimbangkan cadangan itu','Hentikan kerjasama','Ajak orang lain menyokong kamu'],1,'open_mindedness'),
('SQ','Kamu tersilap menuduh rakan mengambil barang kamu.',['Buat tidak tahu','Minta maaf dan jelaskan bahawa kamu tersilap','Salahkan keadaan','Sebarkan tuduhan kepada rakan lain'],1,'accountability'),
('SSQ','Satu ahli kumpulan kurang bercakap tetapi mempunyai idea yang baik.',['Teruskan tanpa bertanya','Beri ruang untuk dia menyampaikan pandangan','Minta ketua bercakap bagi pihaknya','Abaikan kerana dia pendiam'],1,'inclusion'),
('EQ','Kamu berjaya dalam pertandingan tetapi rakan kamu tidak terpilih.',['Tunjukkan kejayaan berulang kali','Ucapkan terima kasih atas sokongan dan beri galakan','Katakan dia kurang berusaha','Elakkan dia daripada berbual'],1,'humility'),
('SQ','Kamu melihat sampah bertaburan selepas aktiviti.',['Tinggalkan kerana bukan sampah kamu','Bantu membersihkan dan ingatkan kumpulan tentang tanggungjawab','Ambil gambar untuk mengejek','Tunggu pekerja sekolah'],1,'civic'),
('SSQ','Tiga pilihan lokasi mempunyai tahap keselamatan dan kos berbeza.',['Pilih yang paling dekat','Bandingkan keselamatan, kos dan kesesuaian aktiviti','Pilih yang paling popular','Pilih berdasarkan gambar'],1,'analysis'),
('EQ','Kamu sedar cara kamu bercakap telah menyakiti hati rakan.',['Tunggu dia melupakan perkara itu','Minta maaf dan ubah cara berkomunikasi','Salahkan gurauan','Ceritakan kepada orang lain'],1,'self_awareness'),
('SQ','Guru memberi komen supaya tugasan kamu diperbaiki.',['Padam komen itu','Semak komen dan baiki bahagian yang perlu','Tukar jawapan secara rawak','Minta orang lain buat semuanya'],1,'feedback'),
('SSQ','Data projek daripada dua sumber bercanggah.',['Pilih sumber pertama','Semak bukti dan sumber tambahan sebelum membuat kesimpulan','Campurkan kedua-duanya','Pilih maklumat paling mudah dihafal'],1,'critical_thinking'),
('EQ','Seorang rakan gagal dalam pembentangan dan berasa malu.',['Jadikan kesilapannya bahan lawak','Beri sokongan dan bincang cara membuat persediaan lebih baik','Beritahu semua orang tentang kegagalannya','Suruh dia tidak mencuba lagi'],1,'encouragement'),
('SQ','Kamu bertanggungjawab memulangkan peralatan selepas latihan.',['Pulang dahulu','Pastikan peralatan dikumpul dan disimpan sebelum pulang','Serahkan kepada orang yang tidak terlibat','Tinggalkan di padang'],1,'duty'),
('SSQ','Kumpulan mempunyai 20 minit untuk menyiapkan pembentangan.',['Bincang tanpa pembahagian tugas','Bahagi tugas dan tetapkan masa semakan','Hias slaid dahulu','Biarkan ketua buat semua'],1,'planning'),
('EQ','Rakan kamu berasa tidak dihargai dalam kumpulan.',['Katakan dia terlalu sensitif','Dengar sebabnya dan beri peranan yang sesuai','Suruh dia keluar kumpulan','Abaikan kerana projek hampir siap'],1,'inclusion'),
('SQ','Kamu menerima pautan yang meminta kata laluan akaun sekolah.',['Masukkan kata laluan','Jangan masukkan maklumat dan laporkan pautan mencurigakan','Kongsi pautan kepada rakan','Cuba kata laluan lama'],1,'digital_safety'),
('SSQ','Kumpulan perlu mengurangkan kos projek tanpa menjejaskan keselamatan.',['Buang semua langkah keselamatan','Kenal pasti kos yang boleh dikurangkan tanpa menjejaskan fungsi','Pilih bahan paling murah tanpa semakan','Batalkan ujian'],1,'problem_solving'),
('EQ','Kamu tidak terpilih sebagai ketua walaupun berharap untuk jawatan itu.',['Tidak mahu membantu kumpulan','Terima keputusan dan tetap menyumbang dengan baik','Ajak rakan memboikot','Kritik ketua di hadapan semua'],1,'maturity'),
('SQ','Kamu terlambat menyerahkan bahagian tugasan.',['Diam sahaja','Akui kelewatan, siapkan dan bincang kesannya','Salahkan ahli lain','Keluar daripada kumpulan'],1,'responsibility'),
('SSQ','Hujan mungkin menjejaskan aktiviti luar esok.',['Abaikan risiko','Sediakan pelan alternatif yang masih mencapai tujuan','Batalkan aktiviti sekarang','Tunggu sehingga hujan turun'],1,'risk_management')]
# B tuples: category, question, four options, answer, family
B=[]
def add(cat,q,o,a,f): B.append((cat,q,o,a,f))
for x in [
('Bahasa Melayu','Pilih ayat yang menggunakan kata adjektif dengan betul.',['Rumah itu sangat selesa.','Mereka membaca buku.','Adik berlari ke padang.','Ibu memasak nasi.'],0,'tatabahasa'),
('Bahasa Melayu','Apakah maksud perkataan tekun?',['Cuai','Rajin dan bersungguh-sungguh','Bising','Lambat'],1,'kosa_kata'),
('Bahasa Melayu','Pilih ayat yang menggunakan kata hubung kerana dengan tepat.',['Dia belajar kerana mahu berjaya.','Dia belajar tetapi kerana buku.','Dia kerana belajar di kelas.','Kerana dia belajar dan.'],0,'kata_hubung'),
('Bahasa Melayu','Peribahasa bagai aur dengan tebing bermaksud...',['Saling membantu','Mudah berubah','Suka bersendirian','Bekerja perlahan'],0,'peribahasa'),
('Bahasa Melayu','Kata terbitan yang betul bagi kata dasar tulis ialah...',['Penulis','Tertulisan','Penuliskan','Tulisanan'],0,'imbuhan'),
('Bahasa Melayu','Pilih ayat yang paling gramatis.',['Para murid sedang berbaris.','Para murid-murid sedang berbaris.','Semua para murid-murid berbaris.','Para orang murid berbaris.'],0,'tatabahasa'),
('Bahasa Melayu','Apakah idea utama ayat Membaca setiap hari dapat meluaskan pengetahuan dan kosa kata?',['Membaca hanya untuk hiburan.','Membaca memberikan beberapa manfaat.','Kosa kata tidak penting.','Buku sukar digunakan.'],1,'pemahaman'),
('Bahasa Melayu','Simpulan bahasa yang bermaksud sangat rajin ialah...',['Ringan tulang','Panjang tangan','Besar kepala','Kaki bangku'],0,'simpulan_bahasa'),
('Bahasa Melayu','Pilih ejaan yang betul.',['kerjasama','kerja samaa','kerja-samaa','kerja samaa'],0,'ejaan'),
('Bahasa Melayu','Perkataan walaupun biasanya menunjukkan hubungan...',['pertentangan','tempat','jumlah','masa'],0,'wacana'),
('Bahasa Inggeris','Choose the correct sentence.',['He go to school.','He goes to school.','He going school.','He gone school.'],1,'grammar'),
('Bahasa Inggeris','The word cautious is closest in meaning to...',['careful','noisy','rapid','empty'],0,'vocabulary'),
('Bahasa Inggeris','Mira _____ her homework yesterday.',['finish','finishes','finished','finishing'],2,'past_tense'),
('Bahasa Inggeris','The students worked _____ to complete the task.',['careful','carefully','care','caring'],1,'adverb'),
('Bahasa Inggeris','Choose the best response to Could you help me?',['Yes, of course.','Yes, I was.','No, I am.','Help is blue.'],0,'functional_language'),
('Bahasa Inggeris','Which sentence gives a reason?',['We stayed home because it rained.','We stayed home at noon.','We stayed home near the gate.','We stayed home quietly.'],0,'reading'),
('Bahasa Inggeris','If you practise regularly, you _____ improve.',['will','were','was','did'],0,'conditional'),
('Bahasa Inggeris','The opposite of generous is...',['selfish','helpful','kind','friendly'],0,'vocabulary'),
('Bahasa Inggeris','Choose the correct comparative form.',['more fast','faster','fastest than','fastly'],1,'comparison'),
('Bahasa Inggeris','The instructions were _____, so everyone understood them.',['clear','clearly','clarity','clearing'],0,'adjective')]: add(*x)
for x in [
('Matematik','RM16.50 sebuah buku. Berapakah harga 4 buah buku?',['RM56.00','RM66.00','RM72.00','RM76.00'],1,'money'),
('Matematik','3/5 daripada 40 ialah...',['18','20','24','30'],2,'fractions'),
('Matematik','Segi empat tepat berukuran 14 cm × 6 cm. Luasnya ialah...',['40 cm²','70 cm²','84 cm²','96 cm²'],2,'area'),
('Matematik','Purata bagi 12, 16, 20 dan 24 ialah...',['16','18','20','22'],1,'mean'),
('Matematik','Sebuah kereta bergerak 210 km dalam 3 jam. Laju purata ialah...',['60 km/j','70 km/j','80 km/j','90 km/j'],1,'speed'),
('Matematik','Nisbah merah:biru ialah 2:5. Jika biru 25, merah ialah...',['8','10','12','15'],1,'ratio'),
('Matematik','4.8 L - 1.65 L = ...',['2.95 L','3.15 L','3.25 L','3.45 L'],1,'decimals'),
('Matematik','30% daripada 250 ialah...',['50','65','75','80'],2,'percentage'),
('Matematik','Jika x + 28 = 63, nilai x ialah...',['25','35','45','55'],1,'algebra'),
('Matematik','2 jam 35 minit selepas 7:45 pagi ialah...',['9:55 pagi','10:10 pagi','10:20 pagi','10:30 pagi'],2,'time'),
('Matematik','Nombor manakah dibundarkan kepada ratus terdekat menjadi 4,300?',['4,249','4,251','4,349','4,351'],1,'rounding'),
('Matematik','Corak 6, 11, 16, 21,... nombor ke-7 ialah...',['31','36','41','46'],1,'pattern'),
('Matematik','Sebuah rak mempunyai 7 baris dengan 9 buku. 8 buku dikeluarkan. Berapa tinggal?',['47','55','63','71'],1,'multi_step'),
('Matematik','Segi empat tepat mempunyai luas 108 cm² dan lebar 9 cm. Panjangnya ialah...',['10 cm','12 cm','14 cm','18 cm'],1,'area'),
('Matematik','Harga RM120 diberi diskaun 20%. Harga selepas diskaun ialah...',['RM84','RM90','RM96','RM100'],2,'percentage')]: add(*x)
for x in [
('Sains','Organ utama yang mengepam darah ialah...',['paru-paru','jantung','perut','otak'],1,'human_system'),
('Sains','Tumbuhan menghasilkan makanan melalui proses...',['respirasi','fotosintesis','pencernaan','penyejatan'],1,'plants'),
('Sains','Contoh perubahan boleh balik ialah...',['kertas dibakar','ais mencair','telur dimasak','kayu reput'],1,'change'),
('Sains','Daya yang menarik objek ke arah Bumi ialah...',['geseran','graviti','magnet','apungan'],1,'force'),
('Sains','Pemegang periuk kurang mengalirkan haba supaya...',['tangan kurang menerima haba','periuk lebih berat','makanan menjadi beku','api menjadi besar'],0,'heat'),
('Sains','Bunyi terhasil apabila objek...',['bergetar','membeku','mencair','berkarat'],0,'sound'),
('Sains','Sumber tenaga boleh diperbaharui ialah...',['arang batu','petroleum','matahari','gas asli'],2,'energy'),
('Sains','Bayang-bayang terbentuk apabila...',['objek menghalang cahaya','objek menghasilkan cahaya','air menghasilkan bunyi','udara menjadi gelap'],0,'light'),
('Sains','Akar tumbuhan berfungsi terutamanya untuk...',['menyerap air dan memegang tumbuhan','menghasilkan bunyi','menghasilkan cahaya','menggerakkan bunga'],0,'plant_structure'),
('Sains','Pasir dan air boleh diasingkan melalui...',['penurasan','pembakaran','magnet','pembekuan'],0,'separation'),
('Sains','Haiwan yang mempunyai tulang belakang ialah...',['invertebrata','vertebrata','serangga','moluska'],1,'classification'),
('Sains','Permukaan basah biasanya menyebabkan geseran tayar...',['bertambah banyak','berkurang','menjadi sifar','menjadi graviti'],1,'friction'),
('Sains','Cahaya yang terkena cermin biasanya mengalami...',['pantulan','pembakaran','pembekuan','penapaian'],0,'reflection'),
('Sains','Air yang dipanaskan sehingga mendidih berubah menjadi...',['ais','wap air','tanah','garam'],1,'states'),
('Sains','Bunyi tidak boleh bergerak melalui...',['udara','air','pepejal','vakum'],3,'sound')]: add(*x)
for x in [
('Sejarah','Malaysia dibentuk pada tahun...',['1957','1963','1965','1970'],1,'formation'),
('Sejarah','Hari Malaysia disambut pada...',['31 Ogos','16 September','1 Januari','25 Disember'],1,'formation'),
('Sejarah','Rukun Negara ialah...',['ideologi kebangsaan Malaysia','nama negeri','nama sungai','nama syarikat'],0,'civics'),
('Sejarah','Siapakah tokoh yang mengisytiharkan kemerdekaan pada 31 Ogos 1957?',['Tunku Abdul Rahman Putra Al-Haj','Tun Hussein Onn','Tun Abdul Razak','Tun Dr Ismail'],0,'independence'),
('Sejarah','Apakah kepentingan Jalur Gemilang?',['Melambangkan identiti negara','Menentukan harga barang','Menunjukkan sempadan sekolah','Menjadi hiasan sahaja'],0,'national_symbol'),
('Sejarah','Warisan tidak ketara ialah...',['bangunan lama','tarian tradisional','artifak batu','muzium'],1,'heritage'),
('Sejarah','Mengapa sumber sejarah perlu dinilai?',['Untuk memastikan maklumat boleh dipercayai','Untuk memilih cerita paling panjang','Untuk mengubah fakta','Untuk mengelakkan kajian'],0,'historical_thinking'),
('Sejarah','Kedaulatan bermaksud...',['kuasa tertinggi negara untuk mentadbir','jumlah penduduk','bilangan negeri','jenis mata wang'],0,'civics'),
('Sejarah','Patriotisme merujuk kepada...',['cinta dan setia kepada negara','minat terhadap sukan sahaja','keinginan berpindah negara','takut kepada undang-undang'],0,'patriotism'),
('Sejarah','Perpaduan penting kerana dapat...',['mewujudkan keamanan dan kerjasama','menghapuskan semua perbezaan','mengasingkan komuniti','menggalakkan perselisihan'],0,'unity')]: add(*x)
for x in [
('RBT','Tujuan lakaran awal produk ialah...',['menunjukkan idea reka bentuk','menentukan harga sahaja','menggantikan ujian','menghapuskan ukuran'],0,'design'),
('RBT','Gear digunakan untuk...',['memindahkan dan mengubah gerakan','menyimpan air','menghasilkan warna','menyerap haba'],0,'mechanism'),
('RBT','Ukuran tepat penting supaya...',['komponen sesuai dan produk menepati reka bentuk','produk lebih berat','kerja lebih lambat','bahan cepat rosak'],0,'measurement'),
('RBT','Sebelum menggunakan alat pemotong, murid perlu...',['memahami arahan dan keselamatan','bekerja secepat mungkin','menggunakan tanpa panduan','meninggalkan alat terbuka'],0,'safety'),
('RBT','Prototaip digunakan untuk...',['menguji idea dan membuat penambahbaikan','mengelakkan semua ujian','menentukan nama sahaja','menggantikan lakaran'],0,'prototype'),
('RBT','Bahan untuk produk luar perlu dipilih berdasarkan...',['ketahanan terhadap cuaca','warna sahaja','harga tertinggi','saiz pembungkusan'],0,'materials'),
('RBT','Ergonomik bermaksud reka bentuk yang...',['sesuai dan selesa digunakan manusia','paling berat','paling mahal','paling berwarna'],0,'ergonomics'),
('RBT','Jika prototaip mudah terbalik, tindakan terbaik ialah...',['ubah reka bentuk dan uji semula','terus jual','abaikan','kurangkan semua ukuran'],0,'evaluation'),
('RBT','Dalam litar mudah, komponen yang membekalkan tenaga ialah...',['bateri','suis','wayar','mentol'],0,'electricity'),
('RBT','Carta alir digunakan untuk...',['menunjukkan langkah proses secara tersusun','menghias laporan','menentukan warna','menggantikan ujian'],0,'flowchart')]: add(*x)
assert len(B)==70
qs=[]
for i,x in enumerate(A,1): qs.append(obj('BAHAGIAN A',x[0],x[1],x[2],x[3],x[4],i))
for i,x in enumerate(B,1): qs.append(obj('BAHAGIAN B',x[0],x[1],x[2],x[3],x[4],i))
for q in qs: q.pop('answer')
for i,q in enumerate(qs):
    # scoring weights: keyed position was removed, infer from option content not needed by UI; store neutral score map with correct index metadata.
    pass
# Rebuild scoring key in metadata from source lists deterministically
for i,q in enumerate(qs):
    src=A[i] if i<30 else B[i-30]
    ans=src[3]
    q['answerIndex']=ans
    q['weights']=[3 if j==ans else 0 for j in range(4)]
writing=[
{'id':'C01','title':'Membina budaya membaca','prompt':'Sekolah kamu mahu meningkatkan minat membaca dalam kalangan murid. Cadangkan satu program, terangkan langkah pelaksanaan dan jelaskan bagaimana kamu akan menilai keberkesanannya.','min_words':100,'plannedLevel':4,'constructFamily':'initiative_planning','levelSignal':4,'rubric_focus':['idea','langkah','justifikasi','penilaian','bahasa']},
{'id':'C02','title':'Mengurus konflik kumpulan','prompt':'Kamu mengetuai kumpulan yang mempunyai dua ahli yang sering tidak bersetuju. Huraikan cara kamu menyelesaikan konflik, membahagikan tugas dan memastikan hasil kerja tetap berkualiti.','min_words':100,'plannedLevel':4,'constructFamily':'leadership_conflict','levelSignal':4,'rubric_focus':['masalah','kepimpinan','rundingan','langkah','kesan','bahasa']},
{'id':'C03','title':'Idea untuk sekolah lestari','prompt':'Cadangkan satu perubahan yang boleh menjadikan sekolah lebih mesra alam. Huraikan masalah yang hendak diselesaikan, langkah yang diperlukan dan manfaat kepada warga sekolah.','min_words':100,'plannedLevel':4,'constructFamily':'environmental_problem_solving','levelSignal':4,'rubric_focus':['masalah','cadangan','pelaksanaan','sebab','manfaat','bahasa']}]
out={'set':4,'questions':qs,'writing':writing,'difficulty':4,'rebuildVersion':'V45.10_SET04_PRODUCTION','source':'generated_from_zero_v45.10','legacy_content_used':False,'structure':{'A':30,'B':70,'C':3},'qa':{'count':103,'unique_ids':len({q['id'] for q in qs})==100,'status':'PASS','hard_gate':'V45.10','cross_set_policy':'NEW_CONTEXTS_AND_NEW_STEMS'}}
assert len(qs)==100 and len(writing)==3 and out['qa']['unique_ids']
os.makedirs(os.path.dirname(OUT),exist_ok=True)
json.dump(out,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('PASS',len(qs),len(writing))
