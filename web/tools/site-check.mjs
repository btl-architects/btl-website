import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pages,dist} from './pages.mjs';
const errors=[];const inventory=pages();const known=new Map(inventory.map(p=>[p.route,p]));
const sitemap=readFileSync(join(dist,'sitemap-index.xml'),'utf8');
const preview=JSON.parse(readFileSync(join(dist,'build-status.json'),'utf8')).preview;
for(const page of inventory) {
  const fail=message=>errors.push(page.route+': '+message);
  if ((page.html.match(/<h1\b/g)||[]).length!==1) fail('Expected one h1');
  for(const tag of page.html.match(/<img\b[^>]*>/g)||[]) if(!/\balt="[^"]*"/.test(tag)) fail('Missing image alternative');
  if(!/<title>[^<]+<\/title>/.test(page.html))fail('Missing title');
  const canonical=/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(page.html)?.[1];
  if(!canonical || new URL(canonical).pathname!==page.route)fail('Incorrect canonical');
  const noindex=/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(page.html);
  if(preview && !noindex)fail('Preview page is indexable');
  if(!noindex && !sitemap.includes(`<loc>${canonical}</loc>`))fail('Indexable page absent from sitemap');
  if(noindex && canonical && sitemap.includes(`<loc>${canonical}</loc>`))fail('Excluded page in sitemap');
  for(const [,href] of page.html.matchAll(/\bhref="([^"]+)"/g)) {
    if(!href.startsWith('/') && !href.startsWith('#'))continue;
    const url=new URL(href,'https://btldesigns.in'+page.route);
    const target=known.get(url.pathname);
    if(!target && !existsSync(join(dist,decodeURIComponent(url.pathname))))fail('Missing internal target '+href);
    if(target && url.hash) {
      const id=decodeURIComponent(url.hash.slice(1));
      if(!target.html.includes(`id="${id}"`))fail('Missing anchor '+href);
    }
  }
  for(const [,raw] of page.html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {JSON.parse(raw);}catch {fail('Invalid structured data');}
  }
}
if(errors.length)throw new Error(errors.join('\n'));
console.log(`[site] ${inventory.length} pages: headings, metadata, internal links, anchors, JSON-LD, and sitemap valid`);
