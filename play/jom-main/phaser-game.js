const W=1280,H=720;
const cfg={type:Phaser.AUTO,parent:'game',backgroundColor:'#69d4f7',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},render:{antialias:true},scene:{create,update}};
let cat,catTarget,wordText,prompt,shadow,dir=1,playing=false,root;
function sx(s){return s.scale.displayScale.x}function sy(s){return s.scale.displayScale.y}
function create(){const s=this;root=s.add.container(0,0);
 const bg=s.add.rectangle(0,0,W,H,0x69d4f7).setOrigin(0);root.add(bg);
 const sun=s.add.circle(1060,105,58,0xffcf4b);root.add(sun);root.add(s.add.circle(1060,105,78,0xffcf4b,.18));
 cloud(s,190,120,1);cloud(s,940,170,.72);
 root.add(s.add.triangle(190,475,0,270,230,0,460,270,0x79b17b));root.add(s.add.triangle(1030,475,0,260,230,0,460,260,0x6c9f75));
 root.add(s.add.ellipse(W/2,680,1500,310,0x72c85e));root.add(s.add.ellipse(650,600,760,135,0x67c8eb,.92));
 root.add(s.add.text(50,455,'🌳',{fontSize:92}));root.add(s.add.text(1120,450,'🌴',{fontSize:80}));
 root.add(s.add.rectangle(1090,520,170,140,0xf4d59e).setStrokeStyle(6,0xb87549));root.add(s.add.triangle(1090,455,0,110,170,110,85,0,0xd95b49));root.add(s.add.rectangle(1145,590,44,70,0x86553b));root.add(s.add.rectangle(1200,540,44,44,0x71d4ee).setStrokeStyle(5,0xffffff));
 root.add(s.add.text(44,38,'REQOO',{fontFamily:'Arial',fontSize:27,fontStyle:'bold',color:'#ffffff'}));root.add(s.add.text(45,70,'PLAY', {fontFamily:'Arial',fontSize:13,fontStyle:'bold',color:'#ffffff'}));
 root.add(s.add.text(W/2,32,'WORLD 01',{fontFamily:'Arial',fontSize:14,fontStyle:'bold',color:'#fff6cf'}).setOrigin(.5));root.add(s.add.text(W/2,54,'Kucing',{fontFamily:'Arial',fontSize:58,fontStyle:'bold',color:'#ffffff',stroke:'#4e392f',strokeThickness:7}).setOrigin(.5));
 shadow=s.add.ellipse(430,594,220,35,0x284b3538);cat=s.add.text(420,445,'🐱',{fontSize:150}).setOrigin(.5,1).setInteractive({useHandCursor:true});root.add(shadow);root.add(cat);cat.on('pointerdown',()=>jump(s));
 catTarget=s.add.text(785,465,'🦋',{fontSize:70}).setOrigin(.5).setInteractive({useHandCursor:true});root.add(catTarget);catTarget.on('pointerdown',()=>collect(s));
 const panel=s.add.rectangle(W/2,650,410,72,0xfffcf0).setStrokeStyle(4,0xffcf4b);wordText=s.add.text(W/2,639,'KUCING',{fontFamily:'Arial',fontSize:34,fontStyle:'bold',color:'#4b3528'}).setOrigin(.5);root.add(panel);root.add(wordText);root.add(s.add.text(W/2,668,'🔊  Dengar • Lihat • Cuba',{fontFamily:'Arial',fontSize:15,fontStyle:'bold',color:'#7758c9'}).setOrigin(.5));
 prompt=s.add.text(W/2,112,'👆 Sentuh kucing atau rama-rama',{fontFamily:'Arial',fontSize:20,fontStyle:'bold',color:'#49352c',backgroundColor:'#fffdf2',padding:{left:16,right:16,top:8,bottom:8}}).setOrigin(.5);root.add(prompt);root.add(s.add.text(W-45,35,'BM',{fontFamily:'Arial',fontSize:18,fontStyle:'bold',color:'#2e4960',backgroundColor:'#ffd34f',padding:12}).setOrigin(1,0));
 s.scale.on('resize',()=>layout(s));layout(s);speak('Kucing');
}
function layout(s){const w=s.scale.width,h=s.scale.height;const scale=Math.max(w/W,h/H);root.setScale(scale);root.x=(w-W*scale)/2;root.y=(h-H*scale)/2}
function update(t){if(!cat)return;cat.x+=dir*.5; if(cat.x>690){dir=-1;cat.setScale(-1,1)}if(cat.x<350){dir=1;cat.setScale(1,1)}cat.y=445+Math.sin(t/180)*3;shadow.x=cat.x;shadow.scaleX=.85+Math.sin(t/180)*.04;}
function cloud(s,x,y,k){root.add(s.add.ellipse(x,y,130*k,55*k,0xffffff,.9));root.add(s.add.circle(x-35*k,y-18*k,38*k,0xffffff,.9));root.add(s.add.circle(x+30*k,y-25*k,50*k,0xffffff,.9))}
function jump(s){if(playing)return;playing=true;prompt.setText('🦘 Lompat!');s.tweens.add({targets:cat,y:350,scaleX:1.08,scaleY:.94,duration:280,ease:'Sine.easeOut',yoyo:true,onComplete:()=>{playing=false;speak('Lompat!');prompt.setText('👆 Cuba sebut: kucing!')}})}
function collect(s){if(playing)return;playing=true;prompt.setText('🦋 Kucing jumpa!');s.tweens.add({targets:cat,x:690,duration:650,ease:'Sine.easeInOut',onComplete:()=>{jump(s);catTarget.setScale(0);setTimeout(()=>{catTarget.setScale(1);playing=false;prompt.setText('🔊 Kucing! Cuba sebut kucing!');speak('Kucing')},900)}})}
function speak(text){try{const u=new SpeechSynthesisUtterance(text);u.lang='ms-MY';u.rate=.68;u.pitch=1.05;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
new Phaser.Game(cfg);
