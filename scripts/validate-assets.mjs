import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.gif','.svg']);
const failures = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (IMAGE_EXTS.has(extname(name).toLowerCase())) check(p);
  }
}

function check(path) {
  const ext = extname(path).toLowerCase();
  const b = readFileSync(path);
  const text = b.toString('utf8');
  const bad = text.includes('<binary>') || /PASTE_IMAGE[_-]\d+/i.test(text);
  if (bad) failures.push(`${path}: placeholder/corrupt marker detected`);
  if (['.jpg','.jpeg'].includes(ext) && !(b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) failures.push(`${path}: invalid JPEG signature`);
  if (ext === '.png' && !(b[0] === 0x89 && b.toString('ascii',1,4) === 'PNG')) failures.push(`${path}: invalid PNG signature`);
  if (ext === '.webp' && !(b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP')) failures.push(`${path}: invalid WebP signature`);
  if (ext === '.gif' && !(['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)))) failures.push(`${path}: invalid GIF signature`);
  if (ext === '.svg' && !/^\s*<svg[\s>]/i.test(text)) failures.push(`${path}: invalid SVG root`);
}

walk(ROOT);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Asset validation passed.');
