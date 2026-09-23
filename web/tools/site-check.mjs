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
  /* Where a page starts is decided once, on <main> in base.css. Eight pages
     used to decide it inline and the ninth, the 404, forgot. */
  if(/<main\b[^>]*style="[^"]*padding-top/.test(page.html))fail('<main> sets its own top offset; change --page-gap instead');
  if(/style="[^"]*--header-h/.test(page.html))fail('an inline style offsets from the header; the page offset belongs to <main> in base.css');
  for(const [,raw] of page.html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {JSON.parse(raw);}catch {fail('Invalid structured data');}
  }
}
/* The browser tests are served a copy with these two removed (serve-test.mjs),
   because WebKit applies them to plain-http loopback. Production must keep them,
   so their absence from the deployed build is a build failure, not a test one. */
const headers=readFileSync(join(dist,'_headers'),'utf8');
if(!/^\s*Strict-Transport-Security:\s*max-age=\d+/m.test(headers))errors.push('_headers: Strict-Transport-Security missing from the production build');
if(!/Content-Security-Policy:[^\n]*upgrade-insecure-requests/.test(headers))errors.push('_headers: CSP lost upgrade-insecure-requests in the production build');
if(errors.length)throw new Error(errors.join('\n'));
console.log(`[site] ${inventory.length} pages: headings, metadata, internal links, anchors, JSON-LD, sitemap and transport headers valid`);
