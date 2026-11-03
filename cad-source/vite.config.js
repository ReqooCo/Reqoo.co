import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('.',import.meta.url));
const sources=fs.readdirSync(path.join(root,'src')).filter(n=>/\.(js|css)$/.test(n)).sort();
const sourceHash=createHash('sha256').update(sources.map(n=>n+'\n'+fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n')).update(fs.readFileSync(path.join(root,'package-lock.json'))).digest('hex').slice(0,16);
export default defineConfig({
 base:'/cad/',worker:{format:'es'},define:{__CAD_BUILD__:JSON.stringify(sourceHash)},
 plugins:[{name:'reqoo-cad-version',transformIndexHtml(){return[{tag:'meta',attrs:{name:'reqoo-cad-source',content:sourceHash},injectTo:'head'}];},generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({sourceHash,commit:process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||'local',schema:1})});}}],
 build:{target:'es2022',assetsInlineLimit:0}
});
