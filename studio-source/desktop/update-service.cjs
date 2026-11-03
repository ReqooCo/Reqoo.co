const {verifyManifest,verifyArtifact}=require('./update-security.cjs');
const {keys,endpoint}=require('./update-trust.cjs');
const {atomicWrite}=require('./recovery.cjs');
const path=require('node:path'),fs=require('node:fs/promises');
function installUpdates({ipcMain,win,app,dialog,shell}){let accepted=null,verified=null;const stateFile=path.join(app.getPath('userData'),'update-state.json');async function highest(){try{return JSON.parse(await fs.readFile(stateFile,'utf8')).highestVersion||app.getVersion()}catch{return app.getVersion()}}
 async function accept(text){accepted=null;verified=null;const result=verifyManifest(text,{keys,currentVersion:app.getVersion(),highestVersion:await highest()});await atomicWrite(stateFile,JSON.stringify({highestVersion:result.manifest.version}));accepted=result;verified=null;return{installed:app.getVersion(),...result}}
 function guard(event){if(event.sender!==win.webContents)throw Error('Permintaan tidak sah.');}
 ipcMain.handle('updates-state',event=>{guard(event);return{installed:app.getVersion(),configured:!!endpoint,keys:Object.keys(keys),mode:'manual installer handoff'}});
 ipcMain.handle('updates-import',async(event,text)=>{guard(event);return accept(text)});
 ipcMain.handle('updates-check',async event=>{guard(event);if(!endpoint)throw Error('Perkhidmatan update belum diterbitkan. Import metadata bertandatangan untuk semakan offline.');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(endpoint,{signal:controller.signal,redirect:'error'});if(!response.ok)throw Error('Perkhidmatan update tidak tersedia.');const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.byteLength;if(total>128*1024)throw Error('Metadata terlalu besar.');chunks.push(Buffer.from(chunk))}return await accept(Buffer.concat(chunks).toString('utf8'))}finally{clearTimeout(timer)}});
 ipcMain.handle('updates-verify',async event=>{guard(event);if(!accepted)throw Error('Semak metadata dahulu.');const result=await dialog.showOpenDialog(win,{title:'Pilih installer yang dimuat turun secara manual',properties:['openFile'],filters:[{name:'Windows installer',extensions:['exe']}]});if(result.canceled)return{cancelled:true};const file=result.filePaths[0];await verifyArtifact(file,accepted.manifest);verified=file;return{verified:true,name:path.basename(file),version:accepted.manifest.version}});
 ipcMain.handle('updates-reveal',event=>{guard(event);if(!verified)throw Error('Installer belum disahkan.');shell.showItemInFolder(verified);return true});
}
module.exports={installUpdates};
