const DATA={
 ms:[
  {id:'kucing',word:'Kucing',sound:'Miaow!',emoji:'🐱',color:'#fff0c2'},
  {id:'bola',word:'Bola',sound:'Bola!',emoji:'⚽',color:'#dff1ff'},
  {id:'susu',word:'Susu',sound:'Susu!',emoji:'🥛',color:'#ddf7ec'},
  {id:'makan',word:'Makan',sound:'Makan!',emoji:'🍚',color:'#ffe4eb'}
 ],
 en:[
  {id:'cat',word:'Cat',sound:'Meow!',emoji:'🐱',color:'#fff0c2'},
  {id:'ball',word:'Ball',sound:'Ball!',emoji:'⚽',color:'#dff1ff'},
  {id:'milk',word:'Milk',sound:'Milk!',emoji:'🥛',color:'#ddf7ec'},
  {id:'eat',word:'Eat',sound:'Eat!',emoji:'🍚',color:'#ffe4eb'}
 ]
};
let lang=localStorage.getItem('reqooLang')||'ms';
const app=document.getElementById('app');
const t=(ms,en)=>lang==='ms'?ms:en;
function speak(text){if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang==='ms'?'ms-MY':'en-US';u.rate=.68;u.pitch=1.08;speechSynthesis.speak(u)}
function home(){
 const items=DATA[lang];
 app.innerHTML=`<div class="app"><main class="phone"><div class="world"><div class="sun">☀️</div><div class="cloud one">☁️</div><div class="cloud two">☁️</div><div class="hill a"></div><div class="hill b"></div><div class="grass"></div><div class="birds">🕊️　🕊️</div><div class="home-cat" id="homeCat">🐱</div></div><header class="top"><div class="logo">REQOO.PLAY</div><button class="lang" id="lang">${lang==='ms'?'BM':'BI'} ▾</button></header><section class="welcome"><div class="welcome-buddy">🧸</div><h1>${t('Jom Main!','Let’s Play!')}</h1><p>${t('Mari bermain dan belajar bersama.','Let’s play and learn together.')}</p></section><section class="word-orbs">${items.map((d,i)=>`<button class="word-orb orb-${i}" data-id="${d.id}" style="--orb:${d.color}"><span>${d.emoji}</span><b>${d.word}</b></button>`).join('')}</section><div class="play-hint">👆 ${t('Sentuh sesuatu untuk bermain','Tap something to play')}</div><div class="parent-mini">💡 ${t('Ibu/ayah: sebut dahulu, tunggu sekejap, kemudian ikut minat anak.','Parent: model the word, pause, then follow your child’s interest.')}</div></main></div>`;
 document.getElementById('lang').onclick=()=>{lang=lang==='ms'?'en':'ms';localStorage.setItem('reqooLang',lang);home()};
 document.querySelectorAll('.word-orb').forEach(b=>b.onclick=()=>lesson(b.dataset.id));
 document.getElementById('homeCat').onclick=()=>speak(t('Kucing!','Cat!'));
 setTimeout(()=>speak(t('Jom main!','Let’s play!')),700);
}
function find(id){return DATA[lang].find(x=>x.id===id)||DATA[lang][0]}
function lesson(id){
 const d=find(id);
 app.innerHTML=`<div class="app"><main class="phone"><div class="scene"><div class="world"><div class="sun">☀️</div><div class="cloud one">☁️</div><div class="cloud two">☁️</div><div class="hill a"></div><div class="hill b"></div><div class="grass"></div><div class="home-cat lesson-cat" id="cat">🐱</div></div><button class="back" id="back">← ${t('Jom Main','Play')}</button><div class="lesson-copy"><div class="bigword">${d.word}</div><div class="sub">${t('Dengar… lihat… dan cuba sebut.','Listen… look… and try to say it.')}</div></div><button class="object" id="object" aria-label="${d.word}">${d.emoji}</button><div class="cat-label">${d.word}</div><div class="parent-card"><strong>👩‍👦 ${t('Cuba dengan anak','Try with your child')}</strong>${t('Sebut perlahan: '+d.word+'. Tunggu sekejap. Anak boleh tengok, tunjuk, buat bunyi atau cuba sebut.','Say slowly: '+d.word+'. Pause. Your child can look, point, make a sound or try the word.')}</div><div class="scene-ui"><button id="speak">🔊 ${t('Dengar','Listen')}</button><button id="repeat">🔁 ${t('Lagi','Again')}</button></div></div></main></div>`;
 const say=()=>speak(`${d.word}. ${d.sound}`);
 document.getElementById('back').onclick=home;
 document.getElementById('speak').onclick=say;
 document.getElementById('repeat').onclick=say;
 document.getElementById('cat').onclick=say;
 document.getElementById('object').onclick=say;
 setTimeout(say,700);
}
home();
