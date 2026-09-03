const letters=[
 {l:'A',ms:'Ayam',en:'Apple',emoji:'🐔',sound:'A'},
 {l:'B',ms:'Bola',en:'Ball',emoji:'⚽',sound:'B'},
 {l:'C',ms:'Cawan',en:'Cup',emoji:'🥤',sound:'C'},
 {l:'D',ms:'Dadu',en:'Dice',emoji:'🎲',sound:'D'},
 {l:'E',ms:'Epal',en:'Egg',emoji:'🍎',sound:'E'},
 {l:'F',ms:'Feri',en:'Fish',emoji:'🐟',sound:'F'},
 {l:'G',ms:'Gajah',en:'Goat',emoji:'🐘',sound:'G'},
 {l:'H',ms:'Harimau',en:'Hat',emoji:'🐯',sound:'H'},
 {l:'I',ms:'Ikan',en:'Ice cream',emoji:'🐟',sound:'I'},
 {l:'J',ms:'Jam',en:'Juice',emoji:'🕒',sound:'J'},
 {l:'K',ms:'Kucing',en:'Kite',emoji:'🐱',sound:'K'},
 {l:'L',ms:'Lembu',en:'Lion',emoji:'🐮',sound:'L'}
];
let lang='ms',current=null;
const app=document.getElementById('app');
function speak(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang==='ms'?'ms-MY':'en-US';u.rate=.72;u.pitch=1.05;window.speechSynthesis.speak(u)}
function renderHome(){app.innerHTML=`<div class="app"><div class="phone"><header class="top"><div class="logo">REQOO.PLAY</div><button class="lang" id="lang">${lang==='ms'?'BM':'BI'} ▾</button></header><section class="hero"><div class="buddy">🧸</div><h1>${lang==='ms'?'Jom Kenal ABC!':'Let’s Learn ABC!'}</h1><p>${lang==='ms'?'Dengar. Lihat. Sebut bersama.':'Listen. Look. Say it together.'}</p></section><section class="section"><div class="section-title">${lang==='ms'?'Pilih huruf':'Choose a letter'}</div><div class="letters">${letters.map((x,i)=>`<button class="letter" data-i="${i}">${x.l}<small>${lang==='ms'?x.ms:x.en}</small></button>`).join('')}</div></section><footer class="footer">${lang==='ms'?'Belajar perlahan-lahan, ulang sebanyak yang anak suka.':'Learn gently and repeat as often as your child likes.'}</footer></div></div>`;document.getElementById('lang').addEventListener('click',()=>{lang=lang==='ms'?'en':'ms';renderHome()});document.querySelectorAll('.letter').forEach(b=>b.addEventListener('click',()=>showLesson(+b.dataset.i)))}
function showLesson(i){current=letters[i];const word=lang==='ms'?current.ms:current.en;app.innerHTML=`<div class="app"><div class="phone"><section class="lesson show"><button class="back" id="back">← ${lang==='ms'?'Huruf':'Letters'}</button><div class="big-letter">${current.l}</div><button class="object" id="object" aria-label="${word}">${current.emoji}</button><div class="word">${word}</div><div class="subword">${lang==='ms'?'Dengar nama huruf dan perkataan.':'Hear the letter and word.'}</div><div class="actions"><button class="speak" id="speak">🔊 ${lang==='ms'?'Dengar':'Listen'}</button><button class="repeat" id="repeat">🔁 ${lang==='ms'?'Sebut lagi':'Say again'}</button></div><div class="phrase">${lang==='ms'?`${current.l} untuk ${word}.`:`${current.l} is for ${word}.`}</div><div class="hint">${lang==='ms'?'Ibu/ayah boleh sebut dahulu, kemudian ajak anak ikut.':'Parent can say it first, then invite the child to repeat.'}</div></section></div></div>`;document.getElementById('back').addEventListener('click',renderHome);const say=()=>speak(`${current.l}. ${word}.`);document.getElementById('speak').addEventListener('click',say);document.getElementById('repeat').addEventListener('click',say);document.getElementById('object').addEventListener('click',say);setTimeout(say,350)}
renderHome();
