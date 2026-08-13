
const PKSK_ACCESS_API="https://script.google.com/macros/s/AKfycbwVFg5bxd2EsbLxUe2CsVHqRE-yVNraIJBSx8_pDsrGvrtTUiVdJwVdJwhJbbacxpci/exec";
function pkskApi(action,data,done){
  const cb="pkskGate_"+Date.now()+"_"+Math.floor(Math.random()*99999);
  const sc=document.createElement("script");
  window[cb]=function(r){delete window[cb];sc.remove();done(r)};
  const p=new URLSearchParams({action,callback:cb,...data});
  sc.src=PKSK_ACCESS_API+"?"+p.toString();
  sc.onerror=()=>{delete window[cb];sc.remove();done({ok:false,error:"Sambungan akses gagal."})};
  document.body.appendChild(sc);
}
function pkskLicense(){return (localStorage.getItem("reqoo_pksk_license")||"").trim().toUpperCase();}
function pkskRequireAccess(next){
  const code=pkskLicense();
  if(!code){location.href="../access/";return;}
  const deviceId=pkskDeviceId();
  pkskApi("registerDevice",{code,deviceId,userAgent:navigator.userAgent},function(r){
    if(r&&r.ok){next();return;}
    localStorage.removeItem("reqoo_pksk_license");
    alert((r&&r.error)||"Akses tidak sah atau peranti telah melebihi had.");
    location.href="../access/";
  });
}
function pkskDeviceId(){
  let id=localStorage.getItem("reqoo_pksk_device_id");
  if(!id){id="DEV-"+crypto.getRandomValues(new Uint32Array(3)).join("-")+"-"+Date.now().toString(36);localStorage.setItem("reqoo_pksk_device_id",id)}
  return id;
}
function pkskDashApi(action,data,done){pkskApi(action,data,done)}
function exitToDashboard(){
  if(phase==="c"){localStorage.setItem(`pksk-set${String(setNo).padStart(2,"0")}-writing`,JSON.stringify({wTimer,selectedTopic,text:$("essay").value}))}
  if(phase!=="idle"&&phase!=="done"&&phase!=="abBrief"&&phase!=="cBrief"){
    if(!confirm("Keluar ke dashboard? Jawapan yang telah disimpan pada peranti akan kekal. Anda boleh sambung semula kemudian."))return;
    if(phase==="ab")persistSession();
  }
  clearInterval(interval);clearInterval(winterval);location.href="../access/";
}
function toggleMobileNav(force){
  const card=$("navCard");if(!card)return;
  const open=typeof force==="boolean"?force:!card.classList.contains("mobile-open");
  card.classList.toggle("mobile-open",open);
  document.body.classList.toggle("nav-open",open);
}

// Audio pengawas: fail M4A dalam folder audio.
let bank=null,qs=[],writing=[],setNo=1,phase="idle",qidx=0,answers={},times={},qStarted=0,timer=5400,wTimer=2700,interval=null,winterval=null,selectedTopic=0,abStartedAt=null,cStartedAt=null;
const $=id=>document.getElementById(id);
let loadToken=0;
async function load(n=setNo){
 const requested=Math.max(1,Math.min(50,Number(n)||1));
 const token=++loadToken;
 const groupStart=Math.floor((requested-1)/10)*10+1;
const groupEnd=groupStart+9;
const group=`SET ${String(groupStart).padStart(2,"0")}-${String(groupEnd).padStart(2,"0")}`;
const r=await fetch(`sets/${encodeURIComponent(group)}/data/set${String(requested).padStart(2,"0")}.json`);
 if(!r.ok) throw new Error(`Set ${requested} tidak dapat dimuat`);
 const data=await r.json();
 // If another set was selected while this request was loading,
 // ignore the older response so it cannot switch the app back.
 if(token!==loadToken) return false;
 setNo=requested;
 bank=data;qs=bank.questions;writing=bank.writing;
 updateSetUI();
 return true;
}
function updateSetUI(){
 const label=`Set ${String(setNo).padStart(2,"0")}`;
 document.querySelectorAll(".set-label").forEach(el=>el.textContent=label);
 const sel=$("setSelect"); if(sel) sel.value=String(setNo);
 const next=$("nextSetLabel");
 if(next) next.textContent=setNo<50?`SET ${String(setNo+1).padStart(2,"0")} →`:"KEMBALI KE SENARAI SET";
}
async function selectSet(n){ if(!pkskLicense()){location.href='../access/';return;} 
 clearInterval(interval); clearInterval(winterval);
 phase="idle";qidx=0;answers={};times={};timer=5400;wTimer=2700;selectedTopic=0;
 const ok=await load(n);
 if(ok){
   localStorage.setItem("pksk-selected-set",String(setNo));
   show("start");
 }
}
function show(id){["start","briefing","exam","writing","result"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function audio(name){const a=new Audio("audio/"+name);a.preload="auto";return a}
const audioFiles={ab:audio("arahan-ab.m4a"),c:audio("arahan-c.m4a"),ten:audio("amaran-10-minit.m4a"),five:audio("amaran-5-minit.m4a"),end:audio("masa-tamat.m4a")};
function playAnnouncement(key,after){
 const a=audioFiles[key]; $("voiceStatus").textContent="Sila dengar arahan sehingga selesai.";
 let finished=false;
 const done=()=>{if(finished)return;finished=true;a.onended=null;setTimeout(after,1400)};
 a.onended=done;
 a.onerror=()=>{if(finished)return;finished=true;setTimeout(after,2500)};
 const p=a.play(); if(p&&p.catch)p.catch(()=>{setTimeout(after,2500)});
}
function countdown(callback){
 $("voiceStatus").textContent="Arahan selesai. Bersedia…";
 let n=3;$("count").textContent=n;
 const t=setInterval(()=>{n--;if(n>0)$("count").textContent=n;else{$("count").textContent="MULA";clearInterval(t);setTimeout(callback,700)}},1000)
}
function beginABBriefing(){ if(!pkskLicense()){location.href='../access/';return;} 
 phase="abBrief";show("briefing");$("briefingTitle").textContent="Bahagian A + B";$("count").textContent="";
 $("voiceText").textContent="Calon diminta memberikan perhatian. Sila dengar arahan pengawas sehingga selesai.";
 playAnnouncement("ab",()=>countdown(startAB));
}
function startAB(){
 phase="ab";qidx=0;answers={};times={};timer=5400;
 const saved=JSON.parse(localStorage.getItem(`pksk-set${String(setNo).padStart(2,"0")}-session`)||"null");
 if(saved){answers=saved.answers||{};times=saved.times||{};timer=typeof saved.timer==="number"?saved.timer:5400;qidx=Math.max(0,Math.min(qs.length-1,Number(saved.qidx||0)));}qStarted=Date.now();abStartedAt=Date.now();show("exam");renderTimer();renderQ();
 clearInterval(interval);interval=setInterval(()=>{timer--;renderTimer();
  if(timer===600)playAudioOnly("ten");
  if(timer===300)playAudioOnly("five");
  if(timer<=0){clearInterval(interval);playAudioOnly("end");finishAB(true)}
 },1000)
}
function playAudioOnly(key){const a=audioFiles[key];a.currentTime=0;a.play().catch(()=>{})}
function renderTimer(){const m=Math.floor(timer/60).toString().padStart(2,"0"),s=(timer%60).toString().padStart(2,"0");$("timer").textContent=`${m}:${s}`}
function saveTime(){if(qStarted){times[qidx]=(times[qidx]||0)+(Date.now()-qStarted);qStarted=Date.now();persistSession();}}
function renderQ(){
 const q=qs[qidx];$("sectionPill").textContent=q.section;$("cat").textContent=q.category;$("qnum").textContent=`Soalan ${qidx+1} daripada ${qs.length}`;
 const qGroupStart=Math.floor((setNo-1)/10)*10+1;
const qGroupEnd=qGroupStart+9;
const qGroup=`SET ${String(qGroupStart).padStart(2,"0")}-${String(qGroupEnd).padStart(2,"0")}`;
$("qvisual").innerHTML=q.visual?`<div class="question-visual"><img src="sets/${encodeURIComponent(qGroup)}/assets/visuals/${q.visual}" alt="Rajah soalan"></div>`:"";$("qtext").textContent=q.question;$("answeredCount").textContent=`${Object.keys(answers).length} / ${qs.length}`;
 $("opts").innerHTML=q.options.map((o,i)=>`<label class="opt ${answers[q.id]===i?"selected":""}"><input type="radio" name="opt" ${answers[q.id]===i?"checked":""} onchange="answer(${i})"><span><b>${String.fromCharCode(65+i)}.</b> ${escapeHtml(o)}</span></label>`).join("");
 $("prevBtn").disabled=qidx===0;$("nextBtn").textContent=qidx===qs.length-1?"HANTAR A + B →":"SETERUSNYA →";
 $("grid").innerHTML=qs.map((x,i)=>`<button class="${answers[x.id]!==undefined?"done ":""}${i===qidx?"current":""}" onclick="gotoQ(${i})">${i+1}</button>`).join("");
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let lastSessionSync=0;
function persistSession(){
 localStorage.setItem(`pksk-set${String(setNo).padStart(2,"0")}-session`,JSON.stringify({answers,times,timer,qidx}));
 const now=Date.now();
 if(now-lastSessionSync>30000){lastSessionSync=now;pkskDashApi("saveProgress",{code:pkskLicense(),deviceId:pkskDeviceId(),setNo:setNo,completed:false,score:0,answered:Object.keys(answers).length,timeUsed:Math.round((5400-timer)/60)},()=>{})}
}
function answer(i){answers[qs[qidx].id]=i;persistSession();renderQ();toggleMobileNav(false)}
function gotoQ(i){saveTime();qidx=i;renderQ();toggleMobileNav(false)}
function nextQ(){saveTime();if(qidx<qs.length-1){qidx++;renderQ()}else confirmFinish()}
function prevQ(){if(qidx>0){saveTime();qidx--;renderQ()}}
function confirmFinish(){if(confirm("Hantar Bahagian A + B sekarang? Selepas dihantar, anda akan terus ke Bahagian C."))finishAB(false)}
function finishAB(auto){
 if(phase!=="ab")return;saveTime();clearInterval(interval);phase="cBrief";
 show("briefing");$("briefingTitle").textContent="Bahagian C — Artikulasi Penulisan";$("count").textContent="";
 $("voiceText").textContent=auto?"Masa Bahagian A dan Bahagian B telah tamat. Sila dengar arahan seterusnya untuk Bahagian C.":"Bahagian A dan Bahagian B telah selesai. Sila dengar arahan untuk Bahagian C.";
 playAnnouncement("c",()=>countdown(startWriting));
}
function startWriting(){
 phase="c";show("writing");wTimer=2700;cStartedAt=Date.now();selectedTopic=0;const ws=JSON.parse(localStorage.getItem(`pksk-set${String(setNo).padStart(2,"0")}-writing`)||"null");if(ws){wTimer=typeof ws.wTimer==="number"?ws.wTimer:2700;selectedTopic=Number(ws.selectedTopic||0)}renderWTimer();
 $("topics").innerHTML=writing.map((t,i)=>`<label class="topic ${i===selectedTopic?"selected":""}" onclick="selectTopic(${i})"><input type="radio" name="topic" ${i===selectedTopic?"checked":""}><b>${t.title}</b><span>${t.prompt}</span></label>`).join("");
 $("essay").value=ws&&typeof ws.text==="string"?ws.text:"";$("essay").oninput=()=>{updateWords();localStorage.setItem(`pksk-set${String(setNo).padStart(2,"0")}-writing`,JSON.stringify({wTimer,selectedTopic,text:$('essay').value}))};updateWords();
 clearInterval(winterval);winterval=setInterval(()=>{wTimer--;renderWTimer();
  if(wTimer===600)playAudioOnly("ten");if(wTimer===300)playAudioOnly("five");
  if(wTimer<=0){clearInterval(winterval);playAudioOnly("end");finishWriting(true)}
 },1000)
}
function selectTopic(i){selectedTopic=i;document.querySelectorAll(".topic").forEach((e,j)=>e.classList.toggle("selected",i===j));document.querySelectorAll('input[name="topic"]')[i].checked=true}
function updateWords(){const t=$("essay").value.trim(),n=t?t.split(/\s+/).length:0;$("wordCount").textContent=n+" patah perkataan";$("minStatus").textContent=n>=100?"✓ Minimum dicapai":"Minimum 100 patah perkataan"}
function renderWTimer(){const m=Math.floor(wTimer/60).toString().padStart(2,"0"),s=(wTimer%60).toString().padStart(2,"0");$("wTimer").textContent=`${m}:${s}`}
function finishWriting(auto=false){if(phase!=="c")return;clearInterval(winterval);phase="done";const text=$("essay").value.trim(),words=text?text.split(/\s+/).length:0;buildResult({topic:writing[selectedTopic],text,words,auto})}
function pct(a,b){return b?Math.round(a/b*100):0}
function bar(p){return `<div class="meter"><i style="width:${Math.min(100,p)}%"></i></div>`}
function tableA(){
 const groups={};
 qs.filter(q=>q.section==="BAHAGIAN A").forEach(q=>{
   groups[q.category]??={n:0,score:0,max:0};
   groups[q.category].n++;
   groups[q.category].max+=Math.max(...q.weights);
   if(answers[q.id]!==undefined)groups[q.category].score+=q.weights[answers[q.id]];
 });
 const items=Object.entries(groups).map(([k,v])=>{
   const p=pct(v.score,v.max);
   return `<div class="a-index"><b>${p}%</b><strong>${k}</strong><span>${v.n} item</span></div>`;
 }).join("");
 const answered=qs.filter(q=>q.section==="BAHAGIAN A"&&answers[q.id]!==undefined).length;
 return `<div class="a-note"><b>Skor item Bahagian A: ${answered}/30 dijawab</b><p>Bahagian A ialah respons bergred. Tiada paparan “betul/salah” untuk item psikometrik. Indeks di bawah menunjukkan kecenderungan respons mengikut konstruk.</p></div><div class="a-index-grid">${items}</div>`;
}
function tableB(){
 const groups={};qs.filter(q=>q.section==="BAHAGIAN B").forEach(q=>{groups[q.category]??={n:0,ans:0,correct:0};groups[q.category].n++;if(answers[q.id]!==undefined){groups[q.category].ans++;if(answers[q.id]===q.answer)groups[q.category].correct++}});
 return `<div class="table"><div class="row head"><div>Bidang</div><div>Item</div><div>Jawab</div><div>Betul</div><div>Ketepatan</div></div>`+Object.entries(groups).map(([k,v])=>{let p=pct(v.correct,v.ans);return `<div class="row"><div><b>${k}</b></div><div>${v.n}</div><div>${v.ans}</div><div>${v.correct}</div><div>${p}%${bar(p)}</div></div>`}).join("")+"</div>"
}
function reviewB(){
 const b=qs.filter(q=>q.section==="BAHAGIAN B");
 return `<div class="review-list">`+b.map((q,i)=>{
   const a=answers[q.id], status=a===undefined?"skip":(a===q.answer?"good":"bad");
   const label=status==="good"?"✓ BETUL":status==="bad"?"✕ SALAH":"○ TIDAK DIJAWAB";
   const your=a===undefined?"—":`${String.fromCharCode(65+a)}. ${escapeHtml(q.options[a])}`;
   const correct=`${String.fromCharCode(65+q.answer)}. ${escapeHtml(q.options[q.answer])}`;
   const explain=escapeHtml(q.explanation||"Semak langkah penyelesaian dan sebab jawapan ini paling tepat.");
   return `<article class="review-item ${status}"><div class="review-top"><b>${i+1}. ${escapeHtml(q.question)}</b><strong>${label}</strong></div><div class="review-answer"><span><b>Jawapan anda:</b> ${your}</span><span><b>Jawapan betul:</b> ${correct}</span></div><div class="review-explain"><b>Penerangan:</b> ${explain}</div></article>`;
 }).join("")+"</div>";
}
function syncProgressServer(score,extra){
 const code=pkskLicense();if(!code)return;
 const payload=Object.assign({code,deviceId:pkskDeviceId(),setNo:setNo,completed:true,score:Number(score||0)},extra||{});
 pkskDashApi("saveProgress",payload,function(r){if(r&&r.ok){localStorage.setItem("pksk-last-server-sync",new Date().toISOString())}});
}
function progressHistory(score){
 let h=JSON.parse(localStorage.getItem("pksk-progress")||"[]");
 const found=h.find(x=>x.set===setNo); if(found)found.score=score; else h.push({set:setNo,score});
 h.sort((a,b)=>a.set-b.set);localStorage.setItem("pksk-progress",JSON.stringify(h));
 const rows=h.map(x=>`<div class="progress-row"><b>Set ${String(x.set).padStart(2,"0")}</b><div class="progress-bar"><i style="width:${x.score}%"></i></div><span>${x.score}%</span></div>`).join("");
 return `<div class="progress-wrap">${rows||"<p>Belum ada rekod.</p>"}<p class="note">Set seterusnya akan ditambah ke graf ini apabila keputusan Set 02–100 tersedia.</p></div>`;
}
function essayAnalysis(c){
 const t=c.text,low=t.toLowerCase(),sent=t.split(/[.!?]+/).map(x=>x.trim()).filter(Boolean),paras=t.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 const markers=["selain itu","seterusnya","di samping itu","oleh itu","akhirnya","kesimpulannya","sebagai contoh","namun","walau bagaimanapun"];
 const found=markers.filter(x=>low.includes(x));
 const topicWords=c.topic.title.toLowerCase().split(/\s+/).filter(x=>x.length>3);
 const relevant=topicWords.filter(x=>low.includes(x)).length;
 const numbers=(t.match(/\b\d+(?:[.,]\d+)?\s*(?:%|peratus|orang|tahun|km|RM|juta|bilion)?\b/gi)||[]);
 const claims=numbers.length;
 let structure=c.words>=100&&sent.length>=5?"Baik":"Perlu diperkemas";
 let relevance=relevant>=1?"Ada kaitan jelas dengan tajuk":"Semak semula fokus kepada tajuk";
 let factMsg=claims?`Dikesan ${claims} angka/nilai dalam karangan. Angka dan dakwaan fakta perlu disemak dengan sumber yang sah sebelum dianggap benar.`:"Tiada angka khusus dikesan. Jika menggunakan fakta, pastikan fakta boleh disahkan.";
 return `<div class="essay-grid">
 <div class="essay-item"><b>Panjang karangan</b><p>${c.words} patah perkataan — ${c.words>=100?'<span class="good">minimum dicapai</span>':'<span class="bad">minimum belum dicapai</span>'}</p></div>
 <div class="essay-item"><b>Relevan dengan tajuk</b><p>${relevance}</p></div>
 <div class="essay-item"><b>Struktur</b><p>${paras.length} perenggan, ${sent.length} ayat. ${structure}.</p></div>
 <div class="essay-item"><b>Penanda wacana</b><p>${found.length?found.join(", "):"Belum banyak penanda wacana dikesan."}</p></div>
 <div class="essay-item"><b>Isi & huraian</b><p>${c.words>=100&&sent.length>=6?"Ada ruang yang mencukupi untuk mengembangkan isi. Semak setiap isi supaya disokong contoh atau sebab yang jelas.":"Tambah isi, sebab dan contoh supaya huraian lebih matang."}</p></div>
 <div class="essay-item"><b>Fakta / dakwaan</b><p>${factMsg}</p></div>
 </div>`
}
function goHome(){
 clearInterval(interval); clearInterval(winterval);
 phase="idle";
 show("start");
 updateSetUI();
 window.scrollTo({top:0,behavior:"smooth"});
}
async function nextSet(){
 if(setNo>=50){ goHome(); return; }
 await selectSet(setNo+1);
 window.scrollTo({top:0,behavior:"smooth"});
}
function buildResult(c){
 const a=qs.filter(q=>q.section==="BAHAGIAN A"),b=qs.filter(q=>q.section==="BAHAGIAN B");
 const aAnswered=a.filter(q=>answers[q.id]!==undefined).length;
 const aScore=a.reduce((s,q)=>s+(answers[q.id]===undefined?0:q.weights[answers[q.id]]),0);
 const aMax=a.reduce((s,q)=>s+Math.max(...q.weights),0);
 const aIndex=pct(aScore,aMax);
 const bAnswered=b.filter(q=>answers[q.id]!==undefined).length;
 const bCorrect=b.filter(q=>answers[q.id]!==undefined&&answers[q.id]===q.answer).length;
 const bWrong=bAnswered-bCorrect,bSkip=b.length-bAnswered;
 const abElapsed=90*60-timer,cElapsed=45*60-wTimer;
 const bPct=pct(bCorrect,b.length);
 $("summary").innerHTML=[
  ["A item dijawab",`${aAnswered}/30`],
  ["A indeks keseluruhan",`${aIndex}%`],
  ["B betul",`${bCorrect}/70`],
  ["B salah",bWrong],
  ["B tidak dijawab",bSkip],
  ["B ketepatan",`${bPct}%`],
  ["Masa digunakan",`${Math.floor((abElapsed+cElapsed)/60)}m`]
 ].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");
 $("aAnalysis").innerHTML=tableA();
 $("bAnalysis").innerHTML=tableB();
 $("reviewB").innerHTML=reviewB();
 $("cAnalysis").innerHTML=essayAnalysis(c);
 const slow=qs.map((q,i)=>({id:q.id,ms:times[i]||0})).filter(x=>x.ms).sort((x,y)=>y.ms-x.ms).slice(0,5);
 $("timeAnalysis").innerHTML=`<div class="table"><div class="row head"><div>Soalan paling lama</div><div>Masa</div><div></div><div></div><div></div></div>`+slow.map(x=>`<div class="row"><div>${x.id}</div><div>${Math.round(x.ms/1000)} saat</div><div></div><div></div><div></div></div>`).join("")+`</div><p class="note">“Tidak dijawab” bermaksud calon tidak memilih jawapan sebelum menghantar atau masa tamat.</p>`;
 const groups={};b.forEach(q=>{groups[q.category]??={a:0,c:0};if(answers[q.id]!==undefined){groups[q.category].a++;if(answers[q.id]===q.answer)groups[q.category].c++}});
 const weak=Object.entries(groups).filter(x=>x[1].a).sort((x,y)=>pct(x[1].c,x[1].a)-pct(y[1].c,y[1].a))[0];
 $("conclusionTitle").textContent=weak?`Fokus latihan: ${weak[0]}`:"Teruskan latihan secara konsisten";
 $("conclusion").textContent=`Anda menjawab ${Object.keys(answers).length} daripada 100 soalan A+B. Bahagian B mencatat ${bCorrect} betul, ${bWrong} salah dan ${bSkip} tidak dijawab. ${weak?`Bidang dengan ketepatan paling rendah dalam jawapan yang sempat dibuat ialah ${weak[0]}. Gunakan semakan setiap soalan untuk ulang kaji.`:"Semak setiap bidang dan ulang soalan yang mengambil masa paling lama."} Bahagian A dilaporkan sebagai indeks dan konsistensi respons, bukan betul/salah.`;
 $("progress").innerHTML=progressHistory(bPct);
 show("result");
 localStorage.setItem(`pksk-set${String(setNo).padStart(2,"0")}-result`,JSON.stringify({answers,times,c,bCorrect,bPct,aIndex}));
 syncProgressServer(bPct,{aIndex,bCorrect,bAnswered,aAnswered,timeUsed:Math.round((abElapsed+cElapsed)/60),essayWords:c.words,completed:true});
 localStorage.removeItem(`pksk-set${String(setNo).padStart(2,"0")}-session`);localStorage.removeItem(`pksk-set${String(setNo).padStart(2,"0")}-writing`);
}
const urlSet=Number(new URLSearchParams(location.search).get("set")||0);
const initialSet=urlSet>=1&&urlSet<=50?urlSet:Number(localStorage.getItem("pksk-selected-set")||1);
pkskRequireAccess(()=>load(initialSet).then(()=>updateSetUI()).catch(e=>console.error(e)));
