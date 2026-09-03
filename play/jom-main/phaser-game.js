const W=1280,H=720;
const cfg={type:Phaser.WEBGL,parent:'game',backgroundColor:'#65cdf4',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},render:{antialias:true,powerPreference:'high-performance'},plugins:{scene:[{key:'spine.SpinePlugin',plugin:spine.SpinePlugin,mapping:'spine'}]},scene:{preload,create,update}};
let cat,shadow,butterfly,prompt,word,dir=1,locked=false,world,worldFar,worldNear;
function preload(){this.load.svg('world-01','./assets/world-01.svg?v=1',{width:W,height:H});this.load.svg('reqoo-cat','./assets/reqoo-cat.svg?v=2',{width:360,height:430});}
function create(){const s=this;
 world=s.add.image(0,0,'world-01').setOrigin(0).setDisplaySize(s.scale.width,s.scale.height);world.setDepth(0);
 // 2.5D foreground depth layer
 worldFar=s.add.rectangle(s.scale.width*.52,s.scale.height*.72,s.scale.width*.9,80,0x6abf61,.22).setDepth(1);
 s.add.text(s.scale.width*.055,s.scale.height*.045,'REQOO.PLAY',{fontFamily:'Arial',fontSize:26,fontStyle:'bold',color:'#ffffff',stroke:'#3d704f',strokeThickness:3}).setDepth(10);
 s.add.text(s.scale.width*.5,s.scale.height*.055,'WORLD 01',{fontFamily:'Arial',fontSize:13,fontStyle:'bold',color:'#fff8d8'}).setOrigin(.5).setDepth(10);
 // clean learning HUD
 const bubble=s.add.roundedRectangle? s.add.roundedRectangle(s.scale.width*.5,s.scale.height*.16,380,86,28,0xfffdf4,1):s.add.rectangle(s.scale.width*.5,s.scale.height*.16,380,86,0xfffdf4,1);
 bubble.setStrokeStyle(4,0xf0c84b).setDepth(10);
 s.add.text(s.scale.width*.5,s.scale.height*.145,'Kucing',{fontFamily:'Arial',fontSize:48,fontStyle:'bold',color:'#4a3429'}).setOrigin(.5).setDepth(11);
 s.add.text(s.scale.width*.5,s.scale.height*.195,'🔊  Tekan untuk dengar',{fontFamily:'Arial',fontSize:16,fontStyle:'bold',color:'#5b6e87'}).setOrigin(.5).setDepth(11).setInteractive({useHandCursor:true}).on('pointerdown',()=>speak('Kucing'));
 shadow=s.add.ellipse(s.scale.width*.34,s.scale.height*.79,220,38,0x254833,.20).setDepth(4);
 cat=s.add.image(s.scale.width*.34,s.scale.height*.66,'reqoo-cat').setOrigin(.5,1).setScale(.70).setDepth(6);cat.setInteractive({useHandCursor:true});cat.on('pointerdown',()=>jump(s));
 butterfly=s.add.text(s.scale.width*.62,s.scale.height*.60,'🦋',{fontSize:70}).setOrigin(.5).setDepth(7).setInteractive({useHandCursor:true});butterfly.on('pointerdown',()=>chase(s));
 word=s.add.text(s.scale.width*.5,s.scale.height*.86,'Sentuh untuk bermain',{fontFamily:'Arial',fontSize:24,fontStyle:'bold',color:'#5a3d2b',backgroundColor:'#fff7d7',padding:{left:26,right:26,top:12,bottom:12}}).setOrigin(.5).setDepth(10);
 prompt=s.add.text(s.scale.width*.5,s.scale.height*.28,'👆 Sentuh kucing atau rama-rama',{fontFamily:'Arial',fontSize:19,fontStyle:'bold',color:'#4b382e',backgroundColor:'#fffdf2',padding:{left:16,right:16,top:8,bottom:8}}).setOrigin(.5).setDepth(10);
 const home=s.add.circle(58,58,28,0xffd34f).setDepth(12).setInteractive({useHandCursor:true});s.add.text(58,58,'⌂',{fontSize:30,color:'#fff'}).setOrigin(.5).setDepth(13);
 const sound=s.add.circle(s.scale.width-58,58,28,0x4f9fe8).setDepth(12).setInteractive({useHandCursor:true});s.add.text(s.scale.width-58,58,'🔊',{fontSize:22}).setOrigin(.5).setDepth(13);sound.on('pointerdown',()=>speak('Kucing'));
 speak('Kucing');
 s.scale.on('resize',(size)=>resize(s,size));
}
function resize(s,size){const sx=size.width/W,sy=size.height/H,k=Math.min(sx,sy);world.setDisplaySize(size.width,size.height);if(cat){cat.setPosition(size.width*.34,size.height*.66);shadow.setPosition(size.width*.34,size.height*.79)}if(butterfly)butterfly.setPosition(size.width*.62,size.height*.60);}
function update(t){if(!cat||locked)return;cat.x+=dir*.42;cat.setScale(dir>0?.70:-.70,.70);cat.y=H*.66+Math.sin(t/115)*4;cat.angle=Math.sin(t/100)*1.4;shadow.x=cat.x;shadow.scaleX=.86+Math.sin(t/160)*.04;butterfly.x=W*.62+Math.cos(t/520)*110;butterfly.y=H*.60+Math.sin(t/360)*24;if(cat.x>W*.55)dir=-1;if(cat.x<W*.19)dir=1;}
function jump(s){if(locked)return;locked=true;prompt.setText('🦘 Lompat!');s.tweens.add({targets:cat,y:H*.43,scaleX:dir>0?.80:-.80,scaleY:.58,angle:dir*7,duration:300,ease:'Sine.easeOut',yoyo:true,onComplete:()=>{cat.setScale(dir>0?.70:-.70,.70);cat.angle=0;locked=false;prompt.setText('🔊 Cuba sebut: kucing!');speak('Lompat!')}})}
function chase(s){if(locked)return;locked=true;prompt.setText('🐾 Kejar rama-rama!');const targetX=butterfly.x-50;const targetY=H*.64;s.tweens.add({targets:cat,x:targetX,y:targetY,duration:900,ease:'Sine.easeInOut',onUpdate:()=>cat.setScale(cat.x<targetX?.76:-.76,.70),onComplete:()=>{jump(s);s.time.delayedCall(1000,()=>{locked=false;prompt.setText('🔊 Kucing! Cuba sebut kucing!');speak('Kucing')})}})}
function speak(text){try{const u=new SpeechSynthesisUtterance(text);u.lang='ms-MY';u.rate=.68;u.pitch=1.05;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
new Phaser.Game(cfg);