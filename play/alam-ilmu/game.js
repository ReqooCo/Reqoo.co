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

let levelIndex = 0;
let score = 0;
let stars = 0;
let answered = false;

const COLORS = { bg: 0x08111f, panel: 0x111d30, gold: 0xd9b45f, text: '#ffffff', muted: '#9ba8ba', green: 0x5dd39e, red: 0xff6b6b };

class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  create(){ this.scene.start('WorldMap'); }
}

class WorldMapScene extends Phaser.Scene {
  constructor(){ super('WorldMap'); }
  create(){
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const w = this.scale.width;
    this.add.text(w/2, 58, 'REQOO PLAY', {fontSize:'18px',fontStyle:'bold',color:COLORS.text,letterSpacing:3}).setOrigin(.5);
    this.add.text(w/2, 100, WORLD.title, {fontSize:'30px',fontStyle:'bold',color:'#f4f7fb'}).setOrigin(.5);
    this.add.text(w/2, 137, 'Pilih laluan pengembaraan', {fontSize:'15px',color:COLORS.muted}).setOrigin(.5);

    const startX = Math.max(70, w/2 - 250), gap = Math.min(125, (w-120)/4);
    WORLD.levels.forEach((level, i) => {
      const x = startX + i*gap, y = 300 + Math.sin(i*.9)*55;
      if(i < WORLD.levels.length-1) this.add.line(0,0,x,y,x+gap,y+Math.sin((i+1)*.9)*55,0x34445b,1.5).setOrigin(0);
      const unlocked = i === 0 || i <= levelIndex;
      const c = this.add.circle(x,y,34,unlocked?COLORS.gold:0x273247,1);
      this.add.text(x,y,unlocked?String(level.id):'🔒',{fontSize:unlocked?'22px':'18px',fontStyle:'bold',color:unlocked?'#101010':'#778399'}).setOrigin(.5);
      this.add.text(x,y+54,level.name,{fontSize:'12px',fontStyle:'bold',color:unlocked?'#e8edf5':'#68758a',align:'center',wordWrap:{width:105}}).setOrigin(.5);
      if(unlocked) c.setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('Level', {index:i}));
    });

    this.add.text(28, 28, `⭐ ${stars}   XP ${score}`, {fontSize:'14px',fontStyle:'bold',color:'#f4d27c'});
    this.add.text(w/2, this.scale.height-38, 'Prototype v0.1 • Dunia 1', {fontSize:'12px',color:'#66758a'}).setOrigin(.5);
  }
}

class LevelScene extends Phaser.Scene {
  constructor(){ super('Level'); }
  create(data){
    levelIndex = data.index ?? 0;
    const q = WORLD.levels[levelIndex];
    answered = false;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const w = this.scale.width, h = this.scale.height;
    this.add.text(26,22,`⭐ ${stars}`,{fontSize:'15px',fontStyle:'bold',color:'#f4d27c'});
    this.add.text(w-26,22,`XP ${score}`,{fontSize:'15px',fontStyle:'bold',color:'#9ba8ba'}).setOrigin(1,0);
    this.add.text(w/2,72,`LEVEL ${q.id}`,{fontSize:'12px',fontStyle:'bold',color:'#d9b45f',letterSpacing:3}).setOrigin(.5);
    this.add.text(w/2,103,q.name,{fontSize:'30px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    this.add.text(w/2,141,q.topic,{fontSize:'14px',color:'#9ba8ba'}).setOrigin(.5);

    const card = this.add.rectangle(w/2,230,Math.min(760,w-36),130,COLORS.panel,1).setStrokeStyle(1,0x27354a);
    this.add.text(w/2,230,q.question,{fontSize:'20px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:Math.min(660,w-70)}}).setOrigin(.5);

    const btnW = Math.min(680,w-50), btnH = 54, gap = 12, total = q.options.length*btnH+(q.options.length-1)*gap;
    q.options.forEach((option,i)=>{
      const y = 330 + i*(btnH+gap);
      const b = this.add.rectangle(w/2,y,btnW,btnH,0x162338,1).setStrokeStyle(1,0x2e3d54).setInteractive({useHandCursor:true});
      this.add.text(w/2,y,option,{fontSize:'17px',fontStyle:'bold',color:'#eaf0f7'}).setOrigin(.5);
      b.on('pointerup',()=>this.answer(i));
    });
    this.add.text(w/2,h-24,'Pilih jawapan terbaik', {fontSize:'12px',color:'#66758a'}).setOrigin(.5);
  }
  answer(choice){
    if(answered) return; answered=true;
    const q=WORLD.levels[levelIndex], correct=choice===q.answer;
    if(correct){score+=100;stars+=1;this.showFeedback(true,'Hebat! Jawapan betul. ⭐');}
    else {this.showFeedback(false,`Belum tepat. Jawapan: ${q.options[q.answer]}`);}
  }
  showFeedback(correct,msg){
    const w=this.scale.width,h=this.scale.height;
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x000000,.62);
    this.add.text(w/2,h/2-55,correct?'✓':'!',{fontSize:'58px',fontStyle:'bold',color:correct?'#5dd39e':'#ff6b6b'}).setOrigin(.5);
    this.add.text(w/2,h/2+8,msg,{fontSize:'20px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-70}}).setOrigin(.5);
    const next=this.add.rectangle(w/2,h/2+82,220,48,COLORS.gold,1).setInteractive({useHandCursor:true});
    this.add.text(w/2,h/2+82,levelIndex===WORLD.levels.length-1?'Lihat keputusan':'Teruskan',{fontSize:'15px',fontStyle:'bold',color:'#111'}).setOrigin(.5);
    next.on('pointerup',()=>this.scene.start('Result',{correct}));
  }
}

class ResultScene extends Phaser.Scene {
  create(){
    const w=this.scale.width,h=this.scale.height;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(w/2,110,'LEVEL SELESAI',{fontSize:'14px',fontStyle:'bold',color:'#d9b45f',letterSpacing:3}).setOrigin(.5);
    this.add.text(w/2,155,'⭐'.repeat(Math.min(stars,5)),{fontSize:'34px'}).setOrigin(.5);
    this.add.text(w/2,220,`${score} XP`,{fontSize:'40px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    this.add.text(w/2,262,'Progress kamu telah disimpan untuk prototype ini.',{fontSize:'14px',color:'#9ba8ba'}).setOrigin(.5);
    const b=this.add.rectangle(w/2,350,240,52,COLORS.gold,1).setInteractive({useHandCursor:true});
    this.add.text(w/2,350,'Kembali ke Dunia',{fontSize:'15px',fontStyle:'bold',color:'#111'}).setOrigin(.5);
    b.on('pointerup',()=>this.scene.start('WorldMap'));
  }
}

const config={type:Phaser.AUTO,parent:'game',backgroundColor:'#08111f',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:960,height:640},scene:[BootScene,WorldMapScene,LevelScene,ResultScene],render:{antialias:true,roundPixels:true}};
new Phaser.Game(config);
