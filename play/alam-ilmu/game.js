const WORLD = {
  title: 'Dunia 1 — Alam Ilmu',
  levels: [
    { id: 1, name: 'Pintu Ilmu', topic: 'Bahasa Melayu', icon: '✦', question: 'Pilih perkataan yang betul: Saya ___ buku.', options: ['membaca','dibaca','bacaan'], answer: 0 },
    { id: 2, name: 'Laluan Kata', topic: 'Bahasa Melayu', icon: 'Aa', question: 'Yang manakah kata nama?', options: ['berlari','sekolah','cantik'], answer: 1 },
    { id: 3, name: 'Sungai Nombor', topic: 'Matematik', icon: '＋', question: 'Berapakah 7 + 5?', options: ['10','12','14'], answer: 1 },
    { id: 4, name: 'Perpustakaan', topic: 'Sains', icon: '⌘', question: 'Apakah yang diperlukan tumbuhan untuk membuat makanan?', options: ['Cahaya matahari','Batu','Pasir'], answer: 0 },
    { id: 5, name: 'Cabaran Akhir', topic: 'PKSK', icon: '★', question: 'Cari jawapan paling sesuai untuk situasi ini.', options: ['A','B','C'], answer: 1 }
  ]
};

let levelIndex = 0, score = 0, stars = 0;
const root = document.getElementById('game');
const esc = (s) => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

function renderMap(){
  root.innerHTML = `<main class="shell map-shell">
    <header class="top"><strong>REQOO<span>.PLAY</span></strong><div class="stats"><span>⭐ ${stars}</span><b>${score} XP</b></div></header>
    <section class="hero">
      <div class="world-badge">WORLD 01</div><h1>${WORLD.title}</h1><p>Mulakan pengembaraan. Setiap cabaran membuka laluan seterusnya.</p>
      <div class="guide"><div class="guide-orb">R</div><div><b>Jom, kita belajar!</b><small>Pilih satu cabaran untuk bermula.</small></div></div>
    </section>
    <section class="journey">
      <div class="journey-line"></div>
      ${WORLD.levels.map((l,i)=>`<button class="node ${i<=levelIndex?'open':'locked'}" ${i<=levelIndex?'':'disabled'} onclick="startLevel(${i})">
        <span class="node-icon">${i<=levelIndex?l.icon:'🔒'}</span><b>${l.name}</b><em>${l.topic}</em><small>${i===0&&levelIndex===0?'MULA DI SINI':i<=levelIndex?'TERSEDIA':'TERKUNCI'}</small>
      </button>`).join('')}
    </section>
    <footer>Reqoo Play • Alam Ilmu • Foundation v0.3</footer>
  </main>`;
}

function startLevel(i){
  levelIndex=i; const q=WORLD.levels[i];
  root.innerHTML=`<main class="shell play-shell">
    <header class="top"><button class="back" onclick="renderMap()">← <span>Dunia</span></button><div class="stats"><span>⭐ ${stars}</span><b>${score} XP</b></div></header>
    <section class="question-head"><div class="world-badge">LEVEL ${q.id}</div><h1>${q.name}</h1><p>${q.topic}</p></section>
    <div class="progress"><span style="width:${((i+1)/WORLD.levels.length)*100}%"></span></div>
    <article class="question-card"><div class="question-number">CABARAN ${q.id} / ${WORLD.levels.length}</div><h2>${q.question}</h2></article>
    <section class="answers">${q.options.map((o,i)=>`<button onclick="answer(${i})"><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span><i>›</i></button>`).join('')}</section>
    <footer>Pilih jawapan terbaik. Tiada penalti untuk mencuba.</footer>
  </main>`;
}

function answer(choice){
  const q=WORLD.levels[levelIndex], correct=choice===q.answer;
  if(correct){score+=100;stars=Math.min(5,stars+1);if(levelIndex<WORLD.levels.length-1) levelIndex++;}
  const title=correct?'Hebat!':'Belum tepat';
  const msg=correct?'Jawapan betul. Laluan seterusnya telah dibuka!':`Jawapan yang betul: ${q.options[q.answer]}`;
  root.innerHTML=`<main class="shell result"><div class="result-card ${correct?'success':'retry'}"><div class="result-icon">${correct?'✓':'!'}</div><small>${correct?'CABARAN SELESAI':'COBA LAGI'}</small><h1>${title}</h1><p>${esc(msg)}</p><div class="reward"><span>⭐ ${stars}</span><b>${score} XP</b></div><button onclick="renderMap()">Kembali ke Dunia <span>→</span></button></div></main>`;
}

window.startLevel=startLevel;window.answer=answer;window.renderMap=renderMap;renderMap();