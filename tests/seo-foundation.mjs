import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const paths=['index.html','shop/index.html','plaque/index.html','tumbler/index.html'];
const expected=['https://reqoo.co/','https://reqoo.co/shop/','https://reqoo.co/plaque/','https://reqoo.co/tumbler/'];
for(let i=0;i<paths.length;i++){
 const html=fs.readFileSync(new URL(paths[i],root),'utf8');
 assert.match(html,/<title>[^<]+<\/title>/);
 assert.match(html,/<meta name="description" content="[^"]+">/);
 assert.ok(html.includes('<link rel="canonical" href="'+expected[i]+'">'));
 assert.ok(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'));
}
const sitemap=fs.readFileSync(new URL('sitemap.xml',root),'utf8');
for(const url of expected)assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
console.log('PASS: static SEO metadata and sitemap consistency');
