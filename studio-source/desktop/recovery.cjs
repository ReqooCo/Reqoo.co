const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {parseProject}=require('./project-validation.cjs');
const valid=text=>parseProject(text);
async function atomicWrite(destination,data){const temporary=destination+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';let file;try{file=await fs.open(temporary,'wx');await file.writeFile(data);await file.sync();await file.close();file=null;await fs.rename(temporary,destination)}catch(e){await file?.close().catch(()=>{});await fs.unlink(temporary).catch(()=>{});throw e}}
async function backupMigration(directory,text){const doc=valid(text);if(doc.version>=4)throw Error('Sandaran migrasi hanya untuk projek lama.');await fs.mkdir(directory,{recursive:true});const name='migration-v'+doc.version+'-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.json';await atomicWrite(path.join(directory,name),text);return {name,sha256:crypto.createHash('sha256').update(text).digest('hex')}}
function recoveryStore(directory){let queue=Promise.resolve();
 const files=async()=>{try{return(await fs.readdir(directory)).filter(n=>/^revision-\d+-[a-f0-9]+\.json$/.test(n)).sort().reverse()}catch(e){if(e.code==='ENOENT')return[];throw e}};
 return {
  save(text){valid(text);const task=async()=>{await fs.mkdir(directory,{recursive:true});const existing=await files(),previous=Number(existing[0]?.split('-')[1]||0),timestamp=Math.max(Date.now(),Number.isSafeInteger(previous)?previous+1:0);const name='revision-'+timestamp+'-'+crypto.randomBytes(4).toString('hex')+'.json';await atomicWrite(path.join(directory,name),text);const list=await files();for(const stale of list.slice(5))await fs.unlink(path.join(directory,stale));return {name,count:Math.min(5,list.length)}};const pending=queue.then(task);queue=pending.catch(()=>{});return pending},
  async latest(skip=[]){if(!Array.isArray(skip)||skip.length>5||skip.some(s=>typeof s!=='string'||!/^revision-\d+-[a-f0-9]+\.json$/.test(s)))throw Error('Senarai pemulihan tidak sah.');await queue;for(const name of await files()){if(skip.includes(name))continue;try{const text=await fs.readFile(path.join(directory,name),'utf8');return {name,document:valid(text)}}catch{}}return null},
  async list(){return files()}
 }
}
module.exports={recoveryStore,validateRecovery:valid,atomicWrite,backupMigration};
