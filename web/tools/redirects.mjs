import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {client,mode} from './env.mjs';
import {resolveRedirects} from '../server/redirects.js';
const dist = fileURLToPath(new URL('../dist/',import.meta.url));
const rows = readFileSync(new URL('../public/_redirects',import.meta.url),'utf8').split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).map(line => {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 3 || !['301','302'].includes(parts[2])) throw new Error(`Invalid static redirect: ${line}`);
  return {from:parts[0],to:parts[1],permanent:parts[2] === '301'};
});
rows.push(...await client.fetch('*[_type == "redirect"]{from,to,permanent}'));
const projects = await client.fetch('*[_type == "project" && lifecycle in $states]{"slug":slug.current,previousSlugs}',{states:mode.preview ? ['draft','published','archived'] : ['published','archived']});
for (const project of projects) {
  rows.push({from:`/projects/${project.slug}.html`,to:`/projects/${project.slug}/`,permanent:true});
  for (const old of project.previousSlugs || []) {
    if (old === project.slug) continue;
    for (const from of [`/projects/${old}/`,`/projects/${old}.html`]) rows.push({from,to:`/projects/${project.slug}/`,permanent:true});
  }
}
const pages = new Set();
function walk(dir,base='') {
  for (const name of readdirSync(dir)) {
    const path = join(dir,name);
    if (statSync(path).isDirectory()) walk(path,`${base}/${name}`);
    else if (name === 'index.html') pages.add(`${base}/`);
    else if (name.endsWith('.html')) pages.add(`${base}/${name}`);
  }
}
walk(dist);
const resolved = resolveRedirects(rows,pages);
writeFileSync(join(dist,'_redirects'),resolved.map(r=>`${r.from}  ${r.to}  ${r.permanent ? 301 : 302}`).join('\n')+'\n');
console.log(`[redirects] ${resolved.length} merged rules validated`);
