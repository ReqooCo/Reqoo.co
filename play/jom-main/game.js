const DATA={
 ms:[
  {id:'kucing',word:'Kucing',emoji:'🐱',sound:'Miaow!',scene:'Hai kucing! Mari dengar dan sebut bersama.'},
  {id:'bola',word:'Bola',emoji:'⚽',sound:'Bola!',scene:'Bola bergerak. Kita sebut: bola.'},
  {id:'susu',word:'Susu',emoji:'🥛',sound:'Susu!',scene:'Masa minum susu. Kita sebut: susu.'},
  {id:'makan',word:'Makan',emoji:'🍚',sound:'Makan!',scene:'Jom makan. Kita sebut: makan.'}
 ],
 en:[
  {id:'cat',word:'Cat',emoji:'🐱',sound:'Meow!',scene:'Hello cat! Listen and say it together.'},
  {id:'ball',word:'Ball',emoji:'⚽',sound:'Ball!',scene:'The ball is moving. Say: ball.'},
  {id:'milk',word:'Milk',emoji:'🥛',sound:'Milk!',scene:'Time for milk. Say: milk.'},
  {id:'eat',word:'Eat',emoji:'🍚',sound:'Eat!',scene:'Let’s eat. Say: eat.'}
 ]
};
let lang=localStorage.getItem('reqooLang')||'ms';
const app=document.getElementById('app');
const t=(ms,en)=>lang==='ms'?ms:en;
function speak(text){if(!('speechSynthesis'in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang=lang==='ms'?'ms-MY':'en-US';u.rate=.72;u.pitch=1.08;speechSynthesis.speak(u)}
function home(){app.innerHTML=`<div class="app"><main class="phone"><header class="top"><div class="logo">REQOO.PLAY</div><button class="lang" id="lang">${lang==='ms'?'BM':'BI'} ▾</button></header><section class="hero"><div class="buddy">🧸</div><h1>${t('Jom Main!','Let’s Play!')}</h1><p>${t('Dengar • Lihat • Tiru • Berkomunikasi','Listen • Look • Copy • Communicate')}</p></section><section class="cards"><button class="card animal" data-id="kucing"><span class="emoji">🐱</span><b>${t('Kucing','Cat')}</b><small>${t('Dengar bunyi & nama','Hear the sound & name')}</small></button><button class="card things" data-id="bola"><span class="emoji">⚽</span><b>${t('Bola','Ball')}</b><small>${t('Pilih & minta','Choose & request')}</small></button><button class="card food" data-id="susu"><span class="emoji">🥛</span><b>${t('Susu','Milk')}</b><small>${t('Perkataan harian','Everyday word')}</small></button><button class="card actions" data-id="makan"><span class="emoji">🍚</span><b>${t('Makan','Eat')}</b><small>${t('Kata kerja mudah','Simple action')}</small></button></section><div class="parent-note"><strong>💡 ${t('Untuk ibu & ayah','For parents')}</strong>${t('Jangan paksa anak ulang. Sebut dahulu, tunggu sekejap, kemudian ikut minat anak. Setiap cubaan berkomunikasi dikira berjaya.','Don’t force repetition. Model the word, pause, follow your child’s interest, and celebrate every communication attempt.')}</div></main></div>`;document.getElementById('lang').onclick=()=>{lang=lang==='ms'?'en':'ms';localStorage.setItem('reqooLang',lang);home()};document.querySelectorAll('.card').forEach(b=>b.onclick=()=>lesson(b.dataset.id))}
function find(id){return DATA[lang].find(x=>x.id===id)||DATA[lang][0]}
function lesson(id){const d=find(id);app.innerHTML=`<div class="app"><main class="phone"><section class="lesson"><button class="back" id="back">← ${t('Jom Main','Play')}</button><div class="scene"><div class="sun">☀️</div><div class="character">🧸</div><button class="object" id="object" aria-label="${d.word}">${d.emoji}</button></div><div class="word">${d.word}</div><div class="phrase">${d.scene}</div><button class="speak" id="speak">🔊 ${t('Dengar & Sebut Bersama','Listen & Say Together')}</button><button class="repeat" id="repeat">🔁 ${t('Lagi','Again')}</button><div class="parent-card"><strong>👩‍👦 ${t('Cuba dengan anak','Try with your child')}</strong>${t('Sebut perkataan dengan perlahan. Beri ruang untuk anak melihat, menunjuk, membuat bunyi atau cuba menyebut. Jangan betulkan setiap percubaan.','Say the word slowly. Give your child time to look, point, make a sound, or try the word. Don’t correct every attempt.')}</div><button class="finish" id="finish">${t('Selesai • Pilih aktiviti lain','Done • Choose another')}</button></section></main></div>`;const say=()=>speak(`${d.word}. ${d.sound}`);document.getElementById('back').onclick=home;document.getElementById('speak').onclick=say;document.getElementById('repeat').onclick=say;document.getElementById('object').onclick=say;document.getElementById('finish').onclick=home;setTimeout(say,500)}
home();
