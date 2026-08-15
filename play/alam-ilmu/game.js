const WORLD = {
  title: 'Dunia 1 — Alam Ilmu',
  levels: [
    { id: 1, name: 'Pintu Ilmu', topic: 'Bahasa Melayu', question: 'Pilih perkataan yang betul: Saya ___ buku.', options: ['membaca','dibaca','bacaan'], answer: 0 },
    { id: 2, name: 'Laluan Kata', topic: 'Bahasa Melayu', question: 'Yang manakah kata nama?', options: ['berlari','sekolah','cantik'], answer: 1 },
    { id: 3, name: 'Sungai Nombor', topic: 'Matematik', question: 'Berapakah 7 + 5?', options: ['10','12','14'], answer: 1 },
    { id: 4, name: 'Perpustakaan', topic: 'Sains', question: 'Apakah yang diperlukan tumbuhan untuk membuat makanan?', options: ['Cahaya matahari','Batu','Pasir'], answer: 0 },
    { id: 5, name: 'Cabaran Akhir', topic: 'PKSK', question: 'Cari jawapan paling sesuai untuk situasi ini.', options: ['A','B','C'], answer: 1 }
  ]
};

let levelIndex = 0, score = 0, stars = 0;
const root = document.getElementById('game');

const esc = (s) => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

function renderMap() {
  root.innerHTML = `
    <main class="shell">
      <header class="top"><strong>REQOO<span>.PLAY</span></strong><div>⭐ ${stars} &nbsp; <b>${score} XP</b></div></header>
      <section class="hero"><small>WORLD 01</small><h1>${WORLD.title}</h1><p>Pilih laluan pengembaraan.</p></section>
      <section class="map">
        ${WORLD.levels.map((l,i)=>`<button class="node ${i<=levelIndex?'open':'locked'}" ${i<=levelIndex?'':'disabled'} onclick="startLevel(${i})"><b>${i<=levelIndex?l.id:'🔒'}</b><span>${esc(l.name)}</span><em>${esc(l.topic)}</em></button>`).join('')}
      </section>
      <footer>Prototype v0.2 • Foundation build</footer>
    </main>`;
}

function startLevel(i) {
  levelIndex = i;
  const q = WORLD.levels[i];
  root.innerHTML = `
    <main class="shell play">
      <header class="top"><button class="back" onclick="renderMap()">← Dunia</button><div>⭐ ${stars} &nbsp; <b>${score} XP</b></div></header>
      <section class="question-head"><small>LEVEL ${q.id} • ${esc(q.topic)}</small><h1>${esc(q.name)}</h1></section>
      <article class="question-card"><h2>${esc(q.question)}</h2></article>
      <section class="answers">${q.options.map((o,i)=>`<button onclick="answer(${i})">${esc(o)}</button>`).join('')}</section>
    </main>`;
}

function answer(choice) {
  const q = WORLD.levels[levelIndex];
  const correct = choice === q.answer;
  if(correct){ score += 100; stars = Math.min(5, stars+1); if(levelIndex < WORLD.levels.length-1) levelIndex++; }
  const title = correct ? 'Hebat! 🎉' : 'Belum tepat';
  const msg = correct ? 'Jawapan betul. Teruskan pengembaraan!' : `Jawapan yang betul: ${q.options[q.answer]}`;
  root.innerHTML = `<main class="shell result"><div class="result-card"><div class="result-icon">${correct?'✓':'!'}</div><small>${correct?'JAWAPAN BETUL':'CUBA LAGI'}</small><h1>${title}</h1><p>${esc(msg)}</p><div class="reward">⭐ ${stars} &nbsp; • &nbsp; ${score} XP</div><button onclick="renderMap()">Kembali ke Dunia</button></div></main>`;
}

window.startLevel = startLevel;
window.answer = answer;
window.renderMap = renderMap;
renderMap();
