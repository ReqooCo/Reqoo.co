#!/usr/bin/env python3
from __future__ import annotations
import base64, csv, hashlib, json, random, re, unicodedata, zlib
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"sim/pksk/generator/master/a"
OUT=MASTER/"authored"
FAMILIES=MASTER/"families.csv"
AXES=MASTER/"variant_axes.json"
QA=ROOT/"docs/PKSK_MASTER_A_QA.md"

PROFILE_B64="".join((MASTER/"situational_profiles.zlib.b64").read_text(encoding="utf-8").split())
AD_B64="".join((MASTER/"agree_disagree_profiles.zlib.b64").read_text(encoding="utf-8").split())

PROFILES=json.loads(zlib.decompress(base64.b64decode(PROFILE_B64)).decode("utf-8"))
AD=json.loads(zlib.decompress(base64.b64decode(AD_B64)).decode("utf-8"))

DOMAIN_OFFSET={"EQ":0.0,"SQ":0.05,"SSQ":0.10}
FOLLOWUPS={
"EQ":["kemudian semak semula keadaan selepas emosi reda","selepas itu pastikan salah faham benar-benar diselesaikan","kemudian nilai sama ada sokongan lanjut masih diperlukan","selepas itu berbincang semula apabila semua pihak lebih tenang"],
"SQ":["kemudian pastikan perkara itu diserahkan melalui saluran yang betul","selepas itu semak bahawa hak dan keselamatan pihak lain terjaga","kemudian betulkan kesan yang masih boleh diperbaiki","selepas itu rekod atau maklumkan perkara penting jika perlu"],
"SSQ":["kemudian tetapkan cara menyemak hasil keputusan","selepas itu pantau sama ada andaian awal masih benar","kemudian ubah pelan jika data sebenar tidak menyokongnya","selepas itu dokumentasikan keputusan supaya semua ahli jelas"]
}

SCENE_SUFFIX={
2:["Beberapa minit kemudian, keadaan mula mempengaruhi orang lain yang terlibat.","Tindak balas pertama kamu akan menentukan sama ada keadaan bertambah baik atau semakin tegang.","Jika tiada tindakan sesuai dibuat sekarang, masalah itu mungkin berlarutan hingga aktiviti seterusnya.","Orang di sekeliling mula memerhati dan menunggu bagaimana keadaan itu ditangani."],
3:["Pada masa yang sama, seorang lagi pihak mempunyai sebab yang munasabah dari sudut pandangnya.","Apabila didengar lebih teliti, setiap pihak sebenarnya mempunyai keperluan yang berbeza.","Kamu kemudian mengetahui bahawa orang lain menafsir keadaan itu dengan cara yang tidak sama seperti kamu.","Satu maklumat baharu menunjukkan bahawa reaksi orang lain mungkin berpunca daripada keadaan yang kamu belum fahami."],
4:["Namun, satu maklumat penting tentang punca sebenar keadaan itu masih belum diketahui.","Kamu hanya melihat sebahagian daripada kejadian dan belum mendengar penjelasan semua pihak.","Ada dua kemungkinan yang sama-sama masuk akal, tetapi bukti yang ada belum cukup untuk memilih salah satu.","Kamu menerima cerita yang berbeza dan belum dapat memastikan mana satu paling tepat."],
5:["Dalam keadaan ini, dua perkara yang sama-sama bernilai perlu dijaga pada masa yang sama.","Pilihan yang cepat boleh membantu satu pihak tetapi mungkin menjejaskan keperluan pihak lain.","Kamu perlu menimbang kepentingan segera dengan kesan terhadap hubungan atau tanggungjawab.","Tiada pilihan yang sempurna; setiap tindakan mempunyai manfaat dan kos tertentu."],
6:["Masa yang tinggal sangat singkat dan tidak semua langkah boleh dibuat serentak.","Sumber yang boleh digunakan terhad, jadi kamu perlu menentukan langkah yang paling penting dahulu.","Hanya beberapa minit tersedia sebelum keputusan perlu dibuat.","Kamu hanya boleh memilih satu tindakan awal sebelum mendapatkan bantuan atau maklumat tambahan."],
7:["Dua pendekatan dicadangkan dan kedua-duanya mempunyai alasan yang kelihatan munasabah.","Rakan-rakan memberi dua cadangan berbeza tentang cara menangani keadaan itu.","Terdapat lebih daripada satu cara yang boleh berfungsi, tetapi kesannya tidak sama.","Kamu perlu memilih antara pendekatan yang cepat dan pendekatan yang lebih menyeluruh."],
8:["Langkah pertama akan mempengaruhi apa yang boleh dilakukan selepas itu.","Keadaan ini memerlukan lebih daripada satu tindakan dan urutannya penting.","Jika tindakan dibuat dalam urutan yang salah, masalah boleh menjadi lebih sukar untuk diperbaiki.","Kamu perlu menentukan apa yang patut dilakukan dahulu dan apa yang perlu menyusul."],
9:["Tiada siapa menyatakan perasaan atau niat secara terus, dan isyarat yang kamu lihat bercampur-campur.","Keadaan kelihatan biasa pada permukaan, tetapi beberapa petunjuk kecil menunjukkan ada isu yang belum disebut.","Orang yang terlibat memberi respons pendek dan sukar diketahui sama ada mereka benar-benar selesa.","Tiada bukti jelas bahawa sesiapa berniat buruk, tetapi kesan keadaan itu masih perlu ditangani."],
10:["Keputusan kamu akan mempengaruhi bukan sahaja keadaan sekarang, tetapi juga kepercayaan, masa dan tanggungjawab selepas itu.","Beberapa faktor bertindih: kepentingan individu, keperluan kumpulan dan kesan kepada langkah seterusnya.","Pilihan yang baik perlu mengambil kira kesan segera, kemungkinan tindak balas pihak lain dan tanggungjawab yang masih belum selesai.","Keadaan ini melibatkan sekurang-kurangnya tiga perkara yang perlu diseimbangkan sebelum tindakan dipilih."]
}
QUESTION={
1:["Apakah tindakan kamu yang paling sesuai?","Respons manakah paling matang dalam keadaan ini?","Apakah pilihan yang paling wajar dibuat?","Jika kamu berada dalam situasi ini, apakah tindakan terbaik?"],
2:["Tindakan manakah paling berkemungkinan memperbaiki keadaan dalam masa terdekat?","Apakah respons yang paling membantu mengelakkan masalah daripada menjadi lebih buruk?","Pilihan manakah paling baik untuk menghasilkan kesan awal yang membina?","Apakah tindakan awal yang paling mungkin membawa keadaan ke arah yang lebih baik?"],
3:["Jika kamu mempertimbangkan sudut pandang semua pihak, apakah tindakan paling wajar?","Pilihan manakah paling menunjukkan kamu memahami keperluan pihak lain juga?","Apakah respons yang paling seimbang apabila pandangan orang lain turut diambil kira?","Jika kamu cuba melihat keadaan dari lebih satu sudut, apakah pilihan terbaik?"],
4:["Apakah tindakan terbaik apabila maklumat yang ada masih belum lengkap?","Pilihan manakah paling sesuai sebelum membuat kesimpulan?","Apakah respons yang paling bertanggungjawab dalam keadaan yang masih tidak pasti?","Apa yang patut dilakukan apabila fakta penting masih belum jelas?"],
5:["Apakah pilihan yang paling baik menyeimbangkan dua kepentingan tersebut?","Tindakan manakah paling munasabah apabila kedua-dua matlamat mempunyai nilai?","Apakah respons yang paling seimbang tanpa mengabaikan salah satu kepentingan penting?","Pilihan manakah paling baik mengurus pertukaran antara dua keperluan itu?"],
6:["Dengan kekangan yang ada, apakah perkara paling penting untuk dibuat dahulu?","Apakah tindakan yang patut diberi keutamaan?","Jika kamu tidak sempat melakukan semuanya, pilihan manakah paling wajar didahulukan?","Dalam masa atau sumber yang terhad, apakah respons paling berkesan?"],
7:["Antara pendekatan yang mungkin, yang manakah paling kukuh apabila dibandingkan dengan kriteria yang relevan?","Pilihan manakah paling baik selepas mempertimbangkan kelebihan dan kekurangan setiap pendekatan?","Apakah strategi yang paling boleh dipertahankan jika kamu perlu menjelaskan sebab pilihan itu?","Pendekatan manakah paling sesuai berdasarkan kesan, keadilan dan kebolehlaksanaan?"],
8:["Urutan tindakan manakah paling sesuai?","Apakah gabungan langkah yang paling wajar dibuat mengikut turutan?","Jika perlu bertindak dalam beberapa langkah, pilihan manakah paling tersusun?","Apakah respons yang mengatur tindakan pertama dan tindakan susulan dengan paling baik?"],
9:["Apakah respons paling munasabah tanpa membuat andaian berlebihan?","Pilihan manakah paling matang apabila isyarat keadaan masih samar?","Apakah tindakan yang paling sesuai jika niat orang lain tidak dapat dipastikan?","Respons manakah paling menjaga keadaan sambil mengelakkan kesimpulan terburu-buru?"],
10:["Apakah keputusan yang paling kukuh apabila semua faktor itu dipertimbangkan bersama?","Pilihan manakah paling seimbang untuk kesan sekarang dan kesan seterusnya?","Apakah respons yang paling baik mengurus faktor individu, kumpulan dan akibat jangka lanjut?","Jika kamu perlu mempertahankan keputusan kepada semua pihak, pilihan manakah paling munasabah?"]
}

def stable_idx(s,n,salt=""):
    return int(hashlib.sha256((s+salt).encode()).hexdigest()[:8],16)%n

def cap(s):
    s=s.strip()
    return (s[0].upper()+s[1:]).rstrip(".")+"."


def situational_options(fid,domain,v,p):
    best,good,weak,poor=p["best"],p["good"],p["weak"],p["poor"]
    if v==2:
        best="Pilih tindakan yang memberi kesan awal paling membina: "+best
        good="Ambil langkah sementara yang agak membantu: "+good
        weak="Tangguhkan penyelesaian dengan cara ini: "+weak
        poor="Bertindak segera dengan cara ini: "+poor
    elif v==3:
        best="Ambil kira sudut pandang semua pihak lalu "+best
        good="Cuba memahami pihak lain tetapi hanya "+good
        weak="Kekal pada pandangan sendiri dan "+weak
        poor="Anggap sudut pandang sendiri paling tepat lalu "+poor
    elif v==4:
        best="Dapatkan fakta yang belum jelas terlebih dahulu, kemudian "+best
        good="Tangguhkan keputusan besar dan buat langkah sementara: "+good
        weak="Buat andaian awal lalu "+weak
        poor="Anggap andaian pertama sudah benar lalu "+poor
    elif v==5:
        best="Seimbangkan kedua-dua kepentingan dengan "+best
        good="Jaga satu keperluan dengan baik tetapi hanya "+good
        weak="Utamakan perkara yang paling mudah dengan "+weak
        poor="Abaikan pertukaran antara kepentingan dan "+poor
    elif v==6:
        best="Dalam kekangan yang ada, dahulukan tindakan teras: "+best
        good="Gunakan masa yang ada untuk langkah separa: "+good
        weak="Habiskan masa dengan "+weak
        poor="Pilih jalan terpantas tanpa menilai kesan: "+poor
    elif v==7:
        best="Pilih pendekatan yang paling memenuhi kriteria utama: "+best
        good="Pilih pendekatan yang munasabah tetapi terhad: "+good
        weak="Gunakan satu pertimbangan sahaja dan "+weak
        poor="Pilih tanpa perbandingan yang adil lalu "+poor
    elif v==8:
        fu=FOLLOWUPS[domain][stable_idx(fid,len(FOLLOWUPS[domain]),"fu")]
        best="Mula dengan "+best+", "+fu
        good="Mulakan dengan "+good+", kemudian nilai semula"
        weak="Buat langkah pertama yang kurang lengkap: "+weak
        poor="Mulakan dengan tindakan yang boleh menyukarkan langkah seterusnya: "+poor
    elif v==9:
        best="Elakkan andaian tentang niat, gunakan fakta yang ada dan "+best
        good="Beri ruang kepada ketidakpastian sambil "+good
        weak="Tafsir isyarat mengikut andaian sendiri lalu "+weak
        poor="Buat kesimpulan tentang niat orang lain dan "+poor
    elif v==10:
        fu=FOLLOWUPS[domain][stable_idx(fid,len(FOLLOWUPS[domain]),"fu10")]
        best="Pertimbangkan kesan kepada semua pihak, kemudian "+best+", "+fu
        good="Ambil kira sebahagian faktor dengan "+good
        weak="Fokus pada satu faktor sahaja dan "+weak
        poor="Utamakan keputusan segera tanpa menilai kesan lanjutan lalu "+poor
    opts=list(map(cap,[best,good,weak,poor])); weights=[3,2,1,0]
    perm=list(range(4)); random.Random(int(hashlib.sha256(f"{fid}:{v}:perm".encode()).hexdigest()[:8],16)).shuffle(perm)
    return [opts[i] for i in perm],[weights[i] for i in perm]


def make_sit(f,axis):
    fid=f["familyId"]; v=axis["variant"]; p=PROFILES[fid]
    scene=p["scene"]; sidx=qidx=0
    if v>1:
        sidx=stable_idx(fid,len(SCENE_SUFFIX[v]),f"s{v}"); scene+=" "+SCENE_SUFFIX[v][sidx]
    qidx=stable_idx(fid,len(QUESTION[v]),f"q{v}")
    question=scene+" "+QUESTION[v][qidx]
    opts,weights=situational_options(fid,f["domain"],v,p)
    return question,opts,weights,f"s{sidx}-q{qidx}"


def lower_first(s):
    s=s.strip()
    return s[0].lower()+s[1:] if s else s


def make_ad(fid,domain,v):
    pos=AD[fid]["positive"].rstrip("."); neg=AD[fid]["negative"].rstrip(".")
    trade={"EQ":"Jika mengelakkan rasa tidak selesa menjadi keutamaan","SQ":"Jika tindakan itu memudahkan diri atau rakan","SSQ":"Jika keputusan perlu dibuat dengan cepat"}[domain]
    intent={"EQ":"Jika niat saya ialah menjaga perasaan","SQ":"Jika niat saya baik dan mahu membantu","SSQ":"Jika niat kumpulan ialah mencapai hasil terbaik"}[domain]
    if v==1: return pos+".",True
    if v==2: return neg+".",False
    if v==3: return "Prinsip yang sama patut digunakan secara adil apabila menilai diri sendiri dan orang lain: "+lower_first(pos)+".",True
    if v==4: return "Walaupun keadaan menjadi lebih sukar atau memalukan, "+lower_first(pos)+".",True
    if v==5: return trade+", "+lower_first(neg)+".",False
    if v==6: return "Dalam hampir semua keadaan, "+lower_first(neg)+".",False
    if v==7: return "Walaupun cara melaksanakannya mungkin berubah mengikut keadaan, "+lower_first(pos)+".",True
    if v==8: return "Untuk mengurangkan kesan buruk yang mungkin muncul kemudian, "+lower_first(pos)+".",True
    if v==9: return intent+", "+lower_first(neg)+".",False
    if v==10: return "Selepas mengambil kira keadaan, kesan segera dan kesan kepada orang lain, "+lower_first(pos)+".",True
    raise ValueError(v)


def normalise(s):
    s=unicodedata.normalize("NFKD",s.lower())
    s="".join(ch for ch in s if not unicodedata.combining(ch))
    s=re.sub(r"\d+(?:[.,]\d+)?","#",s)
    s=re.sub(r"[^\w#]+"," ",s)
    return re.sub(r"\s+"," ",s).strip()


def token_set(s):
    return set(normalise(s).split())


def validate(records):
    assert len(records)==1500
    assert Counter(x["format"] for x in records)=={"SITUATIONAL":1000,"AGREE_DISAGREE":500}
    assert Counter(x["domain"] for x in records)=={"EQ":500,"SQ":500,"SSQ":500}
    assert len({x["question"] for x in records})==1500
    assert len({normalise(x["question"]) for x in records})==1500
    fam=Counter(x["repeatFamily"] for x in records)
    assert len(fam)==150 and set(fam.values())=={10}
    for x in records:
        assert x["setAssignment"] is None
        if x["format"]=="SITUATIONAL":
            assert len(x["options"])==4 and sorted(x["weights"])==[0,1,2,3]
        else:
            assert x["options"]==["Setuju","Tidak setuju"] and sorted(x["weights"])==[0,3]
    sets=[token_set(x["question"]) for x in records]
    max_pair=(0.0,None,None); warn=0
    for i in range(len(records)):
        a=sets[i]
        for j in range(i+1,len(records)):
            if records[i]["repeatFamily"]==records[j]["repeatFamily"]: continue
            b=sets[j]; score=len(a & b)/max(1,len(a | b))
            if score>max_pair[0]: max_pair=(score,records[i]["bankId"],records[j]["bankId"])
            if score>=0.72: warn+=1
            if score>=0.84:
                raise AssertionError(f"cross-family near-duplicate {score:.3f} {records[i]['bankId']} {records[j]['bankId']}")
    return max_pair,warn


def main():
    families=list(csv.DictReader(FAMILIES.open(encoding="utf-8")))
    axes=json.loads(AXES.read_text(encoding="utf-8"))
    records=[]; n=1
    for f in families:
        stream=axes["situational"] if f["format"]=="SITUATIONAL" else axes["agreeDisagree"]
        for axis in stream:
            v=int(axis["variant"])
            if f["format"]=="SITUATIONAL":
                question,options,weights,surface=make_sit(f,axis)
            else:
                question,positive=make_ad(f["familyId"],f["domain"],v)
                options=["Setuju","Tidak setuju"]; weights=[3,0] if positive else [0,3]; surface=f"ad-v{v}"
            records.append({
                "bankId":f"A{n:04d}","section":"BAHAGIAN A","domain":f["domain"],"format":f["format"],
                "repeatFamily":f["familyId"],"construct":f["construct"],"contextFamily":f["contextFamily"],
                "variant":v,"difficultyScore":round(min(4.0,float(axis["difficultyScore"])+DOMAIN_OFFSET[f["domain"]]),2),
                "cognitiveDemand":axis["cognitiveDemand"],"reasoningForm":axis["reasoningForm"],
                "presentationForm":axis["presentationForm"],"recommendedMinSetGap":10,
                "surfaceSignature":surface,"question":question,"options":options,"weights":weights,
                "patternSignature":f"{f['construct']}::{axis['reasoningForm']}::{axis['presentationForm']}",
                "setAssignment":None,"reviewStatus":"AUTHORED_STRUCTURAL_QA_PASS_EDITORIAL_REVIEW_REQUIRED"
            }); n+=1
    max_pair,warn=validate(records)
    OUT.mkdir(parents=True,exist_ok=True)
    for old in OUT.glob("a_*.jsonl"): old.unlink()
    for start in range(0,1500,100):
        end=start+100
        p=OUT/f"a_{start+1:04d}_{end:04d}.jsonl"
        p.write_text("\n".join(json.dumps(x,ensure_ascii=False,separators=(",",":")) for x in records[start:end])+"\n",encoding="utf-8")
    manifest={
        "section":"BAHAGIAN A","total":1500,"situational":1000,"agreeDisagree":500,
        "domains":dict(Counter(x["domain"] for x in records)),"repeatFamilies":150,
        "variantsPerFamily":10,"recommendedMinSetGap":10,
        "difficultyMin":min(x["difficultyScore"] for x in records),
        "difficultyMax":max(x["difficultyScore"] for x in records),
        "setAssignmentsMade":False,
        "authoringStatus":"COMPLETE_STRUCTURAL_QA_PASS_EDITORIAL_REVIEW_REQUIRED"
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    QA.write_text(
        "# PKSK Master Bank Bahagian A — QA\n\n"
        "- Total authored items: **1,500**\n"
        "- Situational graded-response: **1,000**\n"
        "- Setuju/Tidak setuju: **500**\n"
        "- EQ / SQ / SSQ: **500 / 500 / 500**\n"
        "- Repeat families: **150**, each with **10** materially different reasoning/difficulty variants\n"
        "- Exact question duplicates: **0**\n"
        "- Normalised question duplicates: **0**\n"
        "- Hard cross-family similarity threshold (Jaccard >= 0.84): **PASS**\n"
        f"- Highest cross-family token Jaccard: **{max_pair[0]:.3f}** ({max_pair[1]} vs {max_pair[2]})\n"
        f"- Similarity warnings >= 0.72: **{warn}** (warning only; must be considered during editorial review/assembly)\n"
        "- Set assignment performed: **NO**\n"
        "- Minimum repeat-family spacing reserved for assembly: **10 sets**\n\n"
        "## Release rule\n\n"
        "These items are the completed Bahagian A authoring bank, not final Set 01–50 placement. "
        "Do not assemble them into sets until editorial QA is completed across the entire bank and Bahagian B/C banks are also complete.\n",
        encoding="utf-8")
    print("PASS: complete Bahagian A master bank",manifest)
    print("Cross-family max Jaccard",max_pair,"warnings",warn)

if __name__=="__main__":
    main()
