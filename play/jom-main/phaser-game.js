const W=1280,H=720;
const cfg={type:Phaser.AUTO,parent:'game',backgroundColor:'#69d4f7',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},render:{antialias:true},scene:{create,update}};
let cat,catTarget,wordText,prompt,shadow,dir=1,playing=false;
function create(){const s=this;
 // sky
 s.add.rectangle(W/2,H/2,W,H,0x69d4f7); s.add.circle(1010,105,55,0xffcf4b); s.add.circle(1010,105,68,0xffcf4b,0.18);
 // soft clouds
 cloud(s,190,120,1);cloud(s,940,190,.75);
 // mountains
 s.add.triangle(180,455,0,250,210,0,420,250,0x79b17b);s.add.triangle(1040,465,0,250,210,0,420,250,0x6c9f75);
 // ground
 s.add.ellipse(W/2,650,1450,300,0x72c85e);s.add.ellipse(650,585,720,120,0x67c8eb,0.9);
 // trees / house
 s.add.text(55,465,'🌳',{fontSize:90});s.add.text(1110,460,'🌴',{fontSize:78});
 s.add.rectangle(1080,515,165,135,0xf4d59e).setStrokeStyle(6,0xb87549);s.add.triangle(1080,450,0,105,165,105,82,0,0xd95b49);s.add.rectangle(1135,585,42,65,0x86553b);s.add.rectangle(1195,535,42,42,0x71d4ee).setStrokeStyle(5,0xffffff);
 // title
 s.add.text(52,42,'REQOO.PLAY',{fontFamily:'Arial',fontSize:28,fontStyle:'bold',color:'#ffffff'});s.add.text(53,77,'JOM MAIN',{fontFamily:'Arial',fontSize:15,fontStyle:'bold',color:'#ffffff'});
 s.add.text(W/2,48,'WORLD 01',{fontFamily:'Arial',fontSize:14,fontStyle:'bold',color:'#fff6cf'}).setOrigin(.5);s.add.text(W/2,70,'Kucing',{fontFamily:'Arial',fontSize:58,fontStyle:'bold',color:'#ffffff',stroke:'#4e392f',strokeThickness:7}).setOrigin(.5);
 // cat as a simple game character for this test
 shadow=s.add.ellipse(430,594,220,35,0x284b3528);cat=s.add.text(420,445,'🐱',{fontSize:150}).setOrigin(.5,1);cat.setInteractive({useHandCursor:true});cat.on('pointerdown',()=>jump(s));
 // target
 catTarget=s.add.text(785,465,'🦋',{fontSize:70}).setOrigin(.5).setInteractive({useHandCursor:true});catTarget.on('pointerdown',()=>collect(s));
 // learning card
 s.add.rectangle(W/2,640,390,66,0xfffcf0).setStrokeStyle(4,0xffcf4b).setDepth(20);wordText=s.add.text(W/2,632,'KUCING',{fontFamily:'Arial',fontSize:31,fontStyle:'bold',color:'#4b3528'}).setOrigin(.5).setDepth(21);s.add.text(W/2,660,'🔊  Dengar • Lihat • Cuba',{fontFamily:'Arial',fontSize:15,fontStyle:'bold',color:'#7758c9'}).setOrigin(.5).setDepth(21);
 prompt=s.add.text(W/2,115,'👆 Sentuh kucing atau rama-rama',{fontFamily:'Arial',fontSize:20,fontStyle:'bold',color:'#49352c',backgroundColor:'#fffdf2',padding:{left:16,right:16,top:8,bottom:8}}).setOrigin(.5).setDepth(30);
 s.add.text(W-55,42,'BM',{fontFamily:'Arial',fontSize:18,fontStyle:'bold',color:'#2e4960',backgroundColor:'#ffd34f',padding:12}).setOrigin(1,0);
 speak('Kucing');
}
function update(t){if(!cat)return;cat.x+=dir*.35;if(cat.x>690){dir=-1;cat.setScale(-1,1)}if(cat.x<350){dir=1;cat.setScale(1,1)}cat.y=445+Math.sin(t/180)*3;shadow.x=cat.x;shadow.scaleX=.85+Math.sin(t/180)*.04;}
function cloud(s,x,y,k){s.add.ellipse(x,y,130*k,55*k,0xffffff,.9);s.add.circle(x-35*k,y-18*k,38*k,0xffffff,.9);s.add.circle(x+30*k,y-25*k,50*k,0xffffff,.9)}
function jump(s){if(playing)return;playing=true;prompt.setText('🦘 Lompat!');s.tweens.add({targets:cat,y:350,scaleX:1.08,scaleY:.94,duration:280,ease:'Sine.easeOut',yoyo:true,onComplete:()=>{playing=false;speak('Lompat!');prompt.setText('👆 Cuba sebut: kucing!')}})}
function collect(s){if(playing)return;playing=true;prompt.setText('🦋 Kucing jumpa!');s.tweens.add({targets:cat,x:690,duration:650,ease:'Sine.easeInOut',onComplete:()=>{jump(s);catTarget.setScale(0);setTimeout(()=>{catTarget.setScale(1);playing=false;prompt.setText('🔊 Kucing! Cuba sebut kucing!');speak('Kucing')},900)}})}
function speak(text){try{const u=new SpeechSynthesisUtterance(text);u.lang='ms-MY';u.rate=.68;u.pitch=1.05;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
new Phaser.Game(cfg);