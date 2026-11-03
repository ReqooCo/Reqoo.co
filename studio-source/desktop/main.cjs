const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const {spawn}=require('node:child_process');
if (!app.isPackaged && !process.argv.some(a=>a.startsWith('--user-data-dir'))) app.setPath('userData', path.join(__dirname, '..', process.env.REQOO_TEST==='1'?'test-results/profile-'+process.pid:'.dev-profile'));
app.whenReady().then(() => {
  ipcMain.handle('system-arial-bold',async()=>new Uint8Array(await fs.readFile(path.join(process.env.WINDIR || 'C:\\Windows','Fonts','arialbd.ttf'))));
  const fontDirectory=path.join(process.env.WINDIR || 'C:\\Windows','Fonts');
  const fontChoices=[['arialbd.ttf','Arial Bold'],['arial.ttf','Arial'],['segoeuib.ttf','Segoe UI Bold'],['timesbd.ttf','Times New Roman Bold'],['comicbd.ttf','Comic Sans MS Bold'],['impact.ttf','Impact'],['georgiab.ttf','Georgia Bold'],['verdanab.ttf','Verdana Bold'],['courbd.ttf','Courier New Bold'],['tahomabd.ttf','Tahoma Bold'],['trebucbd.ttf','Trebuchet MS Bold'],['brushsci.ttf','Brush Script MT'],['scriptbl.ttf','Script MT Bold'],['frscript.ttf','French Script MT'],['harlowsi.ttf','Harlow Solid Italic'],['magnetob.ttf','Magneto Bold'],['forte.ttf','Forte'],['bauhs93.ttf','Bauhaus 93'],['broadw.ttf','Broadway'],['alger.ttf','Algerian'],['jokerman.ttf','Jokerman'],['chiller.ttf','Chiller'],['curlz___.ttf','Curlz MT'],['ravie.ttf','Ravie'],['showg.ttf','Showcard Gothic'],['snap____.ttf','Snap ITC'],['stencil.ttf','Stencil'],['oldengl.ttf','Old English Text MT']];
  const {createFontCatalog}=require('./font-catalog.cjs');
  const catalog=createFontCatalog([{path:fontDirectory,prefix:'',origin:'Windows'},{path:path.join(process.env.LOCALAPPDATA||'','Microsoft','Windows','Fonts'),prefix:'user:',origin:'User'},{path:path.join(__dirname,'fonts'),prefix:'bundled:',origin:'Reqoo bundled'}],fontChoices);
  ipcMain.handle('font-list',()=>catalog.list());
  ipcMain.handle('load-font',(_event,id)=>catalog.load(id));
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  const win = new BrowserWindow({width:1560,height:980,minWidth:1100,minHeight:720,backgroundColor:'#121b2b',autoHideMenuBar:true,title:'Reqoo 3D Studio',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.cjs')}});
  require('./update-service.cjs').installUpdates({ipcMain,win,app,dialog,shell:require('electron').shell});
  const {recoveryStore,backupMigration,atomicWrite}=require('./recovery.cjs');const recovery=recoveryStore(path.join(app.getPath('userData'),'recovery'));
  ipcMain.handle('recovery-save',(event,text)=>{if(event.sender!==win.webContents)throw Error('Permintaan tidak sah');return recovery.save(text)});
  ipcMain.handle('migration-backup',(event,text)=>{if(event.sender!==win.webContents)throw Error('Permintaan tidak sah');return backupMigration(path.join(app.getPath('userData'),'project-backups'),text)});
  ipcMain.handle('recovery-latest',(event,skip)=>{if(event.sender!==win.webContents)throw Error('Permintaan tidak sah');return recovery.latest(skip)});
  ipcMain.handle('open-bambu',async(event,bytes,format='3mf')=>{
    if(!['3mf','obj'].includes(format)||event.sender!==win.webContents||!(bytes instanceof Uint8Array)||bytes.byteLength>250*1024*1024)throw Error('Data 3MF tidak sah');
    const candidates=[path.join(process.env.ProgramFiles||'C:\\Program Files','Bambu Studio','bambu-studio.exe'),path.join(process.env.LOCALAPPDATA||'','Programs','Bambu Studio','bambu-studio.exe')];let program;
    for(const candidate of candidates){try{await fs.access(candidate);program=candidate;break}catch{}}
    if(!program)throw Error('Bambu Studio tidak ditemui. Pasang Bambu Studio atau eksport 3MF dan buka secara manual.');
    const folder=process.env.REQOO_TEST==='1'&&process.env.REQOO_TEST_DIR?process.env.REQOO_TEST_DIR:path.join(app.getPath('userData'),'Bambu Export');await fs.mkdir(folder,{recursive:true});
    const file=path.join(folder,'reqoo-bambu-'+Date.now()+'.'+format);await fs.writeFile(file,bytes);
    if(process.env.REQOO_TEST!=='1')await new Promise((resolve,reject)=>{const child=spawn(program,[file],{detached:true,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve()})});
    return {path:file,program};
  });
  ipcMain.handle('save-design', async (event, {name,bytes}) => {
    if(event.sender !== win.webContents || !/^reqoo-[a-z0-9-]+\.(json|stl|3mf|svg|zip|csv|gcode)$/.test(name) || !(bytes instanceof Uint8Array) || bytes.byteLength>250*1024*1024) throw Error('Data eksport tidak sah');
    const destination=process.env.REQOO_TEST==='1' && process.env.REQOO_TEST_DIR ? path.join(process.env.REQOO_TEST_DIR,name) : (await dialog.showSaveDialog(win,{defaultPath:name,filters:[{name:name.endsWith('.svg')?'SVG vector':name.endsWith('.stl')?'STL model':name.endsWith('.3mf')?'3MF warna':'Reqoo project',extensions:[name.split('.').pop()]}]})).filePath;
    if(!destination)return false;
    await atomicWrite(destination,bytes);return true;
  });
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.loadFile(path.join(__dirname,'../dist/index.html'), process.env.REQOO_TEST === '1' ? {query:{test:'1'}} : {});
});
app.on('window-all-closed', () => app.quit());
