# REQOO PKSK V45.10 production generator
from __future__ import annotations
import json, os, re
from collections import Counter
ROOT='sim/pksk/simulator/sets/SET 01-10/data'
def n(x): return re.sub(r'\s+',' ',str(x).strip())
def leak(o,a):
    r=[len(n(x)) for i,x in enumerate(o) if i!=a]; w=[len(n(x).split()) for i,x in enumerate(o) if i!=a]
    return len(n(o[a]))-max(r)>8 and len(n(o[a]).split())-max(w)>2
def item(s,sec,cat,q,o,a,f,fmt='MCQ',i=0):
    o=[n(x) for x in o]; assert len(o)==4 and len(set(x.casefold() for x in o))==4 and not leak(o,a)
    return {'id':f'PKSK-V45-S{s:02d}-{sec[-1]}{i:02d}','section':sec,'category':cat,'format':fmt,'question':n(q),'options':o,'answerIndex':a,'weights':[3 if j==a else 0 for j in range(4)],'type':'graded','plannedLevel':4,'constructFamily':f,'levelSignal':4,'contentDomain':cat,'setLevel':4,'rebuildStatus':'V45.10_GENERATED_FROM_ZERO'}
A=[
('EQ','Apabila rakan kamu tidak bersetuju dengan idea kamu, apakah tindakan paling matang?',['Terus menolak pandangannya','Dengar alasan dan bandingkan kedua-dua idea','Ajak rakan lain menyokong kamu','Tamatkan perbincangan dengan segera'],'dialogue'),
('SQ','Kamu menyedari maklumat tugasan yang diberi kepada kumpulan mungkin tidak tepat. Apakah langkah terbaik?',['Terus gunakan maklumat itu','Semak sumber sebelum membuat keputusan','Padam maklumat tanpa semakan','Tunggu kumpulan lain membuat keputusan'],'verification'),
('SSQ','Kumpulan perlu memilih antara dua projek yang sama-sama baik. Apakah asas keputusan paling wajar?',['Pilih yang paling mudah sahaja','Bandingkan objektif, sumber, risiko dan manfaat','Ikut pilihan ahli yang paling lantang','Pilih berdasarkan warna pembentangan'],'decision'),
('EQ','Seorang rakan baharu membuat kesilapan ketika menyertai aktiviti. Apakah respons yang paling membantu?',['Ketawakan kesilapannya','Beri galakan dan tunjukkan cara yang betul','Biarkan dia berhenti','Beritahu semua rakan tentang kesilapan itu'],'empathy'),
('SQ','Kamu mendapati barang sekolah yang dipinjam rosak selepas digunakan. Apakah tindakan bertanggungjawab?',['Sembunyikan kerosakan','Beritahu pemilik dan tawarkan penyelesaian','Salahkan orang terakhir yang memegangnya','Letakkan semula tanpa memberitahu sesiapa'],'accountability'),
('SSQ','Masa projek semakin singkat tetapi tugasan masih banyak. Apakah strategi terbaik?',['Buat tugasan secara rawak','Susun keutamaan dan agihkan kerja','Abaikan tugasan yang sukar','Serahkan semua kerja kepada seorang ahli'],'planning'),
('EQ','Kamu menerima kritikan terhadap hasil kerja yang kamu banggakan. Apakah tindakan terbaik?',['Marah kepada pemberi kritikan','Gunakan kritikan untuk menambah baik hasil kerja','Abaikan semua komen yang diterima','Berhenti daripada projek yang sedang dijalankan'],'resilience'),
('SQ','Semasa menggunakan peralatan sekolah, kamu terlihat wayar yang rosak. Apakah tindakan paling selamat?',['Gunakan dengan berhati-hati','Hentikan penggunaan dan laporkan kepada guru','Baiki sendiri tanpa arahan','Simpan peralatan itu tanpa memberitahu sesiapa'],'safety'),
('SSQ','Dua laman web memberi jawapan berbeza tentang fakta yang sama. Apakah langkah seterusnya?',['Pilih jawapan yang paling pendek','Semak sumber asal dan bukti sokongan','Pilih laman yang muncul dahulu','Gabungkan kedua-duanya tanpa semakan'],'media_literacy'),
('EQ','Kamu gagal mencapai sasaran walaupun sudah berusaha. Apakah tindak balas paling konstruktif?',['Anggap usaha tidak berguna','Kenal pasti punca dan ubah strategi','Salahkan keadaan yang berlaku','Berhenti mencuba untuk sementara waktu'],'growth')]
AG=[
('Setuju atau Tidak Setuju: Mendengar pandangan yang berbeza boleh membantu seseorang membuat keputusan yang lebih baik.',['Setuju, kerana pandangan berbeza boleh mendedahkan perkara yang terlepas pandang.','Tidak setuju, kerana satu pandangan sahaja sudah memadai.','Setuju hanya jika pandangan itu datang daripada ketua.','Tidak setuju kerana perbincangan tidak pernah membantu.'],'open_mindedness'),
('Setuju atau Tidak Setuju: Kesilapan perlu diakui supaya puncanya boleh diperbaiki.',['Setuju, kerana pengakuan membantu mencari punca dan penyelesaian.','Tidak setuju, kerana kesilapan perlu disembunyikan.','Setuju hanya apabila kesilapan itu kecil.','Tidak setuju kerana orang lain patut menyelesaikannya.'],'accountability'),
('Setuju atau Tidak Setuju: Semua maklumat yang tular di media sosial boleh dianggap benar.',['Setuju kerana ramai orang telah berkongsinya.','Tidak setuju kerana maklumat perlu disemak dengan sumber yang boleh dipercayai.','Setuju jika gambar yang disertakan kelihatan meyakinkan.','Tidak setuju hanya apabila maklumat itu panjang.'],'media_literacy'),
('Setuju atau Tidak Setuju: Membantu rakan belajar lebih baik daripada memberikan jawapan terus.',['Setuju kerana rakan dapat memahami cara menyelesaikan masalah sendiri.','Tidak setuju kerana jawapan terus lebih cepat.','Setuju hanya apabila guru meminta.','Tidak setuju kerana bantuan tidak diperlukan.'],'learning'),
('Setuju atau Tidak Setuju: Peraturan keselamatan perlu dipatuhi walaupun seseorang sudah biasa menggunakan sesuatu alat.',['Setuju kerana pengalaman tidak menghapuskan risiko.','Tidak setuju kerana orang berpengalaman tidak perlu berhati-hati.','Setuju hanya ketika guru berada berhampiran.','Tidak setuju kerana peraturan boleh diabaikan.'],'safety'),
('Setuju atau Tidak Setuju: Keputusan kumpulan patut mengambil kira kesan terhadap ahli yang terlibat.',['Setuju kerana keputusan yang baik perlu mempertimbangkan kesan dan keperluan.','Tidak setuju kerana hanya hasil akhir penting.','Setuju hanya jika semua ahli mempunyai pendapat sama.','Tidak setuju kerana ketua menentukan semuanya.'],'fairness'),
('Setuju atau Tidak Setuju: Mengubah strategi selepas menilai keputusan percubaan menunjukkan proses pembelajaran.',['Setuju kerana penilaian membantu memperbaiki strategi.','Tidak setuju kerana strategi asal mesti dikekalkan.','Setuju hanya jika percubaan gagal sepenuhnya.','Tidak setuju kerana keputusan tidak perlu dianalisis.'],'reflection'),
('Setuju atau Tidak Setuju: Tugas kumpulan boleh dibahagi berdasarkan kekuatan dan keperluan setiap ahli.',['Setuju kerana pembahagian yang sesuai boleh meningkatkan keberkesanan.','Tidak setuju kerana semua ahli mesti melakukan tugas sama.','Setuju hanya untuk tugasan mudah.','Tidak setuju kerana pembahagian tugas tidak penting.'],'collaboration'),
('Setuju atau Tidak Setuju: Seseorang perlu meminta penjelasan apabila arahan yang diterima tidak jelas.',['Setuju kerana penjelasan dapat mengurangkan kesilapan.','Tidak setuju kerana bertanya menunjukkan kelemahan.','Setuju hanya apabila tugasan dinilai.','Tidak setuju kerana arahan tidak boleh dipersoalkan.'],'communication'),
('Setuju atau Tidak Setuju: Kejayaan satu projek tidak bermakna semua perkara dalam projek itu sudah sempurna.',['Setuju kerana masih ada ruang untuk menilai dan menambah baik.','Tidak setuju kerana projek berjaya bermaksud tiada kelemahan.','Setuju hanya jika projek mendapat markah rendah.','Tidak setuju kerana penilaian selepas projek tidak perlu.'],'reflection')]
ctx=['semasa perbincangan kelas','ketika aktiviti kokurikulum','semasa tugasan kumpulan','di pusat sumber','ketika latihan pembentangan','di makmal komputer','semasa projek kebersihan','di dewan sekolah','ketika aktiviti STEM','semasa persediaan pertandingan']
def makeA(s):
    out=[]
    for i in range(30):
        if i%3==0:
            q,o,f=AG[(i//3+s)%10]; a=(i+s)%4; r=[x for j,x in enumerate(o) if j!=0]; r.insert(a,o[0]); out.append(item(s,'BAHAGIAN A','Setuju/Tidak Setuju',q+' '+ctx[i%10]+'.',r,a,f,'AGREE_DISAGREE',i+1))
        else:
            typ,q,o,f=A[(i+s)%10]; a=(i*3+s)%4; r=[x for j,x in enumerate(o) if j!=1]; r.insert(a,o[1]); out.append(item(s,'BAHAGIAN A',typ,q+' '+ctx[i%10]+'. Apakah tindakan paling wajar?',r,a,f,'SITUATIONAL',i+1))
    return out
B_BANK=[
('Bahasa Melayu','Pilih ayat yang paling gramatis.',['Murid itu menyusun buku mengikut kategori.','Murid itu menyusun buku kepada kategori.','Murid itu tersusun buku mengikut kategori.','Murid itu penyusun buku kepada kategori.'],'language'),
('Bahasa Melayu','Pilih ayat yang sesuai untuk laporan aktiviti.',['Murid bekerjasama membersihkan kawasan sekolah.','Murid bekerjasama kepada membersihkan kawasan sekolah.','Murid bekerjasama dengan kepada kawasan sekolah.','Murid bekerjasama membersihkan kepada sekolah.'],'language'),
('Bahasa Inggeris','Choose the correct sentence.',['The pupils are preparing their project.','The pupils is preparing their project.','The pupils preparing their project.','The pupils are prepare their project.'],'grammar'),
('Bahasa Inggeris','Choose the correct question.',['Where does the activity take place?','Where do the activity takes place?','Where does the activity takes place?','Where the activity does take place?'],'grammar'),
('Matematik','Sebuah kelas mempunyai {a} meja dengan {b} kerusi bagi setiap meja. Berapakah jumlah kerusi?',lambda a,b:a*b,'math'),
('Matematik','Harga sebuah fail ialah RM{a}. Sebuah kelas membeli {b} fail. Berapakah jumlah bayaran?',lambda a,b:a*b,'math'),
('Matematik','Sebuah bekas mengandungi {a} L air. {b} L digunakan. Berapakah baki air?',lambda a,b:a-b,'math'),
('Sains','Apakah fungsi utama paru-paru?',['Menjalankan pertukaran gas','Mengepam darah','Menghadam makanan','Menghasilkan tulang'],'science'),
('Sains','Apakah keadaan jirim yang mempunyai bentuk dan isipadu tetap?',['Pepejal','Cecair','Gas','Wap'],'science'),
('Sains','Apakah sumber tenaga yang boleh diperbaharui?',['Angin','Arang batu','Petroleum','Gas asli'],'science'),
('Sejarah','Mengapakah perpaduan penting kepada masyarakat?',['Membantu mewujudkan keamanan dan kerjasama','Menghapuskan semua perbezaan','Mengurangkan tanggungjawab rakyat','Menghalang pembangunan'],'history'),
('Sejarah','Apakah manfaat mempelajari sejarah?',['Memahami perkembangan masyarakat dan negara','Melupakan peristiwa lampau','Mengelakkan perbincangan','Menggantikan semua mata pelajaran'],'history'),
('Pendidikan Islam','Apakah contoh sifat amanah?',['Menjaga tanggungjawab dengan jujur','Mengambil hak orang lain','Menyembunyikan kesalahan','Mengabaikan tugas'],'islam'),
('Pendidikan Islam','Apakah tindakan yang menunjukkan sabar?',['Mengawal emosi ketika menghadapi kesukaran','Membalas kemarahan segera','Berhenti mencuba','Menyalahkan orang lain'],'islam'),
('RBT','Apakah tujuan prototaip?',['Menguji reka bentuk sebelum penghasilan','Menggantikan semua lakaran','Menambah kos sahaja','Menghapuskan penilaian'],'rbt'),
('RBT','Apakah kepentingan ukuran tepat?',['Memastikan komponen sesuai dipasang','Menjadikan produk sentiasa berat','Menghabiskan lebih banyak bahan','Mengubah warna produk'],'rbt')]
def makeB(s):
    out=[]
    for i in range(70):
        typ,q,data,f=B_BANK[i%len(B_BANK)]
        if typ=='Matematik':
            av=12+(s+i*3)%25; bv=[2,3,4,5,6][(s+i)%5]; val=data(av,bv); opts=[str(val-bv),str(val),str(val+bv),str(val+2*bv)]; right=1
        else: opts=data; right=0; av=bv=None
        a=(i+s)%4; r=[x for j,x in enumerate(opts) if j!=right]; r.insert(a,opts[right]); qq=q.format(a=av,b=bv) if '{' in q else q; out.append(item(s,'BAHAGIAN B',typ,qq,r,a,f,'MCQ',i+1))
    return out
def makeC(s):
    p=[('Teknologi di sekolah','Cadangkan cara penggunaan teknologi yang dapat membantu pembelajaran tanpa mengabaikan keselamatan dan tanggungjawab.'),('Aktiviti komuniti','Huraikan rancangan aktiviti yang boleh menggalakkan kerjasama murid dengan komuniti setempat.'),('Pengurusan masa','Cadangkan strategi membantu murid mengurus masa antara akademik, aktiviti dan rehat.')]
    return [{'id':f'S{s:02d}-C{i+1:02d}','title':t,'prompt':q+' Sertakan sebab, langkah pelaksanaan dan cara menilai keberkesanannya.','min_words':100,'plannedLevel':4,'constructFamily':['technology_planning','community_collaboration','time_management'][i],'rubric_focus':['idea','langkah','justifikasi','penilaian','bahasa']} for i,(t,q) in enumerate(p)]
def build(s):
    q=makeA(s)+makeB(s); c=makeC(s); assert len(q)==100 and len(c)==3; assert len({x['id'] for x in q})==100 and len({x['question'].casefold() for x in q})==100
    prior=set()
    for k in range(1,s):
        p=os.path.join(ROOT,f'set{k:02d}.json')
        if os.path.exists(p):
            try: prior|={n(x.get('question','')).casefold() for x in json.load(open(p,encoding='utf-8')).get('questions',[])}
            except Exception: pass
    assert not ({n(x['question']).casefold() for x in q}&prior)
    A0=[x for x in q if x['section']=='BAHAGIAN A']; pc=Counter(x['answerIndex'] for x in A0); fc=Counter(x['format'] for x in A0); assert len(pc)==4 and max(pc.values())<=8 and fc['AGREE_DISAGREE']>=10
    d={'set':s,'questions':q,'writing':c,'difficulty':4,'rebuildVersion':'V45.10_PRODUCTION','source':'generator_v45.10','legacy_content_used':False,'structure':{'A':30,'B':70,'C':3},'qa':{'status':'PASS','count':103,'cross_set':'PASS','unique_ids':'PASS','unique_stems':'PASS','length_leak':'PASS','A_answer_positions':dict(sorted(pc.items())),'A_formats':dict(fc)}}
    with open(os.path.join(ROOT,f'set{s:02d}.json'),'w',encoding='utf-8') as f: json.dump(d,f,ensure_ascii=False,indent=2); f.write('\n')
if __name__=='__main__': build(int(os.getenv('PKSK_SET','5')))
