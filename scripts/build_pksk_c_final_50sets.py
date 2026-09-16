#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETS_ROOT = ROOT / "sim/pksk/simulator/sets"

# 50 distinct contexts. Each context produces three different writing tasks, giving
# 150 unique Bahagian C prompts across 50 sets. The wording is deliberately varied
# to avoid template/near-duplicate leakage while retaining a common PKSK-style
# requirement for reasoning, planning, justification and reflection.
TOPICS = [
    ("digital_wellbeing", "Keseimbangan penggunaan telefon pintar", "ramai murid menggunakan telefon pintar untuk pembelajaran tetapi masa skrin mula mengganggu tumpuan, tidur dan komunikasi keluarga", "membentuk rutin digital yang sihat tanpa menolak manfaat teknologi", "murid, ibu bapa dan guru"),
    ("school_cleanliness", "Sekolah bersih dan terurus", "kawasan rehat sekolah sering dipenuhi pembungkus makanan selepas waktu rehat walaupun tong sampah disediakan", "mengurangkan sampah dan membina rasa tanggungjawab bersama", "murid, pengawas, pekerja kebersihan dan kantin"),
    ("water_outage", "Menghadapi gangguan bekalan air", "kawasan tempat tinggal mengalami gangguan bekalan air selama dua hari dan beberapa keluarga mempunyai simpanan yang terhad", "menggunakan air secara berhemah serta membantu penduduk yang lebih memerlukan", "keluarga, jiran dan jawatankuasa komuniti"),
    ("cyberbullying", "Menangani buli siber", "seorang rakan menerima komen menghina berulang kali dalam kumpulan sembang kelas dan mula takut untuk hadir ke sekolah", "menghentikan gangguan dengan selamat serta memberi sokongan kepada mangsa", "rakan, guru, ibu bapa dan pentadbir platform"),
    ("privacy_security", "Melindungi privasi akaun", "beberapa murid berkongsi kata laluan permainan dan akaun pembelajaran kerana mahu memudahkan rakan masuk", "meningkatkan keselamatan akaun tanpa mengganggu kerja kolaboratif", "murid, guru ICT dan ibu bapa"),
    ("misinformation", "Menyemak maklumat tular", "satu mesej tular mendakwa sekolah akan ditutup tetapi tiada pengumuman rasmi dan murid mula menyebarkannya", "memastikan maklumat disahkan sebelum dikongsi", "murid, guru, pihak sekolah dan keluarga"),
    ("responsible_ai", "Menggunakan AI secara bertanggungjawab", "murid dibenarkan menggunakan alat AI untuk mencari idea tetapi ada yang menyerahkan jawapan AI tanpa menyemak fakta atau memahami isi", "menggunakan AI sebagai bantuan belajar dengan jujur dan kritis", "murid, guru dan ibu bapa"),
    ("library_use", "Menghidupkan semula pusat sumber", "kunjungan ke pusat sumber semakin berkurang walaupun sekolah mempunyai buku, ruang bacaan dan komputer", "menjadikan pusat sumber lebih berguna dan menarik kepada murid", "murid, pengawas pusat sumber dan guru"),
    ("reading_campaign", "Kempen membaca yang berkesan", "program membaca bulanan kurang mendapat sambutan kerana ramai murid menganggapnya sekadar aktiviti wajib", "membina minat membaca yang berkekalan", "murid, guru bahasa dan pustakawan"),
    ("peer_tutoring", "Rakan membimbing rakan", "sebahagian murid masih sukar memahami topik asas walaupun guru telah menerangkan dalam kelas", "mewujudkan bantuan rakan sebaya yang adil dan tidak memalukan sesiapa", "murid, guru dan pembimbing rakan sebaya"),
    ("healthy_canteen", "Pilihan makanan lebih sihat", "makanan tinggi gula dan garam lebih popular di kantin berbanding pilihan yang lebih seimbang", "menggalakkan pemilihan makanan sihat tanpa membazirkan makanan", "murid, pengusaha kantin, guru dan ibu bapa"),
    ("food_waste", "Mengurangkan pembaziran makanan", "banyak makanan yang masih baik dibuang selepas waktu rehat kerana saiz hidangan tidak sesuai dengan keperluan murid", "mengurangkan sisa makanan sambil memastikan murid cukup makan", "murid, kantin dan jawatankuasa sekolah"),
    ("recycling", "Sistem kitar semula sekolah", "tong kitar semula ada tetapi bahan sering bercampur sehingga sukar dihantar untuk diproses", "meningkatkan pengasingan bahan dan penyertaan warga sekolah", "murid, guru, pekerja sekolah dan pengutip kitar semula"),
    ("energy_saving", "Menjimatkan tenaga elektrik", "lampu, kipas dan pendingin hawa kadang-kadang dibiarkan terpasang di bilik kosong", "mengurangkan penggunaan elektrik tanpa menjejaskan keselesaan dan keselamatan", "murid, guru dan pengurusan sekolah"),
    ("water_conservation", "Menjimatkan air di sekolah", "beberapa paip menitis dan penggunaan air meningkat walaupun bilangan murid tidak berubah", "mengurangkan pembaziran air melalui tindakan yang boleh diukur", "murid, guru, pengawas dan penyelenggaraan"),
    ("biodiversity", "Melindungi biodiversiti sekolah", "satu kawasan lapang sekolah mempunyai pokok, serangga dan burung tetapi dicadangkan untuk dibersihkan sepenuhnya", "mengekalkan ruang yang selamat sambil melindungi habitat kecil", "murid, guru Sains dan pihak pengurusan"),
    ("flood_preparedness", "Bersedia menghadapi banjir", "hujan lebat menyebabkan jalan berhampiran sekolah mudah dinaiki air dan perjalanan pulang boleh terganggu", "meningkatkan kesiapsiagaan tanpa menimbulkan panik", "murid, keluarga, sekolah dan komuniti"),
    ("air_quality", "Menjaga kesihatan ketika jerebu", "bacaan kualiti udara merosot dan aktiviti luar sekolah mungkin perlu diubah", "melindungi kesihatan sambil memastikan pembelajaran terus berjalan", "murid, guru, keluarga dan pihak sekolah"),
    ("heat_safety", "Mengurus cuaca sangat panas", "suhu tengah hari tinggi dan beberapa murid cepat letih ketika aktiviti luar", "mengurangkan risiko berkaitan haba tanpa menghentikan semua aktiviti fizikal", "murid, guru sukan dan pihak sekolah"),
    ("road_safety", "Keselamatan di pintu sekolah", "waktu pulang menjadi sesak apabila kereta, motosikal dan murid berjalan kaki menggunakan ruang yang sama", "mengurangkan risiko kemalangan semasa waktu puncak", "murid, ibu bapa, pengawal dan komuniti"),
    ("bus_safety", "Keselamatan menaiki bas", "sebahagian murid berebut ketika menaiki bas sekolah dan ada yang berdiri sebelum bas berhenti sepenuhnya", "mewujudkan rutin perjalanan yang lebih selamat dan teratur", "murid, pemandu, pembantu bas dan ibu bapa"),
    ("sportsmanship", "Semangat kesukanan", "perlawanan antara kelas menjadi tegang apabila penyokong mengejek pasukan lawan selepas keputusan dipertikaikan", "mengekalkan persaingan sihat dan rasa hormat", "pemain, penyokong, pengadil dan guru"),
    ("inclusion", "Sekolah yang lebih inklusif", "seorang murid yang mempunyai keperluan pergerakan sukar menyertai beberapa aktiviti kerana susunan ruang dan tugasan tidak sesuai", "memastikan penyertaan bermakna tanpa merendahkan kebolehan murid", "murid, guru dan pihak sekolah"),
    ("anti_bullying", "Mencegah buli di sekolah", "beberapa murid takut melaporkan ejekan dan ugutan kerana bimbang keadaan menjadi lebih buruk", "mewujudkan saluran bantuan yang selamat dan dipercayai", "murid, guru, kaunselor dan ibu bapa"),
    ("student_leadership", "Kepimpinan murid yang adil", "sebuah jawatankuasa murid perlu memilih aktiviti tetapi ahli mempunyai keutamaan dan kepentingan yang berbeza", "membuat keputusan telus yang mengambil kira suara ramai", "ketua murid, ahli jawatankuasa dan peserta"),
    ("group_conflict", "Menyelesaikan konflik kumpulan", "dua ahli kumpulan tidak mahu bekerjasama selepas berselisih tentang pembahagian tugas", "memulihkan kerjasama tanpa mengabaikan punca masalah", "ahli kumpulan, ketua dan guru pembimbing"),
    ("time_management", "Mengurus masa dengan realistik", "seorang murid mempunyai kerja sekolah, latihan sukan dan tanggungjawab di rumah pada minggu yang sama", "menyusun masa supaya tugasan penting selesai dan rehat mencukupi", "murid, keluarga, guru dan jurulatih"),
    ("exam_stress", "Mengurus tekanan menjelang peperiksaan", "sebahagian murid belajar hingga lewat malam dan semakin sukar menumpukan perhatian pada waktu siang", "membina persediaan peperiksaan yang sihat dan berkesan", "murid, guru, keluarga dan kaunselor"),
    ("sleep_health", "Tidur yang cukup untuk belajar", "murid sering mengantuk di kelas kerana tidur lewat akibat permainan, video dan kerja yang tidak terancang", "memperbaiki rutin tidur tanpa mengabaikan tanggungjawab", "murid dan keluarga"),
    ("physical_activity", "Lebih aktif setiap hari", "ramai murid kurang bergerak selepas waktu sekolah walaupun kemudahan rekreasi tersedia", "meningkatkan aktiviti fizikal secara selamat dan menyeronokkan", "murid, keluarga dan komuniti"),
    ("stem_fair", "Pameran STEM yang bermakna", "sekolah mahu mengadakan pameran STEM tetapi bajet terhad dan projek perlu menunjukkan penyelesaian kepada masalah sebenar", "menghasilkan pameran yang kreatif, selamat dan berguna", "murid, guru, ibu bapa dan pengunjung"),
    ("lab_safety", "Keselamatan makmal Sains", "beberapa murid tergesa-gesa menyiapkan eksperimen lalu mengabaikan arahan penggunaan bahan dan peralatan", "meningkatkan disiplin keselamatan tanpa mengurangkan peluang meneroka", "murid dan guru Sains"),
    ("rbt_maker", "Projek reka bentuk yang berguna", "kelas RBT perlu menghasilkan prototaip daripada bahan terhad untuk menyelesaikan masalah kecil di sekolah", "memilih reka bentuk yang praktikal, selamat dan boleh diuji", "murid, guru RBT dan pengguna sasaran"),
    ("school_garden", "Kebun sekolah yang lestari", "kebun sekolah kurang terurus kerana jadual penyiraman dan pembahagian tugas tidak konsisten", "memulihkan kebun dengan penggunaan air dan tenaga yang munasabah", "murid, guru dan kelab alam sekitar"),
    ("entrepreneurship", "Hari keusahawanan sekolah", "murid akan menjual produk semasa hari keusahawanan tetapi perlu mengawal kos, harga dan sisa", "menjalankan aktiviti niaga yang jujur dan bertanggungjawab", "murid, guru, pembeli dan pembekal"),
    ("financial_literacy", "Mengurus wang saku", "seorang murid mahu menyimpan untuk membeli bahan pembelajaran tetapi sering menghabiskan wang saku pada perkara kecil", "membina tabiat kewangan yang seimbang antara keperluan, simpanan dan kehendak", "murid dan keluarga"),
    ("charity_drive", "Bantuan yang menjaga maruah penerima", "sekolah mahu mengumpul barangan untuk keluarga yang memerlukan tetapi tidak mahu penerima berasa dipamerkan", "mengurus sumbangan secara telus, sesuai dan menghormati privasi", "murid, guru, penyumbang dan penerima"),
    ("elderly_support", "Menyokong warga emas dalam komuniti", "beberapa warga emas tinggal berdekatan dan memerlukan bantuan kecil seperti mendapatkan maklumat atau membawa barangan", "membantu secara selamat tanpa mengambil alih kebebasan mereka", "murid, keluarga, warga emas dan komuniti"),
    ("cultural_heritage", "Menghargai warisan budaya", "murid mengenali trend semasa tetapi kurang mengetahui permainan, seni dan cerita tradisional setempat", "mendekatkan warisan budaya kepada generasi muda secara hormat dan relevan", "murid, guru, keluarga dan penggiat budaya"),
    ("language_week", "Minggu bahasa yang menarik", "aktiviti minggu bahasa sering disertai oleh murid yang sama sedangkan ramai yang malu bercakap atau menulis di hadapan orang lain", "meningkatkan penyertaan dengan aktiviti yang pelbagai dan inklusif", "murid, guru bahasa dan pengawas"),
    ("unity", "Membina perpaduan melalui aktiviti", "murid daripada latar yang berbeza jarang berinteraksi di luar kumpulan kawan masing-masing", "mewujudkan peluang bekerjasama dan saling mengenali tanpa memaksa keseragaman", "murid, guru dan komuniti sekolah"),
    ("public_speaking", "Meningkatkan keyakinan bercakap", "ramai murid mempunyai idea yang baik tetapi takut bercakap di hadapan kelas kerana bimbang tersalah", "membina keyakinan berkomunikasi secara berperingkat", "murid, rakan dan guru"),
    ("event_planning", "Merancang acara sekolah", "sekolah mahu menganjurkan hari keluarga dengan masa persediaan singkat, ruang terhad dan ramai peserta", "menyusun acara yang teratur, selamat dan mesra semua peserta", "murid, guru, ibu bapa dan tetamu"),
    ("honesty_lost_property", "Mengurus barang yang dijumpai", "beberapa barang hilang tidak sampai ke kaunter barang ditemui kerana murid tidak pasti prosedur yang betul", "membina budaya amanah dan sistem pemulangan yang jelas", "murid, pengawas dan guru"),
    ("emergency_drill", "Latihan kecemasan yang serius", "semasa latihan pengungsian ada murid bergurau dan bergerak bertentangan arah sehingga laluan menjadi sesak", "menjadikan latihan kecemasan lebih selamat dan difahami", "murid, guru dan pasukan keselamatan sekolah"),
    ("dengue_prevention", "Mencegah pembiakan nyamuk", "selepas hujan terdapat beberapa bekas yang boleh menakung air di sekitar sekolah dan kawasan perumahan", "mengurangkan tempat pembiakan nyamuk melalui pemeriksaan berkala", "murid, keluarga, sekolah dan komuniti"),
    ("animal_welfare", "Menangani haiwan terbiar dengan berhemah", "beberapa kucing terbiar datang ke kawasan sekolah dan murid memberi makanan di tempat yang mengganggu kebersihan", "menjaga kebajikan haiwan sambil melindungi kebersihan dan keselamatan", "murid, sekolah, komuniti dan pihak berkaitan"),
    ("responsible_tourism", "Pelawat yang bertanggungjawab", "rombongan sekolah akan melawat kawasan semula jadi yang mempunyai laluan sensitif, hidupan liar dan peraturan pelawat", "menikmati lawatan sambil mengurangkan gangguan kepada alam sekitar", "murid, guru, pemandu dan pengurus kawasan"),
    ("public_transport", "Menggalakkan pengangkutan awam", "kesesakan di sekitar sekolah bertambah kerana kebanyakan perjalanan pendek dibuat dengan kenderaan persendirian", "meneroka pilihan perjalanan yang lebih cekap tanpa mengabaikan keselamatan", "murid, keluarga, sekolah dan penyedia pengangkutan"),
    ("climate_action", "Tindakan iklim di peringkat sekolah", "murid mahu mengurangkan kesan alam sekitar sekolah tetapi cadangan terlalu banyak dan sumber pelaksanaan terhad", "memilih tindakan yang realistik serta boleh diukur", "murid, guru dan pihak pengurusan"),
]

PLAN_TEMPLATES = [
    "{scenario}. Huraikan satu pelan tindakan yang boleh dimulakan dalam tempoh sebulan untuk {goal}. Jelaskan langkah utama, peranan {stakeholders}, dan satu petunjuk yang boleh digunakan untuk menilai kemajuan.",
    "Bayangkan kamu menjadi ahli pasukan yang perlu menangani keadaan berikut: {scenario}. Cadangkan cara yang praktikal untuk {goal}. Huraikan urutan tindakan, sebab setiap tindakan penting, dan contoh bagaimana {stakeholders} boleh bekerjasama.",
    "Situasi sekolah atau komuniti menunjukkan bahawa {scenario}. Jelaskan bagaimana satu program kecil boleh direka untuk {goal}. Huraikan sumber yang diperlukan, pembahagian tugas {stakeholders}, serta cara mengelakkan satu risiko yang mungkin timbul.",
    "Kamu diberi tanggungjawab mencadangkan penyelesaian kerana {scenario}. Huraikan pendekatan yang sesuai untuk {goal}. Berikan sebab bagi keutamaan kamu, langkah pelaksanaan, dan bukti yang patut dikumpulkan selepas program berjalan.",
    "Satu jawatankuasa mendapati bahawa {scenario}. Cadangkan pelan yang tidak bergantung pada kos tinggi tetapi masih mampu {goal}. Jelaskan peranan {stakeholders}, cara menarik penyertaan, dan contoh perubahan yang menunjukkan pelan itu berkesan.",
    "Sekiranya kamu diminta membantu apabila {scenario}, apakah rancangan yang wajar dilaksanakan untuk {goal}? Huraikan tindakan awal, tindakan susulan, dan sebab rancangan itu adil kepada {stakeholders}.",
    "Masalah yang perlu ditangani ialah: {scenario}. Cadangkan satu projek murid bagi {goal}. Jelaskan langkah daripada perancangan hingga penilaian, peranan {stakeholders}, dan cara memastikan projek boleh diteruskan.",
    "Dalam satu mesyuarat, isu berikut dibangkitkan: {scenario}. Huraikan cadangan kamu untuk {goal}. Sertakan sebab pemilihan kaedah, pembahagian tanggungjawab {stakeholders}, dan cara menangani kekangan yang munasabah.",
    "Anggap kamu mempunyai dua minggu untuk bertindak selepas mengetahui bahawa {scenario}. Jelaskan cara memulakan usaha bagi {goal}. Huraikan langkah paling penting, contoh sokongan daripada {stakeholders}, dan ukuran kejayaan yang mudah difahami.",
    "Keadaan berikut memerlukan tindakan terancang: {scenario}. Cadangkan penyelesaian yang sesuai dengan kemampuan murid untuk {goal}. Huraikan langkah, sebab, peranan {stakeholders}, dan satu penambahbaikan jika percubaan pertama tidak berjaya.",
]

DECISION_TEMPLATES = [
    "Apabila {scenario}, ada pihak mencadangkan tindakan segera manakala pihak lain mahu mengumpul lebih banyak maklumat dahulu. Bandingkan kedua-dua pendekatan. Jelaskan pilihan yang lebih sesuai untuk {goal}, sebab pilihan itu munasabah, dan kesannya kepada {stakeholders}.",
    "Untuk menangani keadaan bahawa {scenario}, dua idea dikemukakan: kempen kesedaran atau perubahan rutin harian. Nilai kekuatan dan kelemahan kedua-duanya. Cadangkan pilihan atau gabungan yang paling sesuai bagi {goal} dan jelaskan sebabnya kepada {stakeholders}.",
    "Bayangkan sumber sangat terhad sedangkan {scenario}. Kamu perlu memilih sama ada memberi tumpuan kepada pencegahan atau penyelesaian selepas masalah berlaku. Huraikan pertimbangan kamu, bandingkan kesan kedua-dua pilihan, dan jelaskan keputusan yang membantu {goal}.",
    "Dalam usaha menghadapi situasi {scenario}, cadangan ahli pasukan bercanggah tentang siapa yang perlu bertindak dahulu. Nilai beberapa pertimbangan seperti keselamatan, keadilan dan keberkesanan. Jelaskan susunan keutamaan yang kamu pilih untuk {goal} serta peranan {stakeholders}.",
    "Kumpulan kamu mahu {goal}, tetapi {scenario}. Bandingkan pendekatan yang cepat tetapi sukar dikekalkan dengan pendekatan yang lebih perlahan tetapi membina tabiat. Jelaskan pilihan kamu, alasan utama, dan kesan jangka pendek serta jangka panjang kepada {stakeholders}.",
    "Satu keputusan perlu dibuat kerana {scenario}. Ada pilihan yang murah tetapi kurang menyeluruh dan ada pilihan yang memerlukan lebih banyak kerjasama. Huraikan bagaimana kamu akan menilai pilihan tersebut. Cadangkan keputusan yang paling seimbang untuk {goal} dan jelaskan sebabnya.",
    "Apabila berdepan keadaan {scenario}, sesetengah orang mahu menetapkan peraturan ketat manakala yang lain memilih pendekatan pendidikan dan sokongan. Bandingkan kesan kedua-duanya. Jelaskan pendekatan yang kamu pilih untuk {goal} dengan mengambil kira {stakeholders}.",
    "Untuk mencapai matlamat {goal}, pasukan perlu bertindak walaupun {scenario}. Nilai tiga perkara yang patut dipertimbangkan sebelum keputusan dibuat. Huraikan keputusan akhir kamu, sebabnya, dan bagaimana keputusan itu boleh diterangkan secara adil kepada {stakeholders}.",
    "Situasi {scenario} boleh diselesaikan dengan usaha individu atau melalui tindakan bersama. Bandingkan batas dan kelebihan kedua-dua cara. Cadangkan gabungan yang sesuai untuk {goal}, kemudian jelaskan peranan {stakeholders} dan kesan yang dijangka.",
    "Bayangkan kamu perlu memilih satu cadangan daripada beberapa idea selepas mengetahui bahawa {scenario}. Huraikan kriteria yang akan digunakan untuk menilai idea. Jelaskan cadangan yang patut diutamakan supaya {goal}, serta sebab keputusan itu boleh dipertanggungjawabkan kepada {stakeholders}.",
]

REFLECT_TEMPLATES = [
    "Selepas satu usaha dilaksanakan untuk {goal}, hasilnya hanya berjaya sebahagian dan isu asal masih berkait dengan keadaan bahawa {scenario}. Huraikan cara menilai apa yang berkesan dan apa yang tidak. Jelaskan dua penambahbaikan serta bagaimana maklum balas {stakeholders} patut digunakan.",
    "Andaikan program berkaitan {goal} sudah berjalan selama sebulan dalam keadaan {scenario}. Cadangkan bukti yang patut dikumpulkan sebelum menilai kejayaannya. Huraikan cara mentafsir bukti itu, jelaskan satu kemungkinan kelemahan, dan beri contoh tindakan susulan bersama {stakeholders}.",
    "Satu pasukan mendakwa mereka telah berjaya {goal}, tetapi masalah {scenario} masih disebut oleh sebahagian peserta. Jelaskan mengapa satu ukuran sahaja tidak mencukupi. Huraikan cara mendapatkan pandangan {stakeholders}, menilai kesan sebenar dan memperbaiki program.",
    "Selepas percubaan pertama untuk {goal}, penyertaan tidak sekata kerana {scenario}. Huraikan punca yang wajar disiasat sebelum membuat kesimpulan. Cadangkan cara mendapatkan maklum balas, jelaskan penambahbaikan yang sesuai dan peranan {stakeholders} dalam percubaan seterusnya.",
    "Kamu diminta menyediakan laporan selepas aktiviti yang bertujuan {goal} sedangkan latar masalahnya ialah {scenario}. Huraikan maklumat yang perlu dimasukkan untuk menunjukkan hasil dengan jujur. Jelaskan kesan kepada {stakeholders} dan cadangkan langkah seterusnya berdasarkan dapatan.",
    "Bayangkan tindakan untuk {goal} menerima pujian tetapi juga kritikan kerana {scenario}. Nilai maklum balas yang berbeza itu secara adil. Huraikan bukti yang perlu disemak, jelaskan perubahan yang wajar dibuat dan cara berkomunikasi semula dengan {stakeholders}.",
    "Program bagi {goal} menunjukkan perubahan baik pada awalnya tetapi kesannya mula berkurang apabila {scenario}. Huraikan sebab yang mungkin menerangkan keadaan itu. Cadangkan cara mengekalkan perubahan, jelaskan tanggungjawab {stakeholders}, dan beri contoh ukuran jangka panjang.",
    "Selepas aktiviti untuk {goal}, ahli pasukan tidak bersetuju sama ada program patut diteruskan kerana {scenario}. Huraikan data dan pandangan yang perlu dipertimbangkan. Jelaskan keputusan susulan yang kamu cadangkan serta sebab ia wajar kepada {stakeholders}.",
    "Satu projek bertujuan {goal} telah selesai, namun pasukan mahu memastikan pembelajaran daripada isu {scenario} tidak hilang. Cadangkan cara membuat refleksi yang berguna. Huraikan kejayaan, cabaran, kesan kepada {stakeholders} dan satu perubahan konkrit untuk projek akan datang.",
    "Andaikan kamu menjadi penilai bebas bagi usaha untuk {goal} dalam situasi {scenario}. Huraikan soalan yang perlu ditanya sebelum menyatakan program berjaya. Jelaskan cara membezakan pendapat daripada bukti dan cadangkan penambahbaikan yang mengambil kira {stakeholders}.",
]


def find_set_paths() -> list[Path]:
    paths = sorted(SETS_ROOT.glob("SET */data/set*.json"), key=lambda p: int(re.search(r"set(\d{2})\.json$", p.name, re.I).group(1)))
    if len(paths) != 50:
        raise SystemExit(f"FINAL C BUILD FAILED: expected 50 set files, found {len(paths)}")
    return paths


def make_prompt(set_no: int, slot: int, topic: tuple[str, str, str, str, str]) -> dict:
    slug, label, scenario, goal, stakeholders = topic
    idx = (set_no - 1) % 10
    if slot == 1:
        title = f"{label}: merancang tindakan"
        text = PLAN_TEMPLATES[idx].format(scenario=scenario, goal=goal, stakeholders=stakeholders)
        level = 2
        family = f"{slug}_planning"
    elif slot == 2:
        title = f"{label}: membuat keputusan"
        text = DECISION_TEMPLATES[(idx + 3) % 10].format(scenario=scenario, goal=goal, stakeholders=stakeholders)
        level = 3
        family = f"{slug}_decision"
    else:
        title = f"{label}: menilai dan menambah baik"
        text = REFLECT_TEMPLATES[(idx + 6) % 10].format(scenario=scenario, goal=goal, stakeholders=stakeholders)
        level = 4
        family = f"{slug}_reflection"
    return {
        "id": f"C{slot:02d}",
        "title": title,
        "prompt": text,
        "min_words": 100,
        "plannedLevel": level,
        "constructFamily": family,
        "levelSignal": level,
        "contentDomain": "Artikulasi Penulisan",
        "rebuildStatus": "FINAL_C_V1_EDITORIAL_REBUILD",
    }


def main() -> int:
    paths = find_set_paths()
    if len(TOPICS) != 50:
        raise SystemExit(f"FINAL C BUILD FAILED: expected 50 topics, found {len(TOPICS)}")

    changed = 0
    all_titles: set[str] = set()
    all_prompts: set[str] = set()
    all_families: set[str] = set()

    for set_no, path in enumerate(paths, 1):
        data = json.loads(path.read_text(encoding="utf-8"))
        topic = TOPICS[set_no - 1]
        writing = [make_prompt(set_no, slot, topic) for slot in (1, 2, 3)]
        for w in writing:
            if w["title"] in all_titles:
                raise SystemExit(f"FINAL C BUILD FAILED: duplicate title {w['title']}")
            if w["prompt"] in all_prompts:
                raise SystemExit(f"FINAL C BUILD FAILED: duplicate prompt {w['id']} set {set_no}")
            if w["constructFamily"] in all_families:
                raise SystemExit(f"FINAL C BUILD FAILED: duplicate construct family {w['constructFamily']}")
            all_titles.add(w["title"])
            all_prompts.add(w["prompt"])
            all_families.add(w["constructFamily"])
        data["writing"] = writing
        data["cRebuildVersion"] = "FINAL_C_V1_150_UNIQUE"
        data["cLegacyContentUsed"] = False
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed += 1

    print("FINAL C BUILD PASS")
    print("set_files", changed)
    print("writing_prompts", len(all_prompts))
    print("unique_titles", len(all_titles))
    print("unique_construct_families", len(all_families))
    print("levels", {2: 50, 3: 50, 4: 50})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
