const WORLD = {
  title: 'Dunia 1 — Alam Ilmu',
  levels: [
    { id: 1, name: 'Pintu Ilmu', topic: 'Bahasa Melayu', icon: '✦', mission: 'Bantu Reqoo membuka Pintu Ilmu dengan memilih perkataan yang paling tepat.', question: 'Saya ___ buku di perpustakaan.', options: ['membaca', 'dibaca', 'bacaan'], answer: 0, explanation: '“Saya membaca buku” ialah ayat yang betul.' },
    { id: 2, name: 'Laluan Kata', topic: 'Bahasa Melayu', icon: 'Aa', question: 'Yang manakah kata nama?', options: ['berlari', 'sekolah', 'cantik'], answer: 1 },
    { id: 3, name: 'Sungai Nombor', topic: 'Matematik', icon: '＋', question: 'Berapakah 7 + 5?', options: ['10', '12', '14'], answer: 1 },
    { id: 4, name: 'Perpustakaan', topic: 'Sains', icon: '⌘', question: 'Apakah yang diperlukan tumbuhan untuk membuat makanan?', options: ['Cahaya matahari', 'Batu', 'Pasir'], answer: 0 },
    { id: 5, name: 'Cabaran Akhir', topic: 'PKSK', icon: '★', question: 'Cari jawapan paling sesuai untuk situasi ini.', options: ['A', 'B', 'C'], answer: 1 }
  ]
};

let levelIndex = 0;
let score = Number(localStorage.getItem('reqooPlayXP') || 0);
let stars = Number(localStorage.getItem('reqooPlayStars') || 0);
let lives = 3;
let level1Step = 0;
const root = document.getElementById('game');
const esc = (s) => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

function saveProgress(){
  localStorage.setItem('reqooPlayXP', score);
  localStorage.setItem('reqooPlayStars', stars);
}

function sceneDecor(){
  return `<div class="scene" aria-hidden="true"><div class="sun"></div><div class="cloud cloud-a"></div><div class="cloud cloud-b"></div><div class="mountain m-a"></div><div class="mountain m-b"></div><div class="hill"></div><div class="tree t-a">🌲</div><div class="tree t-b">🌳</div><div class="tree t-c">🌲</div><div class="spark s-a">✦</div><div class="spark s-b">✦</div></div>`;
}

function topBar(back=true){
  return `<header class="top">${back?'<button class="back" onclick="renderMap()">← <span>Dunia</span></button>':'<strong>REQOO<span>.PLAY</span></strong>'}<div class="stats"><span>⭐ ${stars}</span><b>${score} XP</b></div></header>`;
}

function renderMap(){
  const unlocked = Math.min(WORLD.levels.length - 1, Math.floor(stars));
  root.innerHTML = `${sceneDecor()}<main class="shell map-shell">${topBar(false)}
    <section class="hero"><div class="world-badge">WORLD 01</div><h1>${WORLD.title}</h1><p>Terokai dunia ilmu. Lengkapkan satu cabaran untuk membuka laluan seterusnya.</p>
      <div class="guide"><img src="./assets/reqoo-guide.svg" alt="Reqoo guide"><div><b>Jom, kita belajar!</b><small>Setiap jawapan membawa kamu lebih jauh.</small></div></div>
    </section>
    <section class="journey"><div class="journey-line"></div>${WORLD.levels.map((l,i)=>{const open=i===0||i<=unlocked;return `<button class="node ${open?'open':'locked'}" ${open?'':'disabled'} onclick="startLevel(${i})"><span class="node-icon">${open?l.icon:'🔒'}</span><b>${l.name}</b><em>${l.topic}</em><small>${i===0&&stars===0?'MULA DI SINI':open?'TERSEDIA':'TERKUNCI'}</small></button>`;}).join('')}</section>
    <footer>Reqoo Play • Alam Ilmu • Foundation v0.5</footer></main>`;
}

function startLevel(i){
  levelIndex=i;
  lives=3;
  if(i===0){ level1Step=0; renderLevel1Intro(); return; }
  renderQuestion();
}

function renderLevel1Intro(){
  root.innerHTML = `${sceneDecor()}<main class="shell mission-shell">${topBar(true)}
    <section class="mission-card">
      <div class="mission-badge">MISSION 01</div>
      <div class="gate"><div class="gate-arch"><span>✦</span><b>ILMU</b></div></div>
      <img class="mission-guide" src="./assets/reqoo-guide.svg" alt="Reqoo">
      <div class="mission-copy"><p class="eyebrow">PINTU ILMU • BAHASA MELAYU</p><h1>Pintu Ilmu terkunci!</h1><p>${WORLD.levels[0].mission}</p></div>
      <div class="mission-objective"><span>🎯</span><div><b>Objektif</b><small>Pilih jawapan yang tepat untuk mendapatkan kunci ilmu.</small></div></div>
      <button class="primary-action" onclick="beginLevel1()">Mula Misi <span>→</span></button>
    </section>
  </main>`;
}

function beginLevel1(){
  level1Step=1;
  renderQuestion();
}

function renderQuestion(){
  const q=WORLD.levels[levelIndex];
  const isFirst=levelIndex===0;
  root.innerHTML = `${sceneDecor()}<main class="shell play-shell">${topBar(true)}
    <section class="question-head">${isFirst?'<img class="level-guide" src="./assets/reqoo-guide.svg" alt="">':''}<div><div class="world-badge">LEVEL ${q.id}</div><h1>${q.name}</h1><p>${q.topic} • ${isFirst?'Misi 1 daripada 3':'Cabaran'}</p></div></section>
    <div class="play-meta"><span>❤️ ${lives}</span><span>🎯 ${isFirst?'Kunci Ilmu':'Cabaran'}</span><span>⭐ ${stars}</span></div>
    <div class="progress"><span style="width:${isFirst?(level1Step===1?34:100):((levelIndex+1)/WORLD.levels.length)*100}%"></span></div>
    <article class="question-card adventure-card"><div class="question-number">${isFirst?'BUKA PINTU ILMU':'CABARAN '+q.id+' / '+WORLD.levels.length}</div><h2>${q.question}</h2><p class="hint-text">Pilih satu jawapan. Kamu boleh cuba lagi jika tersilap.</p></article>
    <section class="answers">${q.options.map((o,i)=>`<button class="answer-gate" onclick="answer(${i})"><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span><i>›</i></button>`).join('')}</section>
    <footer>Reqoo akan beri maklum balas selepas setiap pilihan.</footer>
  </main>`;
}

function answer(choice){
  const q=WORLD.levels[levelIndex];
  const correct=choice===q.answer;
  if(!correct){
    lives=Math.max(0,lives-1);
    showFeedback(false,q);
    return;
  }
  score+=100;
  stars=Math.min(5,stars+1);
  saveProgress();
  showFeedback(true,q);
}

function showFeedback(correct,q){
  const nextAvailable=levelIndex<WORLD.levels.length-1;
  const title=correct?'Pintu terbuka!':'Belum tepat';
  const msg=correct?(q.explanation||'Jawapan betul. Laluan seterusnya telah dibuka!'):`Cuba lagi. Jawapan yang betul ialah “${q.options[q.answer]}”.`;
  root.innerHTML=`<main class="shell result">${sceneDecor()}${correct?'<div class="confetti" aria-hidden="true">✦　★　✦　★　✦</div>':''}<div class="result-card ${correct?'success':'retry'}"><img class="result-guide" src="./assets/reqoo-guide.svg" alt="Reqoo"><div class="result-icon">${correct?'✓':'!'}</div><small>${correct?'MISI BERJAYA':'CUBA LAGI'}</small><h1>${title}</h1><p>${esc(msg)}</p><div class="reward"><span>⭐ ${stars}</span><b>+${correct?100:0} XP</b></div>${correct?`<div class="unlock-note">🔓 ${nextAvailable?'Laluan seterusnya telah dibuka':'Dunia hampir lengkap!'}</div>`:`<div class="lives-note">❤️ ${lives} percubaan tinggal</div>`}<button onclick="${correct?'renderMap()':lives>0?'renderQuestion()':'renderLevel1Intro()'}">${correct?'Kembali ke Dunia':lives>0?'Cuba Lagi':'Mulakan Semula'} <span>→</span></button></div></main>`;
}

window.startLevel=startLevel;
window.answer=answer;
window.renderMap=renderMap;
window.beginLevel1=beginLevel1;
renderMap();